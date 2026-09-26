import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import { logSystemError } from "@/lib/system-monitoring/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const tokenHash =
    requestUrl.searchParams.get("token_hash");

  if (!tokenHash) {
    const errorUrl = new URL(
      "/writer-forgot-password",
      requestUrl.origin
    );
    errorUrl.searchParams.set(
      "error",
      "invalid_recovery_link"
    );
    return NextResponse.redirect(errorUrl);
  }

  try {
    const supabase = await createClient();

    const { data, error } =
      await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "recovery",
      });

    if (
      error ||
      !data.session ||
      !data.user
    ) {
      console.error(
        "Writer recovery token gagal:",
        error
      );

      const errorUrl = new URL(
        "/writer-forgot-password",
        requestUrl.origin
      );
      errorUrl.searchParams.set(
        "error",
        "invalid_recovery_link"
      );
      return NextResponse.redirect(errorUrl);
    }

    // Validasi role dilakukan di server memakai service role.
    const admin = createAdminClient();

    const { data: profile, error: profileError } =
      await admin
        .from("admin_users")
        .select("user_id,role")
        .eq("user_id", data.user.id)
        .maybeSingle();

    if (profileError) {
      await logSystemError({
        severity: "error",
        module: "writer",
        action: "recovery-role-lookup",
        errorCode: profileError.code || "ROLE_LOOKUP_FAILED",
        technicalMessage: profileError.message,
        userMessage: "Role akun gagal diperiksa.",
        userId: data.user.id,
        userEmail: data.user.email ?? null,
        userType: "writer",
        requestPath: "/auth/writer-recovery",
      });
    }

    if (
      profileError ||
      !profile ||
      profile.role !== "writer"
    ) {
      console.error(
        "Writer recovery role tidak valid:",
        profileError
      );

      await supabase.auth.signOut();

      const errorUrl = new URL(
        "/writer-forgot-password",
        requestUrl.origin
      );
      errorUrl.searchParams.set(
        "error",
        "invalid_account_role"
      );
      return NextResponse.redirect(errorUrl);
    }

    return NextResponse.redirect(
      new URL(
        "/writer-reset-password",
        requestUrl.origin
      )
    );
  } catch (error) {
    console.error(
      "Writer recovery gagal:",
      error
    );

    await logSystemError({
            severity: "error",
            module: "writer",
            action: "recovery-unhandled",
            errorCode: "RECOVERY_UNHANDLED",
            technicalMessage: error instanceof Error ? error.message : String(error),
            userMessage: "Pemulihan akun mengalami gangguan.",
            userId: null,
            userEmail: null,
            userType: "writer",
            requestPath: "/auth/writer-recovery",
          });

    const errorUrl = new URL(
      "/writer-forgot-password",
      requestUrl.origin
    );
    errorUrl.searchParams.set(
      "error",
      "recovery_failed"
    );

    return NextResponse.redirect(errorUrl);
  }
}
