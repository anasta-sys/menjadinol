"use server";

import { revalidatePath } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireSuperAdmin } from "@/lib/admin-auth";

const MATERIAL_BUCKET = "learning-materials";

function publicPath(section?: string | null) {
  if (section === "layanan") return "/perjalanan";
  if (section === "ruang-belajar") return "/ruang-belajar";
  if (section === "artikel") return "/artikel";
  if (section === "tentang") return "/tentang";
  if (section === "sinopsis") return "/sinopsis";
  if (section === "kontak") return "/kontak";
  return "/";
}

async function getSecureAdminClient() {
  const session = await requireSuperAdmin();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Konfigurasi server Supabase belum lengkap.");
  }

  const admin = createAdminClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return {
    admin,
    userId: session.userId,
  };
}

async function getEntryMeta(
  admin: any,
  entryId: string
) {
  const { data: entry, error: entryError } = await admin
    .from("content_folder_entries")
    .select("id,folder_id,attachment_path")
    .eq("id", entryId)
    .maybeSingle();

  if (entryError || !entry) {
    throw new Error("Tulisan tidak ditemukan.");
  }

  const { data: folder, error: folderError } = await admin
    .from("content_folders")
    .select("section")
    .eq("id", entry.folder_id)
    .maybeSingle();

  if (folderError || !folder) {
    throw new Error("Folder tulisan tidak ditemukan.");
  }

  return {
    folderId: entry.folder_id as string,
    attachmentPath:
      (entry.attachment_path as string | null) ?? null,
    section: folder.section as string,
  };
}

function revalidateAll(section?: string | null) {
  revalidatePath("/admin");
  revalidatePath("/admin/superadmin");
  revalidatePath(publicPath(section));
}

export async function publishEntry(entryId: string) {
  if (!entryId) {
    throw new Error("ID tulisan tidak valid.");
  }

  const { admin, userId } =
    await getSecureAdminClient();

  const meta = await getEntryMeta(admin, entryId);
  const now = new Date().toISOString();

  const { error } = await admin
    .from("content_folder_entries")
    .update({
      status: "published",
      published_at: now,
      updated_by: userId,
      last_published_by: userId,
    })
    .eq("id", entryId);

  if (error) {
    throw new Error(
      `Gagal mem-publish tulisan: ${error.message}`
    );
  }

  revalidateAll(meta.section);

  return { success: true };
}

export async function unpublishEntry(entryId: string) {
  if (!entryId) {
    throw new Error("ID tulisan tidak valid.");
  }

  const { admin, userId } =
    await getSecureAdminClient();

  const meta = await getEntryMeta(admin, entryId);

  const { error } = await admin
    .from("content_folder_entries")
    .update({
      status: "draft",
      published_at: null,
      updated_by: userId,
    })
    .eq("id", entryId);

  if (error) {
    throw new Error(
      `Gagal menarik publikasi: ${error.message}`
    );
  }

  revalidateAll(meta.section);

  return { success: true };
}

export async function deleteEntry(entryId: string) {
  if (!entryId) {
    throw new Error("ID tulisan tidak valid.");
  }

  const { admin } =
    await getSecureAdminClient();

  const meta = await getEntryMeta(admin, entryId);

  const { error } = await admin
    .from("content_folder_entries")
    .delete()
    .eq("id", entryId);

  if (error) {
    throw new Error(
      `Gagal menghapus tulisan: ${error.message}`
    );
  }

  if (meta.attachmentPath) {
    const { error: storageError } =
      await admin.storage
        .from(MATERIAL_BUCKET)
        .remove([meta.attachmentPath]);

    if (storageError) {
      console.error(
        "Tulisan terhapus, tetapi lampiran gagal dibersihkan:",
        storageError.message
      );
    }
  }

  revalidateAll(meta.section);

  return { success: true };
}

async function sendApprovedWriterEmail(
  admin: any,
  application: {
    user_id: string;
    email: string;
    display_name?: string | null;
  }
) {
  const { data: authData, error: authError } =
    await admin.auth.admin.getUserById(application.user_id);

  const authUser = authData?.user;

  if (authError || !authUser) {
    throw new Error("Akun pendaftar tidak ditemukan.");
  }

  if (
    !authUser.email ||
    authUser.email.trim().toLowerCase() !==
      application.email.trim().toLowerCase()
  ) {
    throw new Error(
      "Email akun Auth tidak sesuai dengan permohonan."
    );
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    "https://menjadinol.com";

  /*
   * Kalau email Auth BELUM confirmed:
   * kirim confirmation signup Supabase.
   */
  if (!authUser.email_confirmed_at) {
    const { error: resendError } = await admin.auth.resend({
      type: "signup",
      email: application.email,
      options: {
        emailRedirectTo: `${siteUrl}/writer-login?confirmed=1`,
      },
    });

    if (resendError) {
      throw new Error(
        `Email konfirmasi gagal dikirim: ${resendError.message}`
      );
    }

    return {
      confirmationEmailSent: true,
      approvalEmailSent: false,
      emailAlreadyConfirmed: false,
    };
  }

  /*
   * Kalau email Auth SUDAH confirmed dari percobaan/akun sebelumnya,
   * Supabase tidak dapat mengirim "confirm signup" lagi.
   * Tetap kirim email persetujuan melalui Resend agar Accept
   * selalu menghasilkan email ke pendaftar.
   */
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.OTP_FROM_EMAIL || "noreply@menjadinol.com";

  if (!resendApiKey) {
    throw new Error(
      "Email akun sudah terkonfirmasi, tetapi RESEND_API_KEY belum tersedia untuk mengirim email persetujuan."
    );
  }

  const displayName =
    application.display_name?.trim() || "Penulis";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `Menjadi Nol <${fromEmail}>`,
      to: [application.email],
      subject: "Permohonan Penulis/Admin disetujui — Menjadi Nol",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.7;color:#304137">
          <h2 style="color:#185f3d">Permohonan Anda disetujui</h2>
          <p>Halo ${displayName},</p>
          <p>Permohonan akses Anda di Menjadi Nol telah disetujui oleh Superadmin.</p>
          <p>Email akun Anda sudah pernah dikonfirmasi, sehingga Anda tidak perlu melakukan konfirmasi email ulang.</p>
          <p>
            <a href="${siteUrl}/writer-login"
               style="display:inline-block;padding:12px 22px;background:#185f3d;color:#fff;text-decoration:none;border-radius:999px;font-weight:600">
              Masuk sebagai Penulis/Admin
            </a>
          </p>
          <p>Salam,<br><strong>Menjadi Nol</strong></p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Email persetujuan gagal dikirim${
        detail ? `: ${detail.slice(0, 300)}` : "."
      }`
    );
  }

  return {
    confirmationEmailSent: false,
    approvalEmailSent: true,
    emailAlreadyConfirmed: true,
  };
}

export async function approveWriterApplication(
  applicationId: string
) {
  if (!applicationId) {
    throw new Error("ID permohonan tidak valid.");
  }

  const { admin, userId } =
    await getSecureAdminClient();

  const { data: application, error: applicationError } =
    await admin
      .from("writer_applications")
      .select(
        "id,user_id,email,display_name,requested_access,status"
      )
      .eq("id", applicationId)
      .maybeSingle();

  if (applicationError || !application) {
    throw new Error("Permohonan tidak ditemukan.");
  }

  if (application.status !== "pending") {
    throw new Error("Permohonan ini sudah pernah diproses.");
  }

  /*
   * Akun Auth cukup dipastikan ada.
   * Email TIDAK wajib confirmed sebelum Accept.
   */
  const { data: authData, error: authError } =
    await admin.auth.admin.getUserById(application.user_id);

  const authUser = authData?.user;

  if (authError || !authUser) {
    throw new Error("Akun pendaftar tidak ditemukan.");
  }

  if (
    !authUser.email ||
    authUser.email.trim().toLowerCase() !==
      application.email.trim().toLowerCase()
  ) {
    throw new Error(
      "Email akun Auth tidak sesuai dengan permohonan."
    );
  }

  const approvedRole =
    application.requested_access === "admin"
      ? "admin"
      : "writer";

  const { error: adminUserError } = await admin
    .from("admin_users")
    .upsert(
      {
        user_id: application.user_id,
        role: approvedRole,
        display_name:
          application.display_name?.trim() ||
          (approvedRole === "writer" ? "Penulis" : "Admin"),
      },
      {
        onConflict: "user_id",
      }
    );

  if (adminUserError) {
    throw new Error(
      `Gagal memberikan akses: ${adminUserError.message}`
    );
  }

  const now = new Date().toISOString();

  const { error: applicationUpdateError } = await admin
    .from("writer_applications")
    .update({
      status: "approved",
      reviewed_by: userId,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", applicationId)
    .eq("status", "pending");

  if (applicationUpdateError) {
    await admin
      .from("admin_users")
      .delete()
      .eq("user_id", application.user_id);

    throw new Error(
      `Gagal menyelesaikan persetujuan: ${applicationUpdateError.message}`
    );
  }

  /*
   * BARU setelah status approved berhasil:
   * - unconfirmed -> email konfirmasi Supabase
   * - already confirmed -> email persetujuan Resend
   */
  const emailResult = await sendApprovedWriterEmail(
    admin,
    application
  );

  revalidatePath("/superadmin");
  revalidatePath("/admin/superadmin");
  revalidatePath("/admin");

  return {
    success: true,
    role: approvedRole,
    ...emailResult,
  };
}

export async function rejectWriterApplication(
  applicationId: string
) {
  if (!applicationId) {
    throw new Error("ID permohonan tidak valid.");
  }

  const { admin, userId } =
    await getSecureAdminClient();

  const { data: application, error: applicationError } =
    await admin
      .from("writer_applications")
      .select("id,user_id,status")
      .eq("id", applicationId)
      .maybeSingle();

  if (applicationError || !application) {
    throw new Error("Permohonan tidak ditemukan.");
  }

  if (application.status !== "pending") {
    throw new Error("Permohonan ini sudah pernah diproses.");
  }

  /*
   * Menolak permohonan TIDAK menghapus akun Supabase Auth.
   * Ini lebih aman bila email yang sama juga digunakan sebagai pembaca.
   */
  const now = new Date().toISOString();

  const { error } = await admin
    .from("writer_applications")
    .update({
      status: "rejected",
      reviewed_by: userId,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", applicationId)
    .eq("status", "pending");

  if (error) {
    throw new Error(
      `Gagal menolak permohonan: ${error.message}`
    );
  }

  revalidatePath("/superadmin");
  revalidatePath("/admin/superadmin");

  return { success: true };
}


export async function revokeWriterApplication(
  applicationId: string
) {
  if (!applicationId) {
    throw new Error("ID permohonan tidak valid.");
  }

  const { admin, userId } =
    await getSecureAdminClient();

  const { data: application, error: applicationError } =
    await admin
      .from("writer_applications")
      .select("id,user_id,status")
      .eq("id", applicationId)
      .maybeSingle();

  if (applicationError || !application) {
    throw new Error("Permohonan tidak ditemukan.");
  }

  if (application.status !== "approved") {
    throw new Error(
      "Hanya permohonan yang sudah disetujui yang dapat dicabut."
    );
  }

  const { data: targetProfile, error: targetProfileError } =
    await admin
      .from("admin_users")
      .select("user_id,role")
      .eq("user_id", application.user_id)
      .maybeSingle();

  if (targetProfileError) {
    throw new Error(
      `Gagal memeriksa akses user: ${targetProfileError.message}`
    );
  }

  if (targetProfile?.role === "superadmin") {
    throw new Error(
      "Akses Superadmin tidak dapat dicabut dari riwayat permohonan."
    );
  }

  if (targetProfile) {
    const { error: revokeAccessError } = await admin
      .from("admin_users")
      .delete()
      .eq("user_id", application.user_id);

    if (revokeAccessError) {
      throw new Error(
        `Gagal mencabut akses: ${revokeAccessError.message}`
      );
    }
  }

  const now = new Date().toISOString();

  const { error: updateError } = await admin
    .from("writer_applications")
    .update({
      status: "rejected",
      reviewed_by: userId,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", applicationId)
    .eq("status", "approved");

  if (updateError) {
    throw new Error(
      `Akses sudah dicabut, tetapi riwayat gagal diperbarui: ${updateError.message}`
    );
  }

  revalidatePath("/admin/superadmin");
  revalidatePath("/admin");
  revalidatePath("/writer");

  return { success: true };
}

export async function changeStaffRole(
  targetUserId: string,
  newRole: "writer" | "admin"
) {
  if (!targetUserId) {
    throw new Error("User tidak valid.");
  }

  if (
    newRole !== "writer" &&
    newRole !== "admin"
  ) {
    throw new Error("Role tidak valid.");
  }

  const { admin, userId } =
    await getSecureAdminClient();

  if (targetUserId === userId) {
    throw new Error(
      "Role Superadmin sendiri tidak dapat diubah."
    );
  }

  const {
    data: target,
    error: targetError,
  } = await admin
    .from("admin_users")
    .select("user_id,role")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (targetError || !target) {
    throw new Error(
      "Akun staff tidak ditemukan."
    );
  }

  if (target.role === "superadmin") {
    throw new Error(
      "Role Superadmin tidak dapat diubah dari menu ini."
    );
  }

  const { error } = await admin
    .from("admin_users")
    .update({
      role: newRole,
    })
    .eq("user_id", targetUserId);

  if (error) {
    throw new Error(
      `Gagal mengubah role: ${error.message}`
    );
  }

  revalidatePath("/admin/superadmin");
  revalidatePath("/admin");
  revalidatePath("/writer");

  return {
    success: true,
    role: newRole,
  };
}

export async function deactivateStaff(
  targetUserId: string
) {
  if (!targetUserId) {
    throw new Error("User tidak valid.");
  }

  const { admin, userId } =
    await getSecureAdminClient();

  if (targetUserId === userId) {
    throw new Error(
      "Akun Superadmin sendiri tidak dapat dinonaktifkan."
    );
  }

  const {
    data: target,
    error: targetError,
  } = await admin
    .from("admin_users")
    .select("user_id,role")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (targetError || !target) {
    throw new Error(
      "Akun staff tidak ditemukan."
    );
  }

  if (target.role === "superadmin") {
    throw new Error(
      "Akun Superadmin tidak dapat dinonaktifkan dari menu ini."
    );
  }

  const { error } = await admin
    .from("admin_users")
    .delete()
    .eq("user_id", targetUserId);

  if (error) {
    throw new Error(
      `Gagal menonaktifkan akses: ${error.message}`
    );
  }

  revalidatePath("/admin/superadmin");
  revalidatePath("/admin");
  revalidatePath("/writer");

  return { success: true };
}

export async function createAdminAccount(input: {
  displayName: string;
  email: string;
  password?: string;
}) {
  const displayName = input.displayName?.trim();
  const email = input.email?.trim().toLowerCase();
  const password = input.password ?? "";

  if (!displayName) {
    throw new Error("Nama Admin wajib diisi.");
  }

  if (!email) {
    throw new Error("Email Admin wajib diisi.");
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    throw new Error("Format email tidak valid.");
  }

  if (password && password.length < 8) {
    throw new Error("Password Admin minimal 8 karakter.");
  }

  const session = await requireSuperAdmin();

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Konfigurasi server Supabase belum lengkap."
    );
  }

  const supabase = createAdminClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // Admin wajib menggunakan email khusus yang belum pernah dipakai
  // Reader, Writer, Admin, maupun Superadmin.
  const {
    data: usersData,
    error: listUsersError,
  } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listUsersError) {
    throw new Error(
      `Gagal memeriksa akun: ${listUsersError.message}`
    );
  }

  const existingAuthUser = usersData.users.find(
    (user) =>
      user.email?.trim().toLowerCase() === email
  );

  if (existingAuthUser) {
    const {
      data: existingStaff,
      error: staffCheckError,
    } = await supabase
      .from("admin_users")
      .select("user_id,role")
      .eq("user_id", existingAuthUser.id)
      .maybeSingle();

    if (staffCheckError) {
      throw new Error(
        `Gagal memeriksa akses akun: ${staffCheckError.message}`
      );
    }

    if (existingStaff?.role === "writer") {
      throw new Error(
        "DITOLAK: email ini sudah dipakai akun Penulis. Gunakan email lain khusus untuk Admin."
      );
    }

    if (existingStaff?.role === "admin") {
      throw new Error(
        "DITOLAK: email ini sudah terdaftar sebagai Admin."
      );
    }

    if (existingStaff?.role === "superadmin") {
      throw new Error(
        "DITOLAK: email ini sudah terdaftar sebagai Superadmin."
      );
    }

    throw new Error(
      "DITOLAK: email ini sudah dipakai akun Pembaca atau akun login lain. Gunakan email berbeda khusus untuk Admin."
    );
  }

  let userId: string;

  if (password) {
    const { data: createdData, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: displayName,
          account_type: "admin",
          admin_password_set: true,
          password_created_by_superadmin: true,
        },
      });

    if (createError || !createdData.user) {
      throw new Error(
        `Gagal membuat akun Admin: ${
          createError?.message ?? "User tidak terbentuk."
        }`
      );
    }

    userId = createdData.user.id;
  } else {
    const { data: inviteData, error: inviteError } =
      await supabase.auth.admin.generateLink({
        type: "invite",
        email,
        options: {
          data: {
            display_name: displayName,
            account_type: "admin",
          },
        },
      });

    if (inviteError || !inviteData.user?.id) {
      throw new Error(
        `Gagal membuat undangan Admin: ${
          inviteError?.message ?? "User tidak terbentuk."
        }`
      );
    }

    userId = inviteData.user.id;
  }

  const { error: insertError } = await supabase
    .from("admin_users")
    .upsert(
      {
        user_id: userId,
        role: "admin",
        display_name: displayName,
      },
      {
        onConflict: "user_id",
      }
    );

  if (insertError) {
    await supabase.auth.admin.deleteUser(userId);

    throw new Error(
      `Gagal menyimpan akses Admin: ${insertError.message}`
    );
  }

  revalidatePath("/admin/superadmin");
  revalidatePath("/admin");

  return {
    success: true,
    userId,
    createdBy: session.userId,
  };
}
