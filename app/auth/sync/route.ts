import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createClient } from
  "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest
) {
  const origin =
    request.headers.get("origin");

  const host =
    request.headers.get("host");

  /*
   * Hanya izinkan request dari website yang sama.
   */
  if (origin && host) {
    try {
      if (
        new URL(origin).host !== host
      ) {
        return NextResponse.json(
          {
            error:
              "Origin tidak diizinkan.",
          },
          {
            status: 403,
            headers: {
              "Cache-Control":
                "no-store",
            },
          }
        );
      }
    } catch {
      return NextResponse.json(
        {
          error:
            "Origin tidak valid.",
        },
        {
          status: 403,
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }
  }

  let body: unknown;

  try {
    body =
      await request.json();
  } catch {
    return NextResponse.json(
      {
        error:
          "Request tidak valid.",
      },
      {
        status: 400,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
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
    return NextResponse.json(
      {
        error:
          "Token session tidak lengkap.",
      },
      {
        status: 400,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  const supabase =
    await createClient();

  /*
   * Simpan session browser ke cookie SSR Next.js.
   * Ini yang dibutuhkan /admin setelah MFA selesai.
   */
  const {
    data: sessionData,
    error: sessionError,
  } =
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

  if (
    sessionError ||
    !sessionData.session
  ) {
    return NextResponse.json(
      {
        error:
          sessionError?.message ??
          "Session tidak dapat disimpan.",
      },
      {
        status: 401,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  /*
   * Login Admin/Penulis memang harus sudah MFA AAL2.
   */
  const {
    data: aalData,
    error: aalError,
  } =
    await supabase.auth.mfa
      .getAuthenticatorAssuranceLevel(
        sessionData.session
          .access_token
      );

  if (
    aalError ||
    aalData?.currentLevel !==
      "aal2"
  ) {
    await supabase.auth.signOut();

    return NextResponse.json(
      {
        error:
          "Session belum terverifikasi sebagai AAL2.",
      },
      {
        status: 403,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  return NextResponse.json(
    {
      ok: true,
    },
    {
      status: 200,
      headers: {
        "Cache-Control":
          "private, no-store, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
