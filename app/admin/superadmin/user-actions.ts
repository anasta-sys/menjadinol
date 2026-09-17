"use server";

import { revalidatePath } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Konfigurasi server Supabase belum lengkap.");
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}


async function getCurrentUserId() {
  await requireSuperAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  const userId = data?.claims?.sub as string | undefined;

  if (error || !userId) {
    throw new Error("Sesi Superadmin tidak ditemukan.");
  }

  return userId;
}

async function protectSuperadmin(admin: ReturnType<typeof getAdminClient>, currentUserId: string, targetUserId: string) {
  if (!targetUserId?.trim()) throw new Error("User tidak valid.");
  if (targetUserId === currentUserId) throw new Error("Akun Superadmin sendiri dilindungi.");

  const { data: staff, error } = await admin
    .from("admin_users")
    .select("user_id,role")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (error) throw new Error(`Gagal memeriksa role user: ${error.message}`);
  if (staff?.role === "superadmin") throw new Error("Akun Superadmin dilindungi.");
}

export async function deactivateUserAccount(targetUserId: string) {
  const currentUserId = await getCurrentUserId();
  const admin = getAdminClient();
  await protectSuperadmin(admin, currentUserId, targetUserId);

  const { data, error: lookupError } = await admin.auth.admin.getUserById(targetUserId);
  if (lookupError || !data?.user) throw new Error("Akun user tidak ditemukan.");

  // Nonaktifkan Auth untuk semua jenis akun tanpa menghapus role lama.
  const { error: banError } = await admin.auth.admin.updateUserById(targetUserId, {
    ban_duration: "876000h",
  });
  if (banError) throw new Error(`Gagal menonaktifkan akun: ${banError.message}`);

  // Sinkronkan whitelist Reader. Jika user bukan Reader, update 0 row tetap aman.
  const { error: readerError } = await admin
    .from("reader_users")
    .update({ is_active: false, status: "blocked" })
    .eq("user_id", targetUserId);
  if (readerError) throw new Error(`Login sudah diblokir, tetapi status Reader gagal diperbarui: ${readerError.message}`);

  const { error: sessionError } = await admin
    .from("reader_active_sessions")
    .delete()
    .eq("user_id", targetUserId);
  if (sessionError) throw new Error(`Akun sudah nonaktif, tetapi sesi Reader gagal dibersihkan: ${sessionError.message}`);

  revalidatePath("/admin/superadmin");
  revalidatePath("/admin");
  revalidatePath("/reader-login");
  return { success: true };
}

export async function deleteUserPermanently(targetUserId: string) {
  const currentUserId = await getCurrentUserId();
  const admin = getAdminClient();
  await protectSuperadmin(admin, currentUserId, targetUserId);

  const { data, error: lookupError } = await admin.auth.admin.getUserById(targetUserId);
  if (lookupError || !data?.user) throw new Error("Akun user tidak ditemukan.");

  const bannedUntil = data.user.banned_until ? new Date(data.user.banned_until).getTime() : 0;
  if (!bannedUntil || bannedUntil <= Date.now()) {
    throw new Error("User masih aktif. Nonaktifkan akun terlebih dahulu sebelum Hapus Permanen.");
  }

  // Tulisan tetap disimpan; hanya referensi akun lama yang dilepas.
  for (const column of ["author_id", "updated_by", "last_published_by"]) {
    const { error } = await admin
      .from("content_folder_entries")
      .update({ [column]: null })
      .eq(column, targetUserId);
    if (error) throw new Error(`Gagal mempertahankan tulisan user (${column}): ${error.message}`);
  }

  const { error: reviewError } = await admin
    .from("writer_applications").update({ reviewed_by: null }).eq("reviewed_by", targetUserId);
  if (reviewError) throw new Error(`Gagal membersihkan riwayat review: ${reviewError.message}`);

  const { error: appError } = await admin
    .from("writer_applications").delete().eq("user_id", targetUserId);
  if (appError) throw new Error(`Gagal menghapus riwayat permohonan: ${appError.message}`);

  const { error: sessionError } = await admin
    .from("reader_active_sessions").delete().eq("user_id", targetUserId);
  if (sessionError) throw new Error(`Gagal membersihkan sesi Reader: ${sessionError.message}`);

  const { error: readerError } = await admin
    .from("reader_users").delete().eq("user_id", targetUserId);
  if (readerError) throw new Error(`Gagal menghapus profil Pembaca: ${readerError.message}`);

  const { error: staffError } = await admin
    .from("admin_users").delete().eq("user_id", targetUserId);
  if (staffError) throw new Error(`Gagal menghapus akses Admin/Penulis: ${staffError.message}`);

  const { error: authDeleteError } = await admin.auth.admin.deleteUser(targetUserId);
  if (authDeleteError) throw new Error(`Data aplikasi sudah dibersihkan, tetapi akun Auth gagal dihapus: ${authDeleteError.message}`);

  revalidatePath("/admin/superadmin");
  revalidatePath("/admin");
  revalidatePath("/writer");
  revalidatePath("/reader-login");
  return { success: true, deletedUserId: targetUserId };
}
