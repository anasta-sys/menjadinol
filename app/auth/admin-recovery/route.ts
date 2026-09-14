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
  } catch {
    return NextResponse.redirect(
      new URL(
        "/admin-forgot-password?error=recovery_failed",
        requestUrl.origin
      )
    );
  }
}