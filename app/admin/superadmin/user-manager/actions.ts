"use server";

import { revalidatePath } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

async function requireSuperAdmin() {
  const supabase = await createClient();

  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  const currentUserId = claims?.claims?.sub as string | undefined;

  if (claimsError || !currentUserId) {
    throw new Error("Sesi login tidak valid.");
  }

  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aal?.currentLevel !== "aal2") {
    throw new Error("MFA Super Admin belum terverifikasi.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("admin_users")
    .select("user_id,role")
    .eq("user_id", currentUserId)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "superadmin") {
    throw new Error("Akses Super Admin ditolak.");
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

async function protectSuperadmin(
  admin: Awaited<ReturnType<typeof requireSuperAdmin>>["admin"],
  currentUserId: string,
  targetUserId: string
) {
  if (!targetUserId) throw new Error("User tidak valid.");

  if (targetUserId === currentUserId) {
    throw new Error("Akun Superadmin sendiri dilindungi.");
  }

  const { data: target, error } = await admin
    .from("admin_users")
    .select("user_id,role")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (error) throw new Error(`Gagal memeriksa akun: ${error.message}`);

  if (target?.role === "superadmin") {
    throw new Error("Akun Superadmin dilindungi.");
  }
}

export async function deactivateUser(targetUserId: string) {
  const { admin, currentUserId } = await requireSuperAdmin();
  await protectSuperadmin(admin, currentUserId, targetUserId);

  const { data: authData, error: lookupError } =
    await admin.auth.admin.getUserById(targetUserId);

  if (lookupError || !authData?.user) {
    throw new Error("Akun user tidak ditemukan.");
  }

  // Blokir login di Supabase Auth untuk Pembaca, Penulis, dan Admin.
  // Role admin_users tidak dihapus supaya jenis akun tetap tercatat.
  const { error: banError } = await admin.auth.admin.updateUserById(
    targetUserId,
    { ban_duration: "876000h" }
  );

  if (banError) {
    throw new Error(`Gagal menonaktifkan akun: ${banError.message}`);
  }

  // Sinkronkan status bila akun memiliki profil Reader.
  const { error: readerError } = await admin
    .from("reader_users")
    .update({ is_active: false, status: "blocked" })
    .eq("user_id", targetUserId);

  if (readerError) {
    throw new Error(
      `Auth sudah dinonaktifkan, tetapi status Reader gagal diperbarui: ${readerError.message}`
    );
  }

  // Putuskan akses Reader yang sedang aktif.
  const { error: sessionError } = await admin
    .from("reader_active_sessions")
    .delete()
    .eq("user_id", targetUserId);

  if (sessionError) {
    throw new Error(
      `Akun sudah nonaktif, tetapi sesi Reader gagal dibersihkan: ${sessionError.message}`
    );
  }

  revalidatePath("/admin/superadmin/user-manager");
  revalidatePath("/admin/superadmin");
  revalidatePath("/admin");
  revalidatePath("/writer");
  revalidatePath("/reader-login");

  return { success: true };
}

export async function deleteUserPermanently(targetUserId: string) {
  const { admin, currentUserId } = await requireSuperAdmin();
  await protectSuperadmin(admin, currentUserId, targetUserId);

  const { data: authData, error: lookupError } =
    await admin.auth.admin.getUserById(targetUserId);

  if (lookupError || !authData?.user) {
    throw new Error("Akun user tidak ditemukan.");
  }

  // Server tetap memaksa urutan: harus Nonaktif lebih dulu.
  const bannedUntil = authData.user.banned_until
    ? new Date(authData.user.banned_until).getTime()
    : 0;

  if (!bannedUntil || bannedUntil <= Date.now()) {
    throw new Error(
      "User masih Aktif. Nonaktifkan terlebih dahulu sebelum Hapus Permanen."
    );
  }

  // Tulisan tidak dihapus; hanya referensi akun lama dilepas.
  for (const column of ["author_id", "updated_by", "last_published_by"]) {
    const { error } = await admin
      .from("content_folder_entries")
      .update({ [column]: null })
      .eq(column, targetUserId);

    if (error) {
      throw new Error(
        `Gagal mempertahankan tulisan user (${column}): ${error.message}`
      );
    }
  }

  // Bersihkan data Reader yang memang terkait akun.
  for (const table of [
    "reader_active_sessions",
    "reader_email_otps",
    "reader_login_history",
  ]) {
    const { error } = await admin
      .from(table)
      .delete()
      .eq("user_id", targetUserId);

    if (error) {
      throw new Error(`Gagal membersihkan ${table}: ${error.message}`);
    }
  }

  const { error: readerError } = await admin
    .from("reader_users")
    .delete()
    .eq("user_id", targetUserId);

  if (readerError) {
    throw new Error(`Gagal menghapus profil Pembaca: ${readerError.message}`);
  }

  const { error: applicationError } = await admin
    .from("writer_applications")
    .delete()
    .eq("user_id", targetUserId);

  if (applicationError) {
    throw new Error(
      `Gagal menghapus data permohonan Penulis: ${applicationError.message}`
    );
  }

  const { error: staffError } = await admin
    .from("admin_users")
    .delete()
    .eq("user_id", targetUserId);

  if (staffError) {
    throw new Error(
      `Gagal menghapus akses Admin/Penulis: ${staffError.message}`
    );
  }

  const { error: deleteError } =
    await admin.auth.admin.deleteUser(targetUserId);

  if (deleteError) {
    throw new Error(`Gagal menghapus akun Auth: ${deleteError.message}`);
  }

  revalidatePath("/admin/superadmin/user-manager");
  revalidatePath("/admin/superadmin");
  revalidatePath("/admin");
  revalidatePath("/writer");
  revalidatePath("/reader-login");

  return { success: true };
}