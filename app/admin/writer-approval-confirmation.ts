"use server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Kirim ulang email konfirmasi signup HANYA setelah
 * permohonan Writer/Admin sudah di-Accept oleh Superadmin.
 *
 * File ini berdiri sendiri supaya flow register lama tidak disentuh.
 */
export async function sendWriterApprovalConfirmationEmail(
  applicationId: string
) {
  if (!applicationId) {
    throw new Error("ID permohonan tidak valid.");
  }

  const admin = createAdminClient();

  const { data: application, error: applicationError } = await admin
    .from("writer_applications")
    .select("id,user_id,email,status")
    .eq("id", applicationId)
    .maybeSingle();

  if (applicationError || !application) {
    throw new Error("Permohonan tidak ditemukan.");
  }

  if (application.status !== "approved") {
    throw new Error(
      "Email konfirmasi hanya dapat dikirim setelah permohonan disetujui."
    );
  }

  const { data: authData, error: authError } =
    await admin.auth.admin.getUserById(application.user_id);

  const authUser = authData?.user;

  if (authError || !authUser) {
    throw new Error("Akun pendaftar tidak ditemukan.");
  }

  if (
    !authUser.email ||
    authUser.email.toLowerCase() !== application.email.toLowerCase()
  ) {
    throw new Error("Email akun tidak sesuai dengan data permohonan.");
  }

  // Akun lama yang memang sudah pernah mengonfirmasi email
  // tidak perlu menerima confirmation signup lagi.
  if (authUser.email_confirmed_at) {
    return {
      success: true,
      alreadyConfirmed: true,
      message: "Email akun ini sudah terkonfirmasi.",
    };
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    "https://menjadinol.com";

  const { error: resendError } = await admin.auth.resend({
    type: "signup",
    email: application.email,
    options: {
      emailRedirectTo: `${siteUrl}/writer-login?confirmed=1`,
    },
  });

  if (resendError) {
    console.error(
      "writer approval confirmation email:",
      resendError
    );

    throw new Error(
      `Permohonan sudah disetujui, tetapi email konfirmasi gagal dikirim: ${resendError.message}`
    );
  }

  return {
    success: true,
    alreadyConfirmed: false,
    message: "Email konfirmasi berhasil dikirim.",
  };
}
