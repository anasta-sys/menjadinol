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

export const dynamic =
  "force-dynamic";

export async function GET(
  request: NextRequest
) {
  const requestUrl =
    new URL(
      request.url
    );

  const tokenHash =
    requestUrl
      .searchParams
      .get(
        "token_hash"
      );

  if (!tokenHash) {
    const errorUrl =
      new URL(
        "/superadmin-forgot-password",
        requestUrl.origin
      );

    errorUrl
      .searchParams
      .set(
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

    const {
      data,
      error,
    } =
      await supabase
        .auth
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
      console.error(
        "Superadmin recovery token gagal:",
        error
      );

      const errorUrl =
        new URL(
          "/superadmin-forgot-password",
          requestUrl.origin
        );

      errorUrl
        .searchParams
        .set(
          "error",
          "invalid_recovery_link"
        );

      return NextResponse.redirect(
        errorUrl
      );
    }

    /*
     * ROLE CHECK memakai
     * service role di server.
     */
    const admin =
      createAdminClient();

    const {
      data: profile,
      error: profileError,
    } =
      await admin
        .from(
          "admin_users"
        )
        .select(
          "user_id,role"
        )
        .eq(
          "user_id",
          data.user.id
        )
        .maybeSingle();

    if (
      profileError ||
      !profile ||
      profile.role !==
        "superadmin"
    ) {
      console.error(
        "Superadmin recovery role tidak valid:",
        profileError
      );

      await supabase
        .auth
        .signOut();

      const errorUrl =
        new URL(
          "/superadmin-forgot-password",
          requestUrl.origin
        );

      errorUrl
        .searchParams
        .set(
          "error",
          "invalid_account_role"
        );

      return NextResponse.redirect(
        errorUrl
      );
    }

    return NextResponse.redirect(
      new URL(
        "/superadmin-reset-password",
        requestUrl.origin
      )
    );
  } catch (error) {
    console.error(
      "Superadmin recovery gagal:",
      error
    );

    const errorUrl =
      new URL(
        "/superadmin-forgot-password",
        requestUrl.origin
      );

    errorUrl
      .searchParams
      .set(
        "error",
        "recovery_failed"
      );

    return NextResponse.redirect(
      errorUrl
    );
  }
}