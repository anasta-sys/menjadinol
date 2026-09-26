import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createClient } from "@/lib/supabase/server";

import { logSystemError } from "@/lib/system-monitoring/logger";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest
) {
  const requestUrl = new URL(request.url);

  const code =
    requestUrl.searchParams.get("code");

  const flowId =
    requestUrl.searchParams.get("sb_flow_id");

  /*
   * PKCE recovery Supabase HARUS
   * mengembalikan ?code=...
   */
  if (!code) {
    console.error(
      "Recovery callback tanpa code:",
      requestUrl.toString()
    );

    const errorUrl = new URL(
      "/reader-forgot-password",
      requestUrl.origin
    );

    errorUrl.searchParams.set(
      "error",
      "invalid_recovery_link"
    );

    return NextResponse.redirect(
      errorUrl
    );
  }

  try {
    const supabase =
      await createClient();

    /*
     * Tukar authorization code
     * menjadi session Supabase.
     */
    const {
      data,
      error,
    } =
      await supabase.auth.exchangeCodeForSession(
        code,
        flowId
          ? { flowId }
          : undefined
      );

    if (
      error ||
      !data.session ||
      !data.user
    ) {
      console.error(
        "Recovery exchange gagal:",
        error
      );

      const errorUrl = new URL(
        "/reader-forgot-password",
        requestUrl.origin
      );

      errorUrl.searchParams.set(
        "error",
        "invalid_recovery_link"
      );

      return NextResponse.redirect(
        errorUrl
      );
    }

    /*
     * Session recovery berhasil.
     * Arahkan ke halaman buat password baru.
     */
    const resetUrl = new URL(
      "/reader-reset-password",
      requestUrl.origin
    );

    return NextResponse.redirect(
      resetUrl
    );
  } catch (error) {
    console.error(
      "Recovery callback gagal:",
      error
    );

    await logSystemError({
            severity: "error",
            module: "reader",
            action: "recovery-unhandled",
            errorCode: "RECOVERY_UNHANDLED",
            technicalMessage: error instanceof Error ? error.message : String(error),
            userMessage: "Pemulihan akun mengalami gangguan.",
            userId: null,
            userEmail: null,
            userType: "reader",
            requestPath: "/auth/callback",
          });

    const errorUrl = new URL(
      "/reader-forgot-password",
      requestUrl.origin
    );

    errorUrl.searchParams.set(
      "error",
      "recovery_failed"
    );

    return NextResponse.redirect(
      errorUrl
    );
  }
}
