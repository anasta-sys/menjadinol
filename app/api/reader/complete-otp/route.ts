import crypto from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";

import { createClient } from
  "@/lib/supabase/server";

import {
  createReaderAccessToken,
  getReaderAccessCookieOptions,
  hashReaderSessionId,
  READER_ACCESS_COOKIE,
  READER_ACCESS_MAX_AGE,
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

function safeEqualHex(
  left: string,
  right: string
) {
  try {
    const a = Buffer.from(left, "hex");
    const b = Buffer.from(right, "hex");

    return (
      a.length === b.length &&
      crypto.timingSafeEqual(a, b)
    );
  } catch {
    return false;
  }
}


function parseDeviceInfo(
  userAgent: string
) {
  const ua = userAgent || "";

  let device = "Desktop / Laptop";
  let os = "Unknown OS";
  let browser = "Unknown browser";

  if (/iPad/i.test(ua)) {
    device = "iPad";
  } else if (/iPhone/i.test(ua)) {
    device = "iPhone";
  } else if (/Android/i.test(ua)) {
    const modelMatch = ua.match(
      /Android[^;]*;\s*([^;)]+?)(?:\s+Build\/|;|\))/i
    );

    const model = modelMatch?.[1]
      ?.replace(/^wv\s*/i, "")
      .trim();

    device = model
      ? `Android · ${model}`
      : "Android";
  } else if (/Windows/i.test(ua)) {
    device = "Windows PC";
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    device = "Mac";
  } else if (/Linux/i.test(ua)) {
    device = "Linux PC";
  }

  const android = ua.match(/Android\s+([\d.]+)/i);
  const ios = ua.match(/OS\s([\d_]+)\slike\sMac\sOS\sX/i);

  if (android?.[1]) {
    os = `Android ${android[1]}`;
  } else if (/iPhone|iPad/i.test(ua) && ios?.[1]) {
    os = `iOS ${ios[1].replace(/_/g, ".")}`;
  } else if (/Windows NT/i.test(ua)) {
    os = "Windows";
  } else if (/Mac OS X/i.test(ua)) {
    const mac = ua.match(/Mac OS X\s([\d_]+)/i);
    os = mac?.[1]
      ? `macOS ${mac[1].replace(/_/g, ".")}`
      : "macOS";
  } else if (/Linux/i.test(ua)) {
    os = "Linux";
  }

  const samsung = ua.match(/SamsungBrowser\/([\d.]+)/i);
  const edge = ua.match(/EdgA?\/([\d.]+)/i);
  const firefox = ua.match(/Firefox\/([\d.]+)/i);
  const chrome = ua.match(/(?:Chrome|CriOS)\/([\d.]+)/i);
  const safari = ua.match(/Version\/([\d.]+).*Safari/i);

  if (samsung?.[1]) {
    browser = `Samsung Internet ${samsung[1]}`;
  } else if (edge?.[1]) {
    browser = `Microsoft Edge ${edge[1]}`;
  } else if (firefox?.[1]) {
    browser = `Firefox ${firefox[1]}`;
  } else if (chrome?.[1]) {
    browser = `Chrome ${chrome[1]}`;
  } else if (safari?.[1]) {
    browser = `Safari ${safari[1]}`;
  }

  return {
    device: device.slice(0, 160),
    os: os.slice(0, 120),
    browser: browser.slice(0, 120),
  };
}

export async function POST(
  request: NextRequest
) {
  try {
    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRole =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRole) {
      return NextResponse.json(
        {
          error:
            "Konfigurasi server belum lengkap.",
        },
        { status: 500 }
      );
    }

    const body =
      await request
        .json()
        .catch(() => null);

    const otp =
      String(body?.otp ?? "").trim();

    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        {
          error:
            "Kode OTP harus 6 digit.",
        },
        { status: 400 }
      );
    }

    /*
     * 1. Pastikan password login Supabase
     *    masih punya session yang valid.
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
        { status: 401 }
      );
    }

    /*
     * 2. Pastikan tahap password memang
     *    sudah melewati send-otp.
     */
    const passwordVerified =
      request.cookies.get(
        READER_PASSWORD_COOKIE
      )?.value;

    if (
      !passwordVerified ||
      passwordVerified !== userId
    ) {
      return NextResponse.json(
        {
          error:
            "Verifikasi password telah kedaluwarsa. Silakan login kembali.",
        },
        { status: 401 }
      );
    }

    const admin =
      createAdminClient(
        url,
        serviceRole,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );

    /*
     * 3. Cek akun reader dari server.
     */
    const {
      data: reader,
      error: readerError,
    } =
      await admin
        .from("reader_users")
        .select(
          "user_id,is_active,status,name"
        )
        .eq("user_id", userId)
        .maybeSingle();

    if (readerError) {
      console.error(
        "Reader lookup error:",
        readerError
      );

      return NextResponse.json(
        {
          error:
            "Profil pembaca gagal diperiksa.",
        },
        { status: 500 }
      );
    }

    if (
      !reader ||
      !reader.is_active ||
      reader.status === "blocked"
    ) {
      return NextResponse.json(
        {
          error:
            "Akun pembaca tidak aktif.",
        },
        { status: 403 }
      );
    }

    /*
     * 4. Ambil OTP aktif terbaru.
     */
    const {
      data: otpRow,
      error: otpLookupError,
    } =
      await admin
        .from("reader_email_otps")
        .select(
          "otp_hash,expires_at"
        )
        .eq("user_id", userId)
        .is("used_at", null)
        .gt(
          "expires_at",
          new Date().toISOString()
        )
        .order(
          "expires_at",
          { ascending: false }
        )
        .limit(1)
        .maybeSingle();

    if (otpLookupError) {
      console.error(
        "OTP lookup error:",
        otpLookupError
      );

      return NextResponse.json(
        {
          error:
            "OTP gagal diperiksa.",
        },
        { status: 500 }
      );
    }

    if (!otpRow) {
      return NextResponse.json(
        {
          error:
            "Kode OTP sudah kedaluwarsa. Silakan minta kode baru.",
        },
        { status: 401 }
      );
    }

    const expectedHash =
      hashOtp(userId, otp);

    if (
      !safeEqualHex(
        expectedHash,
        String(otpRow.otp_hash)
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Kode OTP salah atau sudah kedaluwarsa.",
        },
        { status: 401 }
      );
    }

    /*
     * 5. Tandai OTP sebagai terpakai.
     *    Update memakai hash supaya hanya
     *    OTP yang barusan cocok yang ditandai.
     */
    const {
      error: otpUseError,
    } =
      await admin
        .from("reader_email_otps")
        .update({
          used_at:
            new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq(
          "otp_hash",
          String(otpRow.otp_hash)
        )
        .is("used_at", null);

    if (otpUseError) {
      console.error(
        "OTP mark-used error:",
        otpUseError
      );

      return NextResponse.json(
        {
          error:
            "OTP gagal diselesaikan.",
        },
        { status: 500 }
      );
    }

    /*
     * 6. SINGLE SESSION:
     *    buat sessionId baru.
     *
     *    Karena user_id adalah PRIMARY KEY,
     *    upsert ini menimpa sesi lama.
     *    Device lama langsung tidak valid.
     */
    const sessionId =
      crypto.randomUUID();

    const sessionHash =
      await hashReaderSessionId(
        sessionId
      );

    const expiresAt =
      new Date(
        Date.now() +
          READER_ACCESS_MAX_AGE *
            1000
      );

    const {
      error: sessionError,
    } =
      await admin
        .from(
          "reader_active_sessions"
        )
        .upsert(
          {
            user_id: userId,
            session_hash:
              sessionHash,
            created_at:
              new Date().toISOString(),
            last_seen_at:
              new Date().toISOString(),
            expires_at:
              expiresAt.toISOString(),
          },
          {
            onConflict: "user_id",
          }
        );

    if (sessionError) {
      console.error(
        "Reader session upsert error:",
        sessionError
      );

      return NextResponse.json(
        {
          error:
            "Sesi pembaca gagal dibuat.",
        },
        { status: 500 }
      );
    }

    /*
     * 7. Catat login berhasil.
     *
     * Riwayat dibuat SETELAH password + OTP
     * valid dan sesi single-device berhasil dibuat.
     * Jadi percobaan login gagal tidak ikut tercatat.
     */
    const userAgent =
      request.headers.get("user-agent") ?? "";

    const deviceInfo =
      parseDeviceInfo(userAgent);

    const readerName =
      typeof reader.name === "string"
        ? reader.name.trim().slice(0, 160)
        : null;

    const {
      error: historyError,
    } =
      await admin
        .from("reader_login_history")
        .insert({
          user_id: userId,
          email:
            email.toLowerCase().slice(0, 320),
          reader_name: readerName,
          device: deviceInfo.device,
          os: deviceInfo.os,
          browser: deviceInfo.browser,
        });

    /*
     * Logging tidak boleh menggagalkan login.
     * Error cukup dicatat di server log.
     */
    if (historyError) {
      console.error(
        "Reader login history insert error:",
        historyError
      );
    }

    /*
     * 8. Cookie HMAC menyimpan sessionId
     *    mentah. Database hanya menyimpan
     *    hash-nya.
     */
    const accessToken =
      await createReaderAccessToken({
        userId,
        email,
        sessionId,
      });

    const response =
      NextResponse.json({
        ok: true,
      });

    response.cookies.set(
      READER_ACCESS_COOKIE,
      accessToken,
      getReaderAccessCookieOptions()
    );

    response.cookies.delete(
      READER_PASSWORD_COOKIE
    );

    return response;
  } catch (error) {
    console.error(
      "complete reader OTP failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Verifikasi reader gagal.",
      },
      { status: 500 }
    );
  }
}
