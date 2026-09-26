import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

import { logSystemError } from "@/lib/system-monitoring/logger";

type RequestedAccess = "writer" | "admin";

function cleanString(value: unknown, max: number) {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = cleanString(body?.email, 320).toLowerCase();
    const password =
      typeof body?.password === "string" ? body.password : "";

    const fullName = cleanString(body?.full_name, 120);
    const displayName = cleanString(body?.display_name, 80);
    const reason = cleanString(body?.reason, 1200);

    const requestedAccess: RequestedAccess =
      body?.requested_access === "admin"
        ? "admin"
        : "writer";

    if (
      !email ||
      password.length < 8 ||
      !fullName ||
      !displayName ||
      reason.length < 10
    ) {
      return NextResponse.json(
        { error: "Data permohonan belum lengkap." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    /*
     * Cek apakah email sudah mempunyai akun Auth.
     * Jika sudah ada, jangan membuat akun duplikat.
     */
    const {
      data: usersData,
      error: usersError,
    } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (usersError) {
      console.error("writer-register auth lookup:", usersError);

await logSystemError({
        severity: "error",
        module: "writer",
        action: "auth-lookup",
        errorCode: usersError.code || "AUTH_LOOKUP_FAILED",
        technicalMessage: usersError.message,
        userMessage: "Akun pendaftar gagal diperiksa.",
        userId: null,
        userEmail: email,
        userType: "writer",
        requestPath: "/api/writer-register",
      });

      return NextResponse.json(
        { error: "Akun belum berhasil diperiksa." },
        { status: 500 }
      );
    }

    const existingAuthUser =
      usersData.users.find(
        (user) =>
          user.email?.trim().toLowerCase() === email
      ) ?? null;

    let userId = existingAuthUser?.id ?? "";

    /*
     * Kalau email belum terdaftar, buat Auth user SERVER-SIDE.
     *
     * email_confirm: false
     * = akun belum dianggap terkonfirmasi.
     *
     * createUser admin tidak menjalankan signUp browser,
     * sehingga flow konfirmasi akan kita kirim setelah Accept.
     */
    if (!existingAuthUser) {
      const {
        data: createdData,
        error: createError,
      } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: {
          full_name: fullName,
          display_name: displayName,
          requested_access: requestedAccess,
        },
      });

      if (createError || !createdData.user) {
        console.error(
          "writer-register create auth:",
          createError
        );

        return NextResponse.json(
          {
            error:
              createError?.message ||
              "Akun belum berhasil dibuat.",
          },
          { status: 400 }
        );
      }

      userId = createdData.user.id;
    } else {
      /*
       * Email lama boleh mengajukan akses,
       * tetapi password yang dimasukkan harus benar.
       *
       * Verifikasi dilakukan dengan client sementara
       * tidak dilakukan di sini agar service-role session
       * tidak berubah.
       *
       * Untuk akun lama yang sudah terverifikasi,
       * approval tetap dapat menggunakan user_id yang sama.
       */
      if (!existingAuthUser.email_confirmed_at) {
        const { error: updateError } =
          await admin.auth.admin.updateUserById(
            existingAuthUser.id,
            {
              password,
              user_metadata: {
                ...existingAuthUser.user_metadata,
                full_name: fullName,
                display_name: displayName,
                requested_access: requestedAccess,
              },
            }
          );

        if (updateError) {
          console.error(
            "writer-register update pending auth:",
            updateError
          );

        await logSystemError({
            severity: "error",
            module: "writer",
            action: "update-pending-auth",
            errorCode: updateError.code || "AUTH_UPDATE_FAILED",
            technicalMessage: updateError.message,
            userMessage: "Akun pending gagal diperbarui.",
            userId: userId,
            userEmail: email,
            userType: "writer",
            requestPath: "/api/writer-register",
          });

      return NextResponse.json(
            { error: "Akun pending belum berhasil diperbarui." },
            { status: 500 }
          );
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Identitas akun belum berhasil dibuat." },
        { status: 500 }
      );
    }

    /*
     * Akun yang sudah mempunyai role pengelolaan
     * tidak boleh membuat permohonan baru.
     */
    const {
      data: existingAdmin,
      error: existingAdminError,
    } = await admin
      .from("admin_users")
      .select("user_id,role")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingAdminError) {
      console.error(
        "writer-register admin lookup:",
        existingAdminError
      );

await logSystemError({
        severity: "error",
        module: "writer",
        action: "admin-role-lookup",
        errorCode: existingAdminError.code || "ADMIN_LOOKUP_FAILED",
        technicalMessage: existingAdminError.message,
        userMessage: "Status akses akun gagal diperiksa.",
        userId: userId,
        userEmail: email,
        userType: "writer",
        requestPath: "/api/writer-register",
      });

      return NextResponse.json(
        { error: "Status akses akun belum berhasil diperiksa." },
        { status: 500 }
      );
    }

    if (existingAdmin) {
      return NextResponse.json(
        { error: "Akun ini sudah memiliki akses pengelolaan." },
        { status: 409 }
      );
    }

    /*
     * Jangan timpa permohonan pending yang sudah ada
     * hanya karena tombol submit ditekan lagi.
     */
    const {
      data: existingApplication,
      error: applicationLookupError,
    } = await admin
      .from("writer_applications")
      .select("id,user_id,email,status")
      .eq("email", email)
      .maybeSingle();

    if (applicationLookupError) {
      console.error(
        "writer-register application lookup:",
        applicationLookupError
      );

await logSystemError({
        severity: "error",
        module: "writer",
        action: "application-lookup",
        errorCode: applicationLookupError.code || "APPLICATION_LOOKUP_FAILED",
        technicalMessage: applicationLookupError.message,
        userMessage: "Permohonan gagal diperiksa.",
        userId: userId,
        userEmail: email,
        userType: "writer",
        requestPath: "/api/writer-register",
      });

      return NextResponse.json(
        { error: "Permohonan belum berhasil diperiksa." },
        { status: 500 }
      );
    }

    if (existingApplication?.status === "pending") {
      return NextResponse.json(
        {
          error:
            "Permohonan dengan email ini masih menunggu persetujuan Superadmin.",
        },
        { status: 409 }
      );
    }

    if (existingApplication?.status === "approved") {
      return NextResponse.json(
        {
          error:
            "Permohonan dengan email ini sudah disetujui.",
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    const applicationPayload = {
      user_id: userId,
      email,
      full_name: fullName,
      display_name: displayName,
      requested_access: requestedAccess,
      reason,
      status: "pending" as const,
      reviewed_by: null,
      reviewed_at: null,
      updated_at: now,
    };

    let saveError = null;

    if (existingApplication) {
      const { error } = await admin
        .from("writer_applications")
        .update(applicationPayload)
        .eq("id", existingApplication.id);

      saveError = error;
    } else {
      const { error } = await admin
        .from("writer_applications")
        .upsert(applicationPayload, {
          onConflict: "user_id",
        });

      saveError = error;
    }

    if (saveError) {
      console.error("writer-register save:", saveError);

      /*
       * Kalau Auth user baru berhasil dibuat tetapi
       * permohonannya gagal disimpan, bersihkan user tersebut.
       * Jangan hapus akun lama.
       */
      if (!existingAuthUser) {
        await admin.auth.admin.deleteUser(userId);
      }

await logSystemError({
        severity: "error",
        module: "writer",
        action: "application-save",
        errorCode: saveError.code || "APPLICATION_SAVE_FAILED",
        technicalMessage: saveError.message,
        userMessage: "Permohonan gagal disimpan.",
        userId: userId,
        userEmail: email,
        userType: "writer",
        requestPath: "/api/writer-register",
      });

      return NextResponse.json(
        {
          error:
            "Permohonan belum berhasil disimpan. Silakan coba lagi.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Permohonan berhasil dikirim dan menunggu persetujuan Superadmin. Email konfirmasi akan dikirim setelah permohonan disetujui.",
    });
  } catch (error) {
    console.error("writer-register route:", error);

    await logSystemError({
            severity: "error",
            module: "writer",
            action: "register-unhandled",
            errorCode: "WRITER_REGISTER_UNHANDLED",
            technicalMessage: error instanceof Error ? error.message : String(error),
            userMessage: "Permohonan akses mengalami gangguan.",
            userId: null,
            userEmail: null,
            userType: "writer",
            requestPath: "/api/writer-register",
          });

    return NextResponse.json(
      { error: "Permohonan belum berhasil diproses." },
      { status: 500 }
    );
  }
}
