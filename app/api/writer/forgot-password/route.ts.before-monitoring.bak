import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Permintaan tidak valid." }, 400);
  }

  const payload = body as { email?: unknown };

  const email =
    typeof payload.email === "string"
      ? payload.email.trim().toLowerCase()
      : "";

  if (
    !email ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    // Tetap generik agar status akun tidak bocor.
    return json({ ok: true });
  }

  try {
    const supabase = createAdminClient();

    const { data, error } =
      await supabase.auth.admin.generateLink({
        type: "recovery",
        email,
      });

    if (
      error ||
      !data?.user?.id ||
      !data?.properties?.hashed_token
    ) {
      console.error("Generate writer recovery link gagal:", error);
      return json({ ok: true });
    }

    // Pastikan email tersebut benar-benar akun WRITER.
    const { data: profile, error: profileError } =
      await supabase
        .from("admin_users")
        .select("user_id,role")
        .eq("user_id", data.user.id)
        .maybeSingle();

    if (
      profileError ||
      !profile ||
      profile.role !== "writer"
    ) {
      if (profileError) {
        console.error(
          "Writer role check gagal:",
          profileError
        );
      }

      // Jangan bocorkan apakah email ada / role-nya apa.
      return json({ ok: true });
    }

    const tokenHash = data.properties.hashed_token;

    const baseUrl =
      origin ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      "http://localhost:3000";

    const recoveryLink =
      `${baseUrl}/auth/writer-recovery` +
      `?token_hash=${encodeURIComponent(tokenHash)}`;

    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.OTP_FROM_EMAIL;

    if (!resendKey || !from) {
      console.error(
        "RESEND_API_KEY atau OTP_FROM_EMAIL belum tersedia."
      );

      return json(
        { error: "Layanan email sedang tidak tersedia." },
        500
      );
    }

    const resendResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject: "Buat password baru — Menjadi Nol Penulis",
          html: `
            <div style="
              font-family: Arial, sans-serif;
              max-width: 560px;
              margin: 0 auto;
              padding: 32px;
              color: #344237;
            ">
              <h2 style="
                margin: 0 0 18px;
                color: #29412f;
              ">
                Buat password baru
              </h2>

              <p style="
                line-height: 1.7;
                margin-bottom: 24px;
              ">
                Kami menerima permintaan untuk mengganti
                password akun penulis Menjadi Nol.
              </p>

              <p style="margin: 28px 0;">
                <a
                  href="${recoveryLink}"
                  style="
                    display: inline-block;
                    padding: 14px 24px;
                    border-radius: 999px;
                    background: #78936b;
                    color: #ffffff;
                    text-decoration: none;
                    font-weight: 600;
                  "
                >
                  Buat Password Baru
                </a>
              </p>

              <p style="
                margin-top: 28px;
                color: #747b73;
                font-size: 13px;
                line-height: 1.7;
              ">
                Jika kamu tidak meminta perubahan password,
                abaikan email ini.
              </p>

              <p style="
                margin-top: 32px;
                color: #969a92;
                font-size: 12px;
              ">
                Menjadi Nol
              </p>
            </div>
          `,
        }),
      }
    );

    if (!resendResponse.ok) {
      const resendError =
        await resendResponse.text().catch(() => "");

      console.error(
        "Resend writer recovery email gagal:",
        resendResponse.status,
        resendError
      );

      return json(
        { error: "Email reset belum dapat dikirim." },
        500
      );
    }

    return json({ ok: true });
  } catch (error) {
    console.error("Writer forgot password gagal:", error);

    // Tetap generik agar email enumeration tidak terjadi.
    return json({ ok: true });
  }
}
