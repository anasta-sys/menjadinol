import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import { logSystemError } from "@/lib/system-monitoring/logger";

export const dynamic =
  "force-dynamic";

export async function GET(
  request: NextRequest
) {
  const requestUrl =
    new URL(request.url);

  const tokenHash =
    requestUrl.searchParams.get(
      "token_hash"
    );

  if (!tokenHash) {
    return NextResponse.redirect(
      new URL(
        "/admin-forgot-password?error=invalid_recovery_link",
        requestUrl.origin
      )
    );
  }

  try {
    const supabase =
      await createClient();

    const {
      data,
      error,
    } =
      await supabase.auth
        .verifyOtp({
          token_hash:
            tokenHash,

          type:
            "recovery",
        });

    if (
      error ||
      !data.session ||
      !data.user
    ) {
      return NextResponse.redirect(
        new URL(
          "/admin-forgot-password?error=invalid_recovery_link",
          requestUrl.origin
        )
      );
    }

    const admin =
      createAdminClient();

    const {
      data: profile,
      error: profileError,
    } =
      await admin
        .from("admin_users")
        .select(
          "user_id,role"
        )
        .eq(
          "user_id",
          data.user.id
        )
        .maybeSingle();

    if (profileError) {
      await logSystemError({
        severity: "error",
        module: "admin",
        action: "recovery-role-lookup",
        errorCode: profileError.code || "ROLE_LOOKUP_FAILED",
        technicalMessage: profileError.message,
        userMessage: "Role Admin gagal diperiksa.",
        userId: data.user.id,
        userEmail: data.user.email ?? null,
        userType: "admin",
        requestPath: "/auth/admin-recovery",
      });
    }

    if (
      !profile ||
      profile.role !== "admin"
    ) {
      await supabase.auth
        .signOut();

      return NextResponse.redirect(
        new URL(
          "/admin-forgot-password?error=invalid_account_role",
          requestUrl.origin
        )
      );
    }

    return NextResponse.redirect(
      new URL(
        "/admin-reset-password",
        requestUrl.origin
      )
    );
  } catch (error) {
    await logSystemError({
            severity: "error",
            module: "admin",
            action: "recovery-unhandled",
            errorCode: "RECOVERY_UNHANDLED",
            technicalMessage: error instanceof Error ? error.message : String(error),
            userMessage: "Pemulihan akun mengalami gangguan.",
            userId: null,
            userEmail: null,
            userType: "admin",
            requestPath: "/auth/admin-recovery",
          });

    return NextResponse.redirect(
      new URL(
        "/admin-forgot-password?error=recovery_failed",
        requestUrl.origin
      )
    );
  }
}
