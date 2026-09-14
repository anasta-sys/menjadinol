"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "password" | "otp" | "welcome";

export default function ReaderLoginClient() {
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("password");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");

  const [displayName, setDisplayName] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(10 * 60);

  useEffect(() => {
    if (mode !== "otp") return;

    const timer = window.setInterval(() => {
      setOtpSecondsLeft((current) =>
        current > 0 ? current - 1 : 0
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [mode]);

  const otpMinutes = Math.floor(otpSecondsLeft / 60);
  const otpSeconds = otpSecondsLeft % 60;
  const otpTimeLabel =
    `${String(otpMinutes).padStart(2, "0")}:${String(otpSeconds).padStart(2, "0")}`;

  /*
   * =========================================================
   * PASSWORD
   * =========================================================
   */
  async function handlePassword(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
      const normalizedEmail = email
        .trim()
        .toLowerCase();

      /*
       * 1. Verifikasi email + password.
       */
      const {
        data,
        error: loginError,
      } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (loginError) {
        const authMessage =
          loginError.message?.toLowerCase() ?? "";

        if (
          authMessage.includes("invalid login credentials") ||
          authMessage.includes("invalid credentials")
        ) {
          setMessage(
            "Email atau password tidak sesuai."
          );
          return;
        }

        if (
          authMessage.includes("email not confirmed")
        ) {
          setMessage(
            "Email belum dikonfirmasi. Silakan cek email kamu terlebih dahulu."
          );
          return;
        }

        setMessage(
          "Login gagal. Silakan coba kembali."
        );
        return;
      }

      if (!data.user) {
        throw new Error(
          "Akun pembaca tidak ditemukan."
        );
      }

      /*
       * Simpan nama untuk welcome screen.
       * Ini hanya untuk tampilan.
       * Hak akses tetap ditentukan server + cookie reader.
       */
      const metadataName =
        typeof data.user.user_metadata?.name ===
        "string"
          ? data.user.user_metadata.name.trim()
          : "";

      /*
       * 2. Cek whitelist reader_users.
       * Sekalian ambil name bila kolomnya tersedia.
       */
      const {
  data: reader,
  error: readerError,
} = await supabase
  .from("reader_users")
  .select("user_id,status,full_name")
  .eq("user_id", data.user.id)
  .maybeSingle();

if (
  readerError ||
  !reader ||
  reader.status !== "active"
) {
  await supabase.auth.signOut();

  throw new Error(
    "Akun ini belum memiliki izin membaca."
  );
}

      const readerName =
        typeof reader.full_name === "string"
          ? reader.full_name.trim()
          : "";

      setDisplayName(
        readerName ||
          metadataName ||
          normalizedEmail.split("@")[0] ||
          "Teman"
      );

      /*
       * 3. Minta SERVER mengirim OTP.
       * Secret Resend tetap berada di server.
       */
      const response = await fetch(
        "/api/reader/send-otp",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            email: normalizedEmail,
          }),
        }
      );

      const result = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "OTP gagal dikirim."
        );
      }

      setPassword("");
      setOtp("");
      setOtpSecondsLeft(10 * 60);
      setMode("otp");

      setMessage(
        "Kode OTP 6 digit telah dikirim ke email."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Login gagal."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * =========================================================
   * OTP
   * =========================================================
   */
  async function handleOtp(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading || otp.length !== 6 || otpSecondsLeft <= 0) return;

    setLoading(true);
    setMessage("");

    try {
      /*
       * Verifikasi OTP hanya SEKALI.
       *
       * Endpoint server:
       * - mengecek OTP
       * - mengecek expiry
       * - membuat reader access cookie
       */
      const response = await fetch(
        "/api/reader/complete-otp",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            otp,
          }),
        }
      );

      const result = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Kode OTP salah atau sudah kedaluwarsa."
        );
      }

      /*
       * Cookie akses sudah dibuat server.
       * Baru setelah itu welcome screen boleh muncul.
       */
      setOtp("");
      setMessage("");
      setMode("welcome");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Verifikasi OTP gagal."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * =========================================================
   * RESEND OTP
   * =========================================================
   */
  async function resendOtp() {
    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/reader/send-otp",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            email: email
              .trim()
              .toLowerCase(),
          }),
        }
      );

      const result = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "OTP gagal dikirim ulang."
        );
      }

      setOtp("");
      setOtpSecondsLeft(10 * 60);

      setMessage(
        "Kode OTP baru telah dikirim."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Gagal mengirim OTP."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * =========================================================
   * WELCOME -> WEBSITE
   * =========================================================
   */
  function enterWebsite() {
    /*
     * Full navigation supaya cookie reader
     * hasil OTP langsung dibaca oleh proxy/server.
     */
    window.location.replace("/");
  }

  return (
    <main className="reader-login-page">
      <section className="reader-login-shell">

        {/* =====================================================
            KIRI — LOGIN / OTP / WELCOME
        ====================================================== */}
        <div className="reader-login-left">

          <div className="reader-top-brand">
            <img
              src="/jalan-pulang-symbol.png"
              alt=""
            />

            <span className="reader-mobile-brand-copy">
              <strong>MENJADI NOL</strong>
              <small>Perjalanan pulang dalam diri</small>
            </span>
          </div>

          <div className="reader-login-content">

            {/* ================= PASSWORD ================= */}
            {mode === "password" && (
              <>
                <p className="reader-login-eyebrow">
                  RUANG PRIVAT
                </p>

                <h1>
                  Masuk ke akunmu
                </h1>

                <p className="reader-login-description">
                  Akses ruang refleksi dan perjalanan spiritualmu.
                </p>

                <form
                  className="reader-login-form"
                  onSubmit={handlePassword}
                >
                  <label>
                    Email

                    <input
                      type="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(
                          event.target.value
                        )
                      }
                      placeholder="Masukkan email kamu"
                      autoComplete="email"
                      inputMode="email"
                      required
                      disabled={loading}
                    />
                  </label>

                  <label>
                    Password

                    <div className="reader-password-wrap">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) =>
                          setPassword(
                            event.target.value
                          )
                        }
                        placeholder="Masukkan password"
                        autoComplete="current-password"
                        required
                        disabled={loading}
                      />

                      <button
                        type="button"
                        className="reader-password-eye"
                        onClick={() =>
                          setShowPassword(
                            (current) => !current
                          )
                        }
                        aria-label={
                          showPassword
                            ? "Sembunyikan password"
                            : "Tampilkan password"
                        }
                        aria-pressed={showPassword}
                        disabled={loading}
                      >
                        {showPassword ? (
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 4.2A10.8 10.8 0 0112 4c5.5 0 9 5 9 5a16.6 16.6 0 01-2.1 2.6M6.6 6.6C4.3 8 3 10 3 10s3.5 5 9 5a9.8 9.8 0 004-.8" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5z" />
                            <circle cx="12" cy="12" r="2.5" />
                          </svg>
                        )}
                      </button>
                    </div>

                    <div className="reader-forgot-row">
                      <a
                        href="/reader-forgot-password"
                        className="reader-forgot-password"
                      >
                        Lupa password?
                      </a>
                    </div>
                  </label>

                  {message && (
                    <div
                      className="reader-login-error"
                      role="alert"
                    >
                      {message}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="reader-primary-button"
                    disabled={loading}
                  >
                    {loading
                      ? "memeriksa..."
                      : "lanjut verifikasi"}
                    {!loading && (
                      <span>→</span>
                    )}
                  </button>

                  <div className="reader-or">
                    <span>atau</span>
                  </div>

                  <a
                    href="/reader-register"
                    className="reader-register-button"
                  >
                    Belum punya akun? Daftar
                  </a>
                </form>

                <div className="reader-login-privacy">
                  ♡ Akunmu aman bersama kami.
                  Hanya kamu yang bisa mengakses.
                </div>
              </>
            )}

            {/* ================= OTP ================= */}
            {mode === "otp" && (
              <>
                <p className="reader-login-eyebrow">
                  VERIFIKASI
                </p>

                <h1>
                  Masukkan kode OTP
                </h1>

                <p className="reader-login-description">
                  Kami telah mengirim kode
                  6 digit ke
                  <strong>
                    {" "}
                    {email}
                  </strong>
                  .
                </p>

                <div
                  aria-live="polite"
                  style={{
                    margin: "10px 0 16px",
                    fontSize: "13px",
                    opacity: .72,
                  }}
                >
                  {otpSecondsLeft > 0 ? (
                    <>
                      Kode berlaku selama{" "}
                      <strong>{otpTimeLabel}</strong>
                    </>
                  ) : (
                    <strong>
                      Kode sudah kedaluwarsa. Kirim ulang OTP.
                    </strong>
                  )}
                </div>

                <form
                  className="reader-login-form"
                  onSubmit={handleOtp}
                >
                  <label>
                    Kode OTP

                    <input
                      className="reader-otp-input"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={otp}
                      onChange={(event) =>
                        setOtp(
                          event.target.value
                            .replace(
                              /\D/g,
                              ""
                            )
                            .slice(0, 6)
                        )
                      }
                      placeholder="000000"
                      autoComplete="one-time-code"
                      required
                      disabled={loading}
                    />
                  </label>

                  {message && (
                    <div
                      className="reader-login-message"
                      role="status"
                    >
                      {message}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="reader-primary-button"
                    disabled={
                      loading ||
                      otp.length !== 6 ||
                      otpSecondsLeft <= 0
                    }
                  >
                    {loading
                      ? "memverifikasi..."
                      : "verifikasi & masuk"}

                    {!loading && (
                      <span>→</span>
                    )}
                  </button>

                  <button
                    type="button"
                    className="reader-secondary-button"
                    disabled={loading}
                    onClick={resendOtp}
                  >
                    {otpSecondsLeft <= 0
                      ? "kirim OTP baru"
                      : "kirim ulang OTP"}
                  </button>

                  <button
                    type="button"
                    className="reader-back-button"
                    disabled={loading}
                    onClick={() => {
                      setOtp("");
                      setMessage("");
                      setOtpSecondsLeft(10 * 60);
                      setMode("password");
                    }}
                  >
                    ← kembali
                  </button>
                </form>

                <div className="reader-login-privacy">
                  🔒 Email + Password + OTP
                  · Akses terbatas
                </div>
              </>
            )}

            {/* ================= WELCOME ================= */}
            {mode === "welcome" && (
              <div className="reader-welcome">
                <div className="reader-welcome-icon">
                  <img
                    src="/jalan-pulang-symbol.png"
                    alt=""
                  />
                </div>

                <p className="reader-login-eyebrow">
                  SELAMAT DATANG
                </p>

                <h1>
                  Selamat datang,
                  <br />
                  <span>
                    {displayName || "Teman"}
                  </span>
                </h1>

                <p className="reader-welcome-text">
                  Terima kasih telah hadir
                  di ruang ini.
                  Silakan jelajahi materi,
                  artikel, dan refleksi
                  yang tersedia.
                </p>

                <p className="reader-welcome-text">
                  Ambil waktu untuk berhenti,
                  merasa, memahami,
                  dan MENJADI NOL.
                </p>

                <button
                  type="button"
                  className="reader-primary-button"
                  onClick={enterWebsite}
                >
                  Mulai Menjelajah
                  <span>→</span>
                </button>

                <div className="reader-login-privacy">
                  ♡ Selamat menikmati ruangmu.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =====================================================
            KANAN — BRAND / LOGO
            Tidak mengubah fungsi login.
        ====================================================== */}
        <aside
          className="reader-login-right"
          aria-hidden="true"
        >
          <div className="reader-nature-layer" aria-hidden="true" />
          <div className="reader-login-right-glow" />

          <div className="reader-brand-center">
            <img
              src="/jalan-pulang-symbol.png"
              alt=""
              className="reader-main-symbol"
            />

            <h2>
              MENJADI NOL
            </h2>

            <div className="reader-brand-subtitle">
              Perjalanan pulang dalam diri
            </div>

            <div className="reader-brand-divider" />

            <p>
              Ruang untuk berhenti, merasa,
              <br />
              memahami, dan MENJADI NOL.
            </p>
          </div>

          <div className="reader-path" />
        </aside>

      </section>

      {/* =======================================================
          CSS LOKAL
          Jadi tidak mengubah UI halaman website yang lain.
      ======================================================== */}
      <style jsx>{`
        .reader-login-page {
        min-height: 100dvh;
        width: 100%;
        padding: 34px;

        display: flex;
        align-items: center;
        justify-content: center;

        overflow-x: hidden;
        box-sizing: border-box;

        background-image:
          linear-gradient(
          180deg,
        rgba(255, 253, 247, 0.68) 0%,
        rgba(249, 247, 239, 0.58) 48%,
        rgba(235, 242, 225, 0.72) 100%
        ),
        url("/menjadi-nol-nature.png");

        background-size: cover;
        background-position: center center;
        background-repeat: no-repeat;
      }

        .reader-login-shell {
          width: min(1180px, 100%);
          min-height: min(600px, calc(100dvh - 68px));

          display: grid;
          grid-template-columns:
            minmax(0, 0.92fr)
            minmax(0, 1.08fr);
          gap: 24px;

          overflow: visible;

          border: 0;
          border-radius: 0;

          background: transparent;

          box-shadow: none;
        }

        /* ================= LEFT ================= */

        .reader-login-left {
          order: 2;

          min-width: 0;
          min-height: 600px;
          padding: 56px 64px;

          display: flex;
          flex-direction: column;
          justify-content: center;

          box-sizing: border-box;

          border:
            1px solid
            rgba(82, 94, 78, 0.07);
          border-radius: 28px;

          background: #ffffff;

          box-shadow:
            0 24px 70px rgba(73, 68, 57, 0.08),
            0 3px 12px rgba(73, 68, 57, 0.035);
        }

        .reader-top-brand {
          display: none;
        }

        .reader-top-brand img {
          width: 26px;
          height: 26px;
          object-fit: contain;
        }
        .reader-mobile-brand-copy {
          display: grid;
          gap: 2px;
          color: #123b28;
        }
        .reader-mobile-brand-copy strong {
          font-size: 12px;
          letter-spacing: .18em;
          font-weight: 700;
        }
        .reader-mobile-brand-copy small {
          font-size: 9px;
          letter-spacing: .08em;
          color: #607265;
        }

        .reader-login-content {
          width: min(100%, 470px);
          margin: 0 auto;
        }

        .reader-login-eyebrow {
          margin:
            0
            0
            12px;

          color: #8c8f84;

          font-size: 11px;
          font-weight: 750;

          letter-spacing: 0.18em;
        }

        .reader-login-content h1 {
          margin: 0;

          color: #123b28;

          font-family:
            Georgia,
            "Times New Roman",
            serif;

          font-size:
            clamp(
              38px,
              3.35vw,
              50px
            );

          font-weight: 500;
          line-height: 1.08;

          letter-spacing: -0.035em;
        }

        .reader-login-content h1 span {
          color: #66745f;
        }

        .reader-login-description {
          max-width: 440px;

          margin:
            14px
            0
            30px;

          color: #6f766d;

          font-size: 14px;
          line-height: 1.7;
        }

        .reader-login-form {
          display: grid;
          gap: 18px;
        }

        .reader-login-form label {
          display: grid;
          gap: 8px;

          color: #414941;

          font-size: 12px;
          font-weight: 650;
        }

        .reader-login-form input {
          width: 100%;
          height: 53px;

          box-sizing: border-box;

          padding:
            0
            16px;

          border:
            1px solid #dedfd9;

          border-radius: 11px;

          outline: none;

          background: #ffffff;
          color: #303730;

          font: inherit;

          transition:
            border-color 160ms ease,
            box-shadow 160ms ease,
            background 160ms ease;
        }

        .reader-password-wrap {
          position: relative;
          width: 100%;
        }

        .reader-password-wrap input {
          padding-right: 52px;
        }

        .reader-password-eye {
          position: absolute;
          top: 50%;
          right: 12px;
          transform: translateY(-50%);
          width: 36px;
          height: 36px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: #7d857b;
          cursor: pointer;
        }

        .reader-password-eye svg {
          width: 20px;
          height: 20px;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.7;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .reader-password-eye:hover:not(:disabled) {
          color: #1d5d37;
          background: #f6f8f4;
        }

        .reader-password-eye:focus-visible {
          outline: 2px solid #78936b;
          outline-offset: 2px;
        }

        .reader-password-eye:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .reader-login-form input::placeholder {
          color: #a5a9a2;
        }

        .reader-login-form input:hover {
          border-color: #c9cdc4;
        }

        .reader-login-form input:focus {
          border-color: #2e7548;

          box-shadow:
            0
            0
            0
            4px
            rgba(46, 117, 72, 0.12);
        }

        .reader-login-form input:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .reader-otp-input {
          text-align: center;

          font-size: 25px !important;

          font-weight: 650 !important;

          letter-spacing: 0.3em;
        }

        .reader-primary-button {
          width: 100%;
          min-height: 53px;

          padding:
            0
            18px;

          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;

          border: 0;
          border-radius: 999px;

          cursor: pointer;

          background: linear-gradient(135deg, #78936b 0%, #91a783 100%);

          color: #ffffff;

          font-family: inherit;
          font-size: 13px;
          font-weight: 700;

          transition:
            transform 150ms ease,
            box-shadow 150ms ease,
            opacity 150ms ease;
        }

        .reader-primary-button span {
          margin-left: auto;
          font-size: 18px;
          line-height: 1;
        }

        .reader-primary-button:hover:not(:disabled) {
          transform: translateY(-1px);

          box-shadow:
            0
            10px
            24px
            rgba(51, 67, 54, 0.18);
        }

        .reader-primary-button:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .reader-secondary-button,
        .reader-back-button {
          width: 100%;
          min-height: 48px;

          border-radius: 11px;

          font-family: inherit;
          font-size: 12px;

          cursor: pointer;
        }

        .reader-secondary-button {
          border:
            1px solid #dedfd9;

          background: #ffffff;
          color: #536052;
        }

        .reader-back-button {
          border: 0;
          background: transparent;
          color: #858982;
        }

        .reader-secondary-button:disabled,
        .reader-back-button:disabled {
          opacity: 0.55;
          cursor: wait;
        }

        .reader-or {
          display: flex;
          align-items: center;
          gap: 12px;

          color: #a1a59d;

          font-size: 11px;
        }

        .reader-or::before,
        .reader-or::after {
          content: "";

          height: 1px;
          flex: 1;

          background: #ecece8;
        }

        .reader-register-button {
          width: 100%;
          min-height: 50px;

          box-sizing: border-box;

          display: flex;
          align-items: center;
          justify-content: center;

          border:
            1px solid #dfe3dc;

          border-radius: 999px;

          background: #ffffff;

          color: #1d5d37;

          font-size: 12px;
          font-weight: 600;

          text-decoration: none;

          transition:
            border-color 150ms ease,
            background 150ms ease;
        }

        .reader-register-button:hover {
          border-color: #cbd0c8;
          background: #fafbf9;
        }

        .reader-login-error,
        .reader-login-message {
          padding:
            11px
            13px;

          border-radius: 9px;

          font-size: 12px;
          line-height: 1.5;
        }

        .reader-login-error {
          border:
            1px solid #ecd4ce;

          background: #fff6f3;
          color: #9a5143;
        }

        .reader-login-message {
          border:
            1px solid #dbe4d8;

          background: #f5f8f3;
          color: #62705e;
        }

        .reader-login-privacy {
          margin-top: 25px;

          color: #969a92;

          font-size: 10.5px;
          line-height: 1.6;

          text-align: center;
        }

        /* ================= RIGHT ================= */

        .reader-login-right {
          order: 1;

          position: relative;

          min-width: 0;
          min-height: 600px;

          display: flex;
          align-items: center;
          justify-content: center;

          overflow: hidden;
          box-sizing: border-box;

          border:
            1px solid
            rgba(115, 105, 86, 0.12);
          border-radius: 28px;

          background-image:
            linear-gradient(
              180deg,
              rgba(255, 253, 247, 0.20) 0%,
              rgba(255, 250, 239, 0.16) 48%,
              rgba(232, 242, 226, 0.28) 100%
            ),
            url("/menjadi-nol-nature.png");

          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;

          box-shadow:
            0 24px 70px rgba(73, 68, 57, 0.07),
            0 3px 12px rgba(73, 68, 57, 0.03);
        }

        /*
         * Efek lembut seperti
         * lembah / pegunungan.
         * Pure CSS, jadi tidak butuh
         * file gambar baru.
         */
        .reader-login-right::before,
        .reader-login-right::after {
          right: -39%;

          transform:
            rotate(-10deg);
        }

        .reader-login-right::before {
          left: -39%;

          transform:
            rotate(10deg);
        }

        .reader-login-right::after {
          right: -26%;

          transform:
            rotate(-13deg);
        }
        .reader-nature-layer {
          position: absolute;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;

          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.10) 0%,
              rgba(255, 250, 238, 0.08) 48%,
              rgba(232, 242, 226, 0.18) 100%
            );
        }

        .reader-nature-layer::before {
          content: "";
          position: absolute;
          left: -12%;
          right: -12%;
          bottom: -6%;
          height: 48%;

          background:
            linear-gradient(
              155deg,
              transparent 0 18%,
              rgba(177, 192, 158, 0.13) 18% 37%,
              transparent 37% 43%,
              rgba(151, 174, 139, 0.12) 43% 63%,
              transparent 63%
            );

          filter: blur(1px);
        }

        .reader-nature-layer::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: -14%;
          width: 72px;
          height: 58%;
          transform: translateX(-50%) rotate(4deg);

          border-radius: 50%;

          background:
            linear-gradient(
              180deg,
              rgba(255, 252, 238, 0) 0%,
              rgba(255, 249, 224, 0.36) 38%,
              rgba(255, 246, 211, 0.88) 100%
            );

          filter: blur(3px);
        }


        .reader-login-right-glow {
          position: absolute;

          left: 50%;
          bottom: 11%;

          width: 430px;
          height: 250px;

          transform:
            translateX(-50%);

          border-radius: 50%;

          background:
            radial-gradient(
              circle,
              rgba(255, 244, 207, 0.58) 0%,
              rgba(255, 246, 219, 0.22) 48%,
              transparent 72%
            );

          filter: blur(18px);
        }

        .reader-brand-center {
          position: relative;
          z-index: 3;

          width: min(88%, 500px);

          padding:
            36px
            24px;

          box-sizing: border-box;

          text-align: center;

          color: #123b28;

          transform: translateY(-42px);
        }

        .reader-main-symbol {
          width:
            clamp(
              118px,
              10.5vw,
              150px
            );

          height: auto;

          object-fit: contain;

          filter:
            drop-shadow(
              0
              5px
              14px
              rgba(
                59,
                70,
                55,
                0.06
              )
            );
        }

        .reader-brand-center h2 {
          margin:
            18px
            0
            15px;

          font-family:
            Georgia,
            "Times New Roman",
            serif;

          font-size:
            clamp(
              36px,
              3.9vw,
              54px
            );

          font-weight: 500;

          letter-spacing: -0.035em;

          line-height: 1;
        }

        .reader-brand-subtitle {
          margin: -4px 0 18px;
          color: #2d5f43;
          font-size: 13px;
          letter-spacing: 0.18em;
          text-transform: none;
        }

        .reader-brand-divider {
          width: 26px;
          height: 1.5px;

          margin:
            0
            auto
            18px;

          background: #657262;
        }

        .reader-brand-center p {
          margin: 0;

          color: #5d675d;

          font-size:
            clamp(
              13px,
              1.2vw,
              15px
            );

          line-height: 1.75;
        }

        /*
         * Jalur kecil di bawah,
         * hanya dekoratif.
         */
        .reader-path {
          position: absolute;
          z-index: 2;

          bottom: -52px;
          left: 50%;

          width: 46px;
          height: 255px;

          transform:
            translateX(-50%)
            rotate(7deg);

          border-radius: 50%;

          background:
            linear-gradient(
              180deg,
              rgba(255, 251, 235, 0),
              rgba(255, 248, 222, 0.92)
            );

          filter: blur(1.8px);
        }

        /* ================= WELCOME ================= */

        .reader-welcome {
          width: 100%;

          text-align: center;
        }

        .reader-welcome-icon {
          width: 68px;
          height: 68px;

          margin:
            0
            auto
            20px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background:
            #eef0e8;
        }

        .reader-welcome-icon img {
          width: 40px;
          height: 40px;

          object-fit: contain;
        }

        .reader-welcome-text {
          max-width: 390px;

          margin:
            20px
            auto
            0;

          color: #747b73;

          font-size: 13px;
          line-height: 1.75;
        }

        .reader-welcome
          .reader-primary-button {
          margin-top: 27px;
        }

        /* =====================================================
           TABLET / IPAD
        ====================================================== */

        @media (max-width: 1024px) {
          .reader-login-page {
            padding: 20px;
          }

          .reader-login-shell {
            min-height:
              calc(100dvh - 40px);

            grid-template-columns:
              minmax(0, 0.95fr)
              minmax(0, 1.05fr);

            border-radius: 24px;
          }

          .reader-login-left {
            padding:
              34px
              34px
              30px;
          }

          .reader-login-content h1 {
            font-size: 36px;
          }

          .reader-brand-center {
            padding:
              30px
              18px;
          }

          .reader-brand-center h2 {
            font-size: 38px;
          }

          .reader-main-symbol {
            width: 100px;
          }

          .reader-login-shell {
            width: min(920px, 100%);
            grid-template-columns:
              minmax(0, 0.92fr)
              minmax(0, 1.08fr);
            gap: 18px;
          }

          .reader-login-left,
          .reader-login-right {
            min-height: 570px;
          }

          .reader-login-left {
            padding:
              42px
              38px;
          }

          .reader-brand-center {
            transform: translateY(-34px);
          }

          .reader-security-badges {
            bottom: -165px;
            gap: 6px;
          }

          .reader-security-badges span {
            padding:
              0
              9px;
            font-size: 9px;
          }
        }

        /* =====================================================
           HP
        ====================================================== */

        @media (max-width: 700px) {
          .reader-login-page {
            min-height: 100dvh;

            padding: 0;

            align-items: stretch;

            background: #ffffff;
          }

          .reader-login-shell {
            width: 100%;
            min-height: 100dvh;

            display: block;

            border: 0;
            border-radius: 0;

            box-shadow: none;
          }

          /*
           * Di HP sisi kanan disembunyikan
           * supaya form tidak sempit.
           * Brand tetap muncul di atas form.
           */
          .reader-login-right {
            display: none;
          }


          .reader-top-brand {
            display: flex;
            margin-bottom: 42px;
          }

          .reader-login-left {
            min-height: 100dvh;

            box-sizing: border-box;

            padding:
              max(
                24px,
                env(
                  safe-area-inset-top
                )
              )
              22px
              max(
                28px,
                env(
                  safe-area-inset-bottom
                )
              );
          }

          .reader-top-brand {
            margin-bottom: 48px;
          }

          .reader-login-content {
            width: 100%;
            margin: auto 0;
          }

          .reader-login-content h1 {
            font-size: 34px;
          }

          .reader-login-description {
            margin-bottom: 25px;
          }

          .reader-login-form {
            gap: 16px;
          }

          .reader-login-form input,
          .reader-primary-button {
            min-height: 52px;
          }

          .reader-welcome {
            padding:
              20px
              0;
          }

          .reader-welcome-icon {
            width: 62px;
            height: 62px;
          }
        }

        /* =====================================================
           HP KECIL
        ====================================================== */

        @media (max-width: 380px) {
          .reader-login-left {
            padding-left: 18px;
            padding-right: 18px;
          }

          .reader-top-brand {
            margin-bottom: 34px;
          }

          .reader-login-content h1 {
            font-size: 30px;
          }
        }

        /* =====================================================
           ACCESSIBILITY
        ====================================================== */

        @media (
          prefers-reduced-motion:
            reduce
        ) {
          .reader-primary-button,
          .reader-login-form input,
          .reader-register-button {
            transition: none;
          }
        }
      `}</style>
    </main>
  );
}