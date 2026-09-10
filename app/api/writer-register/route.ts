import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RequestedAccess = "writer" | "admin";

function cleanString(value: unknown, max: number) {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const userId = cleanString(body?.user_id, 80);
    const email = cleanString(body?.email, 320).toLowerCase();
    const fullName = cleanString(body?.full_name, 120);
    const displayName = cleanString(body?.display_name, 80);
    const reason = cleanString(body?.reason, 1200);

    const requestedAccess: RequestedAccess =
      body?.requested_access === "admin"
        ? "admin"
        : "writer";

    if (
      !userId ||
      !email ||
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
     * Jangan percaya user_id/email dari browser begitu saja.
     * Pastikan user tersebut benar-benar ada di Supabase Auth
     * dan emailnya cocok.
     */
    const { data: authData, error: authError } =
      await admin.auth.admin.getUserById(userId);

    const authUser = authData?.user;

    if (
      authError ||
      !authUser ||
      authUser.email?.toLowerCase() !== email
    ) {
      return NextResponse.json(
        { error: "Identitas akun tidak dapat diverifikasi." },
        { status: 403 }
      );
    }

    /*
     * Akun yang sudah punya akses admin tidak boleh mengajukan ulang.
     */
    const { data: existingAdmin } = await admin
      .from("admin_users")
      .select("user_id,role")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingAdmin) {
      return NextResponse.json(
        { error: "Akun ini sudah memiliki akses pengelolaan." },
        { status: 409 }
      );
    }

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
      updated_at: new Date().toISOString(),
    };

    /*
     * Cari dulu berdasarkan email terverifikasi. Ini penting untuk akun lama
     * yang pernah menghasilkan user_id berbeda/obfuscated saat signUp ulang.
     * Jika ada record lama dengan email yang sama, kita perbaiki record itu
     * memakai user_id Auth yang benar, bukan membuat duplikat.
     */
    const { data: existingApplication, error: existingApplicationError } =
      await admin
        .from("writer_applications")
        .select("id,user_id,email,status")
        .eq("email", email)
        .maybeSingle();

    if (existingApplicationError) {
      console.error("writer-register lookup:", existingApplicationError);
      return NextResponse.json(
        { error: "Permohonan belum berhasil diperiksa." },
        { status: 500 }
      );
    }

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

      return NextResponse.json(
        {
          error:
            "Permohonan belum berhasil disimpan. Silakan coba lagi setelah refresh.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Permohonan tersimpan dan menunggu persetujuan Superadmin.",
    });
  } catch (error) {
    console.error("writer-register route:", error);

    return NextResponse.json(
      { error: "Permohonan belum berhasil diproses." },
      { status: 500 }
    );
  }
}
