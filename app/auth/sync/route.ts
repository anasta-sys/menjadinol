import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function noStore(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control":
        "private, no-store, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function POST(
  request: NextRequest
) {
  /*
   * ==========================================
   * SAME ORIGIN
   * ==========================================
   */
  const origin =
    request.headers.get("origin");

  const host =
    request.headers.get("host");

  if (origin && host) {
    try {
      const originHost =
        new URL(origin).host;

      if (originHost !== host) {
        return noStore(
          {
            error:
              "Origin tidak diizinkan.",
          },
          403
        );
      }
    } catch {
      return noStore(
        {
          error:
            "Origin tidak valid.",
        },
        403
      );
    }
  }

  /*
   * ==========================================
   * BODY
   * ==========================================
   */
  let body: unknown;

  try {
    body =
      await request.json();
  } catch {
    return noStore(
      {
        error:
          "Request tidak valid.",
      },
      400
    );
  }

  const payload =
    body as {
      access_token?: unknown;
      refresh_token?: unknown;
    };

  const accessToken =
    typeof payload.access_token ===
    "string"
      ? payload.access_token
      : "";

  const refreshToken =
    typeof payload.refresh_token ===
    "string"
      ? payload.refresh_token
      : "";

  if (
    !accessToken ||
    !refreshToken
  ) {
    return noStore(
      {
        error:
          "Token session tidak lengkap.",
      },
      400
    );
  }

  const supabase =
    await createClient();

  /*
   * ==========================================
   * VALIDASI ACCESS TOKEN
   * ==========================================
   *
   * getUser(token) memvalidasi token langsung
   * ke Supabase Auth server.
   */
  const {
    data: userData,
    error: userError,
  } =
    await supabase.auth.getUser(
      accessToken
    );

  if (
    userError ||
    !userData.user
  ) {
    console.error(
      "Auth sync getUser gagal:",
      userError
    );

    return noStore(
      {
        error:
          "Session browser tidak valid.",
      },
      401
    );
  }

  /*
   * ==========================================
   * SIMPAN SESSION KE COOKIE SSR
   * ==========================================
   */
  const {
    data: sessionData,
    error: sessionError,
  } =
    await supabase.auth.setSession({
      access_token:
        accessToken,

      refresh_token:
        refreshToken,
    });

  if (
    sessionError ||
    !sessionData.session
  ) {
    console.error(
      "Auth sync setSession gagal:",
      sessionError
    );

    return noStore(
      {
        error:
          sessionError?.message ||
          "Session tidak dapat disimpan.",
      },
      401
    );
  }

  /*
   * ==========================================
   * PASTIKAN USER SESSION SAMA
   * ==========================================
   */
  if (
    sessionData.user?.id !==
    userData.user.id
  ) {
    await supabase.auth
      .signOut();

    return noStore(
      {
        error:
          "Identitas session tidak sesuai.",
      },
      401
    );
  }

  /*
   * ==========================================
   * CEK MFA / AAL2
   * ==========================================
   */
  const {
    data: aal,
    error: aalError,
  } =
    await supabase.auth.mfa
      .getAuthenticatorAssuranceLevel();

  if (
    aalError ||
    aal?.currentLevel !==
      "aal2"
  ) {
    console.error(
      "Auth sync AAL gagal:",
      aalError,
      aal
    );

    return noStore(
      {
        error:
          "Session belum terverifikasi sebagai AAL2.",
      },
      403
    );
  }

  return noStore({
    ok: true,
    user_id:
      userData.user.id,
    aal: "aal2",
  });
}