import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const dynamic =
  "force-dynamic";

function json(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        "Cache-Control":
          "private, no-store, max-age=0",
      },
    }
  );
}

export async function POST(
  request: NextRequest
) {
  let body: unknown;

  try {
    body =
      await request.json();
  } catch {
    return json(
      {
        error:
          "Permintaan tidak valid.",
      },
      400
    );
  }

  const payload =
    body as {
      email?: unknown;
    };

  const email =
    typeof payload.email ===
    "string"
      ? payload.email
          .trim()
          .toLowerCase()
      : "";

  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  ) {
    return json({
      ok: true,
    });
  }

  try {
    const supabase =
      createAdminClient();

    const {
      data,
      error,
    } =
      await supabase
        .auth
        .admin
        .generateLink({
          type: "recovery",
          email,
        });

    if (
      error ||
      !data?.user?.id ||
      !data.properties
        ?.hashed_token
    ) {
      return json({
        ok: true,
      });
    }

    const {
      data: profile,
    } =
      await supabase
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
      return json({
        ok: true,
      });
    }

    const tokenHash =
      data.properties
        .hashed_token;

    const baseUrl =
      request.headers
        .get("origin") ??
      process.env
        .NEXT_PUBLIC_SITE_URL ??
      "http://localhost:3000";

    const recoveryLink =
      `${baseUrl}/auth/admin-recovery` +
      `?token_hash=${encodeURIComponent(
        tokenHash
      )}`;

    const resendKey =
      process.env
        .RESEND_API_KEY;

    const from =
      process.env
        .OTP_FROM_EMAIL;

    if (
      !resendKey ||
      !from
    ) {
      return json(
        {
          error:
            "Layanan email sedang tidak tersedia.",
        },
        500
      );
    }

    const response =
      await fetch(
        "https://api.resend.com/emails",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${resendKey}`,

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              from,

              to: [email],

              subject:
                "Buat password baru — Menjadi Nol Admin",

              html: `
                <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#344237">

                  <h2 style="color:#29412f">
                    Buat password baru
                  </h2>

                  <p style="line-height:1.7">
                    Kami menerima permintaan
                    untuk mengganti password
                    akun Admin Menjadi Nol.
                  </p>

                  <p style="margin:28px 0">
                    <a
                      href="${recoveryLink}"
                      style="display:inline-block;padding:14px 24px;border-radius:999px;background:#78936b;color:#fff;text-decoration:none;font-weight:600"
                    >
                      Buat Password Baru
                    </a>
                  </p>

                  <p style="font-size:13px;color:#747b73">
                    Jika kamu tidak meminta
                    perubahan password,
                    abaikan email ini.
                  </p>

                </div>
              `,
            }),
        }
      );

    if (!response.ok) {
      return json(
        {
          error:
            "Email reset belum dapat dikirim.",
        },
        500
      );
    }

    return json({
      ok: true,
    });
  } catch (error) {
    console.error(
      "Admin forgot password:",
      error
    );

    return json({
      ok: true,
    });
  }
}