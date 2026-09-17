"use server";

import { revalidatePath } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type ManagedRole = "reader" | "writer" | "admin";

async function requireSecureSuperadmin() {
  const supabase = await createClient();

  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  const currentUserId = claims?.claims?.sub as string | undefined;

  if (claimsError || !currentUserId) {
    throw new Error("Sesi login tidak valid.");
  }

  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aal?.currentLevel !== "aal2") {
    throw new Error("Verifikasi MFA Superadmin diperlukan.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("admin_users")
    .select("user_id,role")
    .eq("user_id", currentUserId)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "superadmin") {
    throw new Error("Akses hanya untuk Superadmin.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Konfigurasi server Supabase belum lengkap.");
  }

  const admin = createAdminClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return { admin, currentUserId };
}

function cleanName(value: unknown, fallback: string) {
  const name = String(value ?? "").trim();
  return name || fallback;
}

export async function changeManagedUserRole(
  targetUserId: string,
  newRole: ManagedRole
) {
  if (!targetUserId?.trim()) throw new Error("User tidak valid.");
  if (!["reader", "writer", "admin"].includes(newRole)) {
    throw new Error("Role tujuan tidak valid.");
  }

  const { admin, currentUserId } = await requireSecureSuperadmin();

  if (targetUserId === currentUserId) {
    throw new Error("Superadmin tidak dapat mengubah role akun sendiri.");
  }

  const { data: staff, error: staffError } = await admin
    .from("admin_users")
    .select("user_id,role,display_name")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (staffError) throw staffError;
  if (staff?.role === "superadmin") {
    throw new Error("Role Superadmin tidak dapat diubah.");
  }

  const { data: reader, error: readerError } = await admin
    .from("reader_users")
    .select("user_id,email,full_name,is_active,status")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (readerError) throw readerError;

  const { data: authData, error: authError } =
    await admin.auth.admin.getUserById(targetUserId);

  if (authError || !authData.user) {
    throw new Error(authError?.message || "Akun Auth user tidak ditemukan.");
  }

  const email = (authData.user.email || reader?.email || "").trim().toLowerCase();
  if (!email) throw new Error("Email user tidak ditemukan.");

  const displayName = cleanName(
    staff?.display_name ||
      reader?.full_name ||
      authData.user.user_metadata?.display_name ||
      authData.user.user_metadata?.full_name,
    email.split("@")[0]
  );

  if (newRole === "reader") {
    // Reader dibuat/diaktifkan dulu. Staff baru dilepas setelah berhasil.
    if (reader) {
      const { error } = await admin
        .from("reader_users")
        .update({
          email,
          full_name: displayName,
            status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", targetUserId);
      if (error) throw error;
    } else {
      const { error } = await admin.from("reader_users").insert({
        user_id: targetUserId,
        email,
        full_name: displayName,
        status: "active",
      });
      if (error) throw error;
    }

    if (staff) {
      const { error } = await admin
        .from("admin_users")
        .delete()
        .eq("user_id", targetUserId);
      if (error) throw error;
    }
  } else {
    // Staff dibuat/diubah dulu. Reader dinonaktifkan setelah berhasil.
    if (staff) {
      const { error } = await admin
        .from("admin_users")
        .update({
          role: newRole,
          display_name: displayName,
        })
        .eq("user_id", targetUserId);
      if (error) throw error;
    } else {
      const { error } = await admin.from("admin_users").insert({
        user_id: targetUserId,
        email,
        display_name: displayName,
        role: newRole,
      });
      if (error) throw error;
    }

    if (reader) {
      const { error } = await admin
        .from("reader_users")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", targetUserId);
      if (error) throw error;
    }
  }

  // Metadata hanya penanda tambahan; otorisasi tetap berdasarkan tabel server.
  const existingMetadata = authData.user.user_metadata || {};
  const { error: metadataError } = await admin.auth.admin.updateUserById(
    targetUserId,
    {
      user_metadata: {
        ...existingMetadata,
        role: newRole,
        account_type: newRole,
        display_name: displayName,
      },
    }
  );

  if (metadataError) throw metadataError;

  revalidatePath("/admin/superadmin/role-manager");
  revalidatePath("/admin/superadmin");
  revalidatePath("/admin");
  revalidatePath("/writer");
  revalidatePath("/welcome");

  return { ok: true, role: newRole, displayName };
}
