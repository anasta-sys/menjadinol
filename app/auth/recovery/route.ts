import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
    const errorUrl =
      new URL(
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

    const {
      data,
      error,
    } =
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
        "Recovery token gagal:",
        error
      );

      const errorUrl =
        new URL(
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

    return NextResponse.redirect(
      new URL(
        "/reader-reset-password",
        requestUrl.origin
      )
    );
  } catch (error) {
    console.error(
      "Recovery gagal:",
      error
    );

    const errorUrl =
      new URL(
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