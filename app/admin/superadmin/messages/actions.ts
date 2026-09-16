"use server";

import { revalidatePath } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

async function requireSuperadmin() {
  const supabase = await createClient();

  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claims?.claims?.sub) throw new Error("Tidak memiliki akses.");

  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2") throw new Error("MFA Superadmin diperlukan.");

  const userId = claims.claims.sub as string;
  const { data: profile } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profile || profile.role !== "superadmin") {
    throw new Error("Akses hanya untuk Superadmin.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Konfigurasi server Supabase belum lengkap.");

  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function setContactMessageRead(id: string, isRead: boolean) {
  try {
    if (!id) return { ok: false, error: "ID pesan tidak valid." };
    const admin = await requireSuperadmin();
    const { error } = await admin.from("contact_messages")
      .update({ is_read: isRead }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/superadmin/messages");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Akses ditolak." };
  }
}

export async function deleteContactMessage(id: string) {
  try {
    if (!id) return { ok: false, error: "ID pesan tidak valid." };
    const admin = await requireSuperadmin();
    const { error } = await admin.from("contact_messages").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/superadmin/messages");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Akses ditolak." };
  }
}
