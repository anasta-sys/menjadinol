"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "loading" | "password" | "enroll" | "challenge" | "ready";


function TotpCountdown() {
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = 30 - (now % 30);
      setSecondsLeft(remaining === 0 ? 30 : remaining);
    };

    update();

    const timer = window.setInterval(
      update,
      250
    );

    return () =>
      window.clearInterval(timer);
  }, []);

  return (
    <div
      aria-live="polite"
      style={{
        marginTop: "8px",
        fontSize: "12px",
        opacity: 0.68,
      }}
    >
      Secure code berganti dalam{" "}
      <strong>{secondsLeft} detik</strong>
    </div>
  );
}

export default function LoginClient() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [mode,setMode] = useState<Mode>("loading");
  const [message,setMessage] = useState("");
  const [factorId,setFactorId] = useState("");
  const [qr,setQr] = useState("");
  const [showPassword,setShowPassword] = useState(false);

  async function syncSessionToServer() {
    const {
      data: sessionData,
      error: sessionError
    } = await supabase.auth.getSession();

    if (
      sessionError ||
      !sessionData.session
    ) {
      throw new Error("Session login tidak ditemukan.");
    }

    const response = await fetch("/auth/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token
      })
    });

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      throw new Error(
        result?.error ||
        "Session login belum tersinkron ke server."
      );
    }
  }

  async function determineAuthState() {
    setMessage("");

    const {
      data: userData,
      error: userError
    } = await supabase.auth.getUser();

    if (
      userError ||
      !userData.user
    ) {
      setMode("password");
      return;
    }

    const {
      data: aal,
      error: aalError
    } =
      await supabase.auth.mfa
        .getAuthenticatorAssuranceLevel();

    if (aalError) {
      setMode("password");
      setMessage(
        "Status keamanan akun tidak dapat diperiksa. Silakan login kembali."
      );
      return;
    }

    if (aal?.currentLevel === "aal2") {
      try {
        // FIX UTAMA:
        // browser session WAJIB disinkronkan ke cookie server
        // sebelum membuka /admin.
        await syncSessionToServer();

        setMode("ready");
        window.location.replace("/admin");
      } catch (error) {
        setMode("password");
        setMessage(
          error instanceof Error
            ? error.message
            : "Session login belum tersinkron."
        );
      }

      return;
    }

    const {
      data: factors,
      error: factorsError
    } =
      await supabase.auth.mfa.listFactors();

    if (factorsError) {
      setMessage(factorsError.message);
      return;
    }

    const verified =
      factors?.totp?.find(
        (factor) =>
          factor.status === "verified"
      );

    if (verified) {
      setFactorId(verified.id);
      setMode("challenge");
    } else {
      setMode("enroll");
    }
  }

  useEffect(() => {
    determineAuthState();
  }, []);

  async function login(formData:FormData) {
    setMessage("");

    const email = String(
      formData.get("email") || ""
    ).trim();

    const password = String(
      formData.get("password") || ""
    );

    const {error} =
      await supabase.auth.signInWithPassword({
        email,
        password
      });

    if(error) {
      setMessage("Email atau password tidak sesuai.");
      return;
    }

    await determineAuthState();
  }

  async function createMfa() {
    setMessage("");

    const {data,error} =
      await supabase.auth.mfa.enroll({
        factorType:"totp",
        friendlyName:"Jalan Pulang Admin"
      });

    if(error) {
      setMessage(error.message);
      return;
    }

    setFactorId(data.id);
    setQr(data.totp.qr_code);
  }

  /*
   * HANYA BAGIAN INI YANG DIPERBAIKI.
   * UI di bawah tidak diubah.
   */
  async function verifyMfa(formData:FormData) {
    setMessage("");

    const code = String(
      formData.get("code") || ""
    ).trim();

    if(!factorId) {
      setMessage(
        "MFA belum siap. Silakan login ulang."
      );
      return;
    }

    const {
      data:challenge,
      error:challengeError
    } =
      await supabase.auth.mfa.challenge({
        factorId
      });

    if(challengeError) {
      setMessage(challengeError.message);
      return;
    }

    const {
      error:verifyError
    } =
      await supabase.auth.mfa.verify({
        factorId,
        challengeId:challenge.id,
        code
      });

    if(verifyError) {
      setMessage(
        "Kode authenticator tidak sesuai."
      );
      return;
    }

    /*
     * Pastikan MFA benar-benar sudah menjadi AAL2.
     */
    const {
      data:aal,
      error:aalError
    } =
      await supabase.auth.mfa
        .getAuthenticatorAssuranceLevel();

    if(
      aalError ||
      aal?.currentLevel !== "aal2"
    ) {
      setMessage(
        "Verifikasi MFA berhasil, tetapi sesi keamanan belum aktif. Silakan coba lagi."
      );
      return;
    }

    try {
      await syncSessionToServer();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Session MFA belum tersinkron. Silakan coba lagi."
      );
      return;
    }

    setMode("ready");

    /*
     * Full navigation supaya /admin membaca
     * cookie/session server terbaru.
     */
    window.location.replace("/admin");
  }

  if(mode === "loading" || mode === "ready") {
    return (
      <div className="proper-login-card loading-card">
        <div className="loading-dot"/>
        <p>Memeriksa sesi aman…</p>
      </div>
    );
  }

  return (
    <div className="proper-login-layout">
      <section className="proper-login-visual">
        <div className="login-symbol-wrap">
          <img
            src="/jalan-pulang-symbol.png"
            alt=""
            aria-hidden="true"
          />
        </div>

        <div className="login-wordmark">
          Jalan Pulang
        </div>

        <div className="login-tagline">
          kembali ke nol
        </div>

        <p>
          Ruang admin pribadi untuk merawat
          catatan perjalanan dengan aman.
        </p>

        <div className="login-security-list">
          <span>Supabase Auth</span>
          <span>RLS</span>
          <span>MFA / TOTP</span>
        </div>
      </section>

      <section className="proper-login-card">

        {mode === "password" && (
          <>
            <p className="eyebrow">
              admin / penulis
            </p>

            <h1>
              Selamat datang kembali.
            </h1>

            <p className="login-help">
              Masuk menggunakan akun Admin atau Penulis
              Jalan Pulang.
            </p>

            <form
              action={login}
              className="proper-login-form"
            >
              <label>
                Email

                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nama@email.com"
                  required
                />
              </label>

              <label>
                Password

                <div
                  style={{
                    position: "relative",
                    marginTop: "6px",
                  }}
                >
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    minLength={10}
                    placeholder="••••••••••"
                    required
                    style={{
                      marginTop: 0,
                      paddingRight: "48px",
                    }}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((current) => !current)
                    }
                    aria-label={
                      showPassword
                        ? "Sembunyikan password"
                        : "Tampilkan password"
                    }
                    title={
                      showPassword
                        ? "Sembunyikan password"
                        : "Tampilkan password"
                    }
                    style={{
                      position: "absolute",
                      top: "50%",
                      right: "12px",
                      transform: "translateY(-50%)",
                      width: "30px",
                      height: "30px",
                      display: "grid",
                      placeItems: "center",
                      padding: 0,
                      border: 0,
                      borderRadius: "50%",
                      background: "transparent",
                      color: "#667067",
                      cursor: "pointer",
                      fontSize: "17px",
                      lineHeight: 1,
                    }}
                  >
                    {showPassword ? "◉" : "◎"}
                  </button>
                </div>
              </label>

              <div
                style={{
                  marginTop: "-6px",
                  textAlign: "right",
                }}
              >
                <a
                  href="/reader-forgot-password"
                  style={{
                    color: "#5f745f",
                    fontSize: "12px",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  Lupa password?
                </a>
              </div>

              <button
                className="login-submit"
                type="submit"
              >
                masuk dengan aman
              </button>
            </form>
          </>
        )}

        {mode === "enroll" && (
          <>
            <p className="eyebrow">
              security setup
            </p>

            <h1>
              Aktifkan MFA.
            </h1>

            <p className="login-help">
              Admin wajib menggunakan
              autentikasi dua faktor sebelum
              dashboard dibuka.
            </p>

            {!qr && (
              <button
                className="login-submit"
                type="button"
                onClick={createMfa}
              >
                buat QR authenticator
              </button>
            )}

            {qr && (
              <>
                <div className="qr-box">
                  <img
                    src={qr}
                    alt="QR code MFA Jalan Pulang"
                  />
                </div>

                <form
                  action={verifyMfa}
                  className="proper-login-form"
                >
                  <label>
                    Kode 6 digit

                    <input
                      name="code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      placeholder="123456"
                      required
                    />
                  </label>

                  <TotpCountdown />

                  <button
                    className="login-submit"
                    type="submit"
                  >
                    aktifkan dan lanjutkan
                  </button>
                </form>
              </>
            )}
          </>
        )}

        {mode === "challenge" && (
          <>
            <p className="eyebrow">
              two-factor authentication
            </p>

            <h1>
              Verifikasi keamanan.
            </h1>

            <p className="login-help">
              Masukkan kode 6 digit dari
              aplikasi authenticator.
            </p>

            <form
              action={verifyMfa}
              className="proper-login-form"
            >
              <label>
                Kode authenticator

                <input
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="123456"
                  required
                  autoFocus
                />
              </label>

              <TotpCountdown />

              <button
                className="login-submit"
                type="submit"
              >
                verifikasi dan masuk
              </button>
            </form>
          </>
        )}

        {message && (
          <div
            className="login-error"
            role="alert"
          >
            {message}
          </div>
        )}

        <p className="login-privacy">
          Tidak ada password atau secret key
          yang disimpan di frontend.
        </p>
      </section>
    </div>
  );
}