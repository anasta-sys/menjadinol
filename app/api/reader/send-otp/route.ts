import crypto from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import { Resend } from "resend";

import { createClient } from
  "@/lib/supabase/server";

import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";

import {
  READER_PASSWORD_COOKIE,
} from "@/lib/reader-access";


function hashOtp(
  userId: string,
  otp: string
) {
  const secret =
    process.env.READER_ACCESS_SECRET;

  if (!secret) {
    throw new Error(
      "READER_ACCESS_SECRET belum dikonfigurasi."
    );
  }

  return crypto
    .createHmac("sha256", secret)
    .update(`${userId}:${otp}`)
    .digest("hex");
}


export async function POST(
  request: NextRequest
) {
  try {

    /*
     * =====================================
     * CEK ENV SERVER
     * =====================================
     */

    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRole =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    const resendKey =
      process.env.RESEND_API_KEY;

    const fromEmail =
      process.env.OTP_FROM_EMAIL;

    const readerSecret =
      process.env.READER_ACCESS_SECRET;


    const missingEnv: string[] = [];


    if (!url) {
      missingEnv.push(
        "NEXT_PUBLIC_SUPABASE_URL"
      );
    }

    if (!serviceRole) {
      missingEnv.push(
        "SUPABASE_SERVICE_ROLE_KEY"
      );
    }

    if (!resendKey) {
      missingEnv.push(
        "RESEND_API_KEY"
      );
    }

    if (!fromEmail) {
      missingEnv.push(
        "OTP_FROM_EMAIL"
      );
    }

    if (!readerSecret) {
      missingEnv.push(
        "READER_ACCESS_SECRET"
      );
    }


    if (missingEnv.length > 0) {
      console.error(
        "Missing OTP env:",
        missingEnv
      );

      return NextResponse.json(
        {
          error:
            `Konfigurasi server OTP belum lengkap: ${missingEnv.join(", ")}`,
        },
        {
          status: 500,
        }
      );
    }


    /*
     * Setelah pengecekan di atas,
     * paksa TypeScript mengenali
     * nilai sebagai string.
     */

    const supabaseUrl =
      url as string;

    const supabaseServiceRole =
      serviceRole as string;

    const resendApiKey =
      resendKey as string;

    const otpFromEmail =
      fromEmail as string;


    /*
     * =====================================
     * CEK SESSION SUPABASE
     * =====================================
     */

    const supabase =
      await createClient();


    const {
      data: claimsData,
      error: claimsError,
    } =
      await supabase.auth.getClaims();


    const userId =
      claimsData?.claims?.sub as
        | string
        | undefined;


    const email =
      claimsData?.claims?.email as
        | string
        | undefined;


    if (
      claimsError ||
      !userId ||
      !email
    ) {
      return NextResponse.json(
        {
          error:
            "Sesi login tidak ditemukan. Silakan login kembali.",
        },
        {
          status: 401,
        }
      );
    }


    /*
     * =====================================
     * CEK AKUN READER
     * =====================================
     */

    const {
      data: reader,
      error: readerError,
    } =
      await supabase
        .from("reader_users")
        .select(
          "user_id,status"
        )
        .eq(
          "user_id",
          userId
        )
        .maybeSingle();


    if (readerError) {
      console.error(
        "Reader lookup error:",
        readerError
      );

      return NextResponse.json(
        {
          error:
            `Profil pembaca gagal diperiksa: ${readerError.message}`,
        },
        {
          status: 500,
        }
      );
    }


    if (
      !reader ||
      reader.status !== "active"
    ) {
      return NextResponse.json(
        {
          error:
            "Akun pembaca tidak aktif.",
        },
        {
          status: 403,
        }
      );
    }


    /*
     * =====================================
     * GENERATE OTP 6 DIGIT
     * =====================================
     */

    const otp =
      crypto
        .randomInt(
          100000,
          1000000
        )
        .toString();


    const otpHash =
      hashOtp(
        userId,
        otp
      );


    const expiresAt =
      new Date(
        Date.now() +
          10 * 60 * 1000
      );


    /*
     * =====================================
     * SUPABASE ADMIN CLIENT
     * =====================================
     */

    const admin =
      createAdminClient(
        supabaseUrl,
        supabaseServiceRole,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );


    /*
     * =====================================
     * HAPUS OTP LAMA
     * =====================================
     */

    const {
      error: deleteError,
    } =
      await admin
        .from(
          "reader_email_otps"
        )
        .delete()
        .eq(
          "user_id",
          userId
        )
        .is(
          "used_at",
          null
        );


    if (deleteError) {
      console.error(
        "OTP delete error:",
        {
          code:
            deleteError.code,

          message:
            deleteError.message,

          details:
            deleteError.details,

          hint:
            deleteError.hint,
        }
      );
    }


    /*
     * =====================================
     * SIMPAN OTP BARU
     * =====================================
     */

    const {
      error: insertError,
    } =
      await admin
        .from(
          "reader_email_otps"
        )
        .insert({
          user_id:
            userId,

          otp_hash:
            otpHash,

          expires_at:
            expiresAt.toISOString(),
        });


    if (insertError) {
      console.error(
        "OTP insert error:",
        {
          code:
            insertError.code,

          message:
            insertError.message,

          details:
            insertError.details,

          hint:
            insertError.hint,
        }
      );

      return NextResponse.json(
        {
          error:
            insertError.message ||
            "OTP gagal dibuat.",
        },
        {
          status: 500,
        }
      );
    }


    /*
     * =====================================
     * KIRIM OTP VIA RESEND
     * =====================================
     */

    const resend =
      new Resend(
        resendApiKey
      );


    const {
      error: emailError,
    } =
      await resend.emails.send({
        from:
          otpFromEmail,

        to: [
          email,
        ],

        subject:
          "Kode OTP Menjadi Nol",

        html: `
          <div
            style="
              font-family: Arial, sans-serif;
              max-width: 520px;
              margin: 0 auto;
              padding: 32px;
              color: #2f2c35;
            "
          >

            <h2>
              Kode Verifikasi
              Menjadi Nol
            </h2>

            <p>
              Gunakan kode berikut
              untuk melanjutkan
              proses masuk:
            </p>

            <div
              style="
                margin: 28px 0;
                padding: 18px;
                border-radius: 14px;
                background: #f6eef8;
                text-align: center;
                font-size: 34px;
                font-weight: 700;
                letter-spacing: 8px;
              "
            >
              ${otp}
            </div>

            <p>
              Kode berlaku selama
              10 menit dan hanya
              dapat digunakan
              satu kali.
            </p>

            <p
              style="
                color: #888;
                font-size: 12px;
              "
            >
              Jika kamu tidak
              meminta kode ini,
              abaikan email ini.
            </p>

          </div>
        `,
      });


    if (emailError) {
      console.error(
        "Resend OTP error:",
        emailError
      );

      return NextResponse.json(
        {
          error:
            emailError.message ||
            "Email OTP gagal dikirim.",
        },
        {
          status: 500,
        }
      );
    }


    /*
     * =====================================
     * PASSWORD STEP COOKIE
     * =====================================
     */

    const response =
      NextResponse.json({
        ok: true,
      });


    response.cookies.set(
      READER_PASSWORD_COOKIE,
      userId,
      {
        httpOnly:
          true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite:
          "lax",

        path:
          "/",

        maxAge:
          10 * 60,
      }
    );


    return response;


  } catch (error) {

    console.error(
      "Reader send OTP error:",
      error
    );


    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "OTP gagal dikirim.",
      },
      {
        status: 500,
      }
    );
  }
}