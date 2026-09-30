"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import { createClient } from "@/lib/supabase/client";

export default function ReaderRegisterClient() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

    setMessage("");
    setSuccess(false);

    const normalizedName =
      name.trim();

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    if (
      normalizedName.length < 2
    ) {
      setMessage(
        "Nama minimal 2 karakter."
      );
      return;
    }

    if (
      normalizedName.length > 100
    ) {
      setMessage(
        "Nama terlalu panjang."
      );
      return;
    }

    if (
      !normalizedEmail ||
      normalizedEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail
      )
    ) {
      setMessage(
        "Masukkan alamat email yang valid."
      );
      return;
    }

    if (password.length < 8) {
      setMessage(
        "Password minimal 8 karakter."
      );
      return;
    }

    if (password.length > 128) {
      setMessage(
        "Password terlalu panjang."
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setMessage(
        "Konfirmasi password tidak sama."
      );
      return;
    }

    setLoading(true);

    try {
      const {
        data,
        error,
      } =
        await supabase.auth.signUp({
          email:
            normalizedEmail,

          password,

          options: {
            data: {
              name:
                normalizedName,

              role:
                "reader",
            },

            emailRedirectTo:
              `${window.location.origin}/reader-login`,
          },
        });

      if (error) {
        console.error(
          "Reader register error:",
          error
        );

        throw new Error(
          error.message
        );
      }

      /*
       * Jangan buat reader_users
       * dari browser.
       *
       * Profile reader dikelola
       * server/database trigger.
       */

      setSuccess(true);

      setMessage(
        "Pendaftaran berhasil. Silakan cek email untuk memverifikasi akunmu."
      );

      /*
       * Bersihkan password dari state
       * setelah request berhasil.
       */
      setPassword("");
      setConfirmPassword("");

      /*
       * data.user boleh tersedia,
       * tetapi tidak digunakan sebagai
       * bukti bahwa user sudah mendapat
       * akses membaca.
       *
       * Akses tetap ditentukan pada
       * proses login + server.
       */
      void data;
    } catch (error) {
      setSuccess(false);

      setMessage(
        error instanceof Error
          ? error.message
          : "Pendaftaran belum berhasil."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="reg-page">
      <section className="reg-shell">
        <div className="reg-form-panel">
          <div className="reg-top-brand">
            <img src="/jalan-pulang-symbol.png" alt="" />
            <span className="reg-mobile-brand-copy">
              <strong>MENJADI NOL</strong>
              <small>Perjalanan pulang dalam diri</small>
            </span>
          </div>

          <div className="reg-content">
            {!success ? (
              <>
                <a className="reg-back-home" href="/">← Kembali ke Beranda</a>
                <p className="reg-eyebrow">MULAI PERJALANAN</p>
                <h1>Buat Akun Pembaca</h1>
                <p className="reg-description">Mulai perjalananmu bersama Menjadi Nol.</p>

                <form className="reg-form" onSubmit={handleSubmit}>
                  <label>Nama lengkap
                    <input type="text" value={name} onChange={(e)=>setName(e.target.value)}
                      placeholder="Masukkan nama lengkap" autoComplete="name" maxLength={120} required disabled={loading}/>
                  </label>
                  <label>Email
                    <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)}
                      placeholder="Masukkan email kamu" autoComplete="email" required disabled={loading}/>
                  </label>
                  <label>Password
                    <div className="reg-password-wrap">
                      <input type={showPassword ? "text" : "password"} value={password}
                        onChange={(e)=>setPassword(e.target.value)} placeholder="Buat password"
                        autoComplete="new-password" minLength={8} maxLength={128} required disabled={loading}/>
                      <button type="button" className="reg-password-eye" onClick={()=>setShowPassword(v=>!v)} aria-label="Tampilkan password">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5z"/><circle cx="12" cy="12" r="2.5"/></svg>
                      </button>
                    </div>
                  </label>
                  <label>Konfirmasi password
                    <div className="reg-password-wrap">
                      <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword}
                        onChange={(e)=>setConfirmPassword(e.target.value)} placeholder="Ulangi password"
                        autoComplete="new-password" minLength={8} maxLength={128} required disabled={loading}/>
                      <button type="button" className="reg-password-eye" onClick={()=>setShowConfirmPassword(v=>!v)} aria-label="Tampilkan konfirmasi password">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5z"/><circle cx="12" cy="12" r="2.5"/></svg>
                      </button>
                    </div>
                  </label>
                  {message && <div className="reg-error" role="alert">{message}</div>}
                  <button type="submit" className="reg-primary-button" disabled={loading}>
                    {loading ? "mendaftarkan..." : "daftar"} {!loading && <span>→</span>}
                  </button>
                  <div className="reg-or"><span>atau</span></div>
                  <a href="/reader-login" className="reg-register-button">Sudah punya akun? Masuk</a>
                </form>
                <div className="reg-privacy">♡ Akunmu aman bersama kami. Hanya kamu yang bisa mengakses.</div>
              </>
            ) : (
              <div className="reg-success">
                <div className="reg-success-mark">✓</div>
                <p className="reg-eyebrow">PENDAFTARAN BERHASIL</p>
                <h1>Cek email kamu</h1>
                <p className="reg-description">{message}</p>
                <a href="/reader-login" className="reg-register-button">Ke halaman login</a>
              </div>
            )}
          </div>
        </div>

        <aside className="reg-brand-panel" aria-hidden="true">
          <div className="reg-nature-layer" aria-hidden="true" />
          <div className="reg-brand-glow" />
          <div className="reg-brand-center">
            <img src="/jalan-pulang-symbol.png" alt="" className="reg-main-symbol" />
            <h2>MENJADI NOL</h2>
            <div className="reg-brand-subtitle">Perjalanan pulang dalam diri</div>
            <div className="reg-brand-divider" />
            <p>Setiap langkah kecil adalah bagian<br/>dari perjalanan besar.</p>
          </div>
          <div className="reg-path" />
        </aside>
      </section>
      <style jsx>{`
        .reg-page {
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

        .reg-shell {
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

        .reg-form-panel {
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

        .reg-top-brand {
          display: none;
        }

        .reg-top-brand img {
          width: 26px;
          height: 26px;
          object-fit: contain;
        }
        .reg-mobile-brand-copy {
          display: grid;
          gap: 2px;
          color: #123b28;
        }
        .reg-mobile-brand-copy strong {
          font-size: 12px;
          letter-spacing: .18em;
          font-weight: 700;
        }
        .reg-mobile-brand-copy small {
          font-size: 9px;
          letter-spacing: .08em;
          color: #607265;
        }

        .reg-content {
          width: min(100%, 470px);
          margin: 0 auto;
        }

        .reg-eyebrow {
          margin:
            0
            0
            12px;

          color: #8c8f84;

          font-size: 11px;
          font-weight: 750;

          letter-spacing: 0.18em;
        }

        .reg-content h1 {
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

        .reg-content h1 span {
          color: #66745f;
        }

        .reg-description {
          max-width: 440px;

          margin:
            14px
            0
            30px;

          color: #6f766d;

          font-size: 14px;
          line-height: 1.7;
        }

        .reg-form {
          display: grid;
          gap: 18px;
        }

        .reg-form label {
          display: grid;
          gap: 8px;

          color: #414941;

          font-size: 12px;
          font-weight: 650;
        }

        .reg-form input {
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

        .reg-password-wrap {
          position: relative;
          width: 100%;
        }

        .reg-password-wrap input {
          padding-right: 52px;
        }

        .reg-password-eye {
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

        .reg-password-eye svg {
          width: 20px;
          height: 20px;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.7;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .reg-password-eye:hover:not(:disabled) {
          color: #1d5d37;
          background: #f6f8f4;
        }

        .reg-password-eye:focus-visible {
          outline: 2px solid #78936b;
          outline-offset: 2px;
        }

        .reg-password-eye:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .reg-form input::placeholder {
          color: #a5a9a2;
        }

        .reg-form input:hover {
          border-color: #c9cdc4;
        }

        .reg-form input:focus {
          border-color: #2e7548;

          box-shadow:
            0
            0
            0
            4px
            rgba(46, 117, 72, 0.12);
        }

        .reg-form input:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .reg-otp-input {
          text-align: center;

          font-size: 25px !important;

          font-weight: 650 !important;

          letter-spacing: 0.3em;
        }

        .reg-primary-button {
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

        .reg-primary-button span {
          margin-left: auto;
          font-size: 18px;
          line-height: 1;
        }

        .reg-primary-button:hover:not(:disabled) {
          transform: translateY(-1px);

          box-shadow:
            0
            10px
            24px
            rgba(51, 67, 54, 0.18);
        }

        .reg-primary-button:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .reg-secondary-button,
        .reg-back-button {
          width: 100%;
          min-height: 48px;

          border-radius: 11px;

          font-family: inherit;
          font-size: 12px;

          cursor: pointer;
        }

        .reg-secondary-button {
          border:
            1px solid #dedfd9;

          background: #ffffff;
          color: #536052;
        }

        .reg-back-button {
          border: 0;
          background: transparent;
          color: #858982;
        }

        .reg-secondary-button:disabled,
        .reg-back-button:disabled {
          opacity: 0.55;
          cursor: wait;
        }

        .reg-or {
          display: flex;
          align-items: center;
          gap: 12px;

          color: #a1a59d;

          font-size: 11px;
        }

        .reg-or::before,
        .reg-or::after {
          content: "";

          height: 1px;
          flex: 1;

          background: #ecece8;
        }

        .reg-register-button {
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

        .reg-register-button:hover {
          border-color: #cbd0c8;
          background: #fafbf9;
        }

        .reg-error,
        .reg-message {
          padding:
            11px
            13px;

          border-radius: 9px;

          font-size: 12px;
          line-height: 1.5;
        }

        .reg-error {
          border:
            1px solid #ecd4ce;

          background: #fff6f3;
          color: #9a5143;
        }

        .reg-message {
          border:
            1px solid #dbe4d8;

          background: #f5f8f3;
          color: #62705e;
        }

        .reg-privacy {
          margin-top: 25px;

          color: #969a92;

          font-size: 10.5px;
          line-height: 1.6;

          text-align: center;
        }

        /* ================= RIGHT ================= */

        .reg-brand-panel {
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
        .reg-brand-panel::before,
        .reg-brand-panel::after {
          right: -39%;

          transform:
            rotate(-10deg);
        }

        .reg-brand-panel::before {
          left: -39%;

          transform:
            rotate(10deg);
        }

        .reg-brand-panel::after {
          right: -26%;

          transform:
            rotate(-13deg);
        }
        .reg-nature-layer {
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

        .reg-nature-layer::before {
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

        .reg-nature-layer::after {
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


        .reg-brand-panel-glow {
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

        .reg-brand-center {
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

        .reg-main-symbol {
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

        .reg-brand-center h2 {
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

        .reg-brand-subtitle {
          margin: -4px 0 18px;
          color: #2d5f43;
          font-size: 13px;
          letter-spacing: 0.18em;
          text-transform: none;
        }

        .reg-brand-divider {
          width: 26px;
          height: 1.5px;

          margin:
            0
            auto
            18px;

          background: #657262;
        }

        .reg-brand-center p {
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
        .reg-path {
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

        .reg-welcome {
          width: 100%;

          text-align: center;
        }

        .reg-welcome-icon {
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

        .reg-welcome-icon img {
          width: 40px;
          height: 40px;

          object-fit: contain;
        }

        .reg-welcome-text {
          max-width: 390px;

          margin:
            20px
            auto
            0;

          color: #747b73;

          font-size: 13px;
          line-height: 1.75;
        }

        .reg-welcome
          .reg-primary-button {
          margin-top: 27px;
        }

        /* =====================================================
           TABLET / IPAD
        ====================================================== */

        @media (max-width: 1024px) {
          .reg-page {
            padding: 20px;
          }

          .reg-shell {
            min-height:
              calc(100dvh - 40px);

            grid-template-columns:
              minmax(0, 0.95fr)
              minmax(0, 1.05fr);

            border-radius: 24px;
          }

          .reg-form-panel {
            padding:
              34px
              34px
              30px;
          }

          .reg-content h1 {
            font-size: 36px;
          }

          .reg-brand-center {
            padding:
              30px
              18px;
          }

          .reg-brand-center h2 {
            font-size: 38px;
          }

          .reg-main-symbol {
            width: 100px;
          }

          .reg-shell {
            width: min(920px, 100%);
            grid-template-columns:
              minmax(0, 0.92fr)
              minmax(0, 1.08fr);
            gap: 18px;
          }

          .reg-form-panel,
          .reg-brand-panel {
            min-height: 570px;
          }

          .reg-form-panel {
            padding:
              42px
              38px;
          }

          .reg-brand-center {
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
          .reg-page {
            min-height: 100dvh;

            padding: 0;

            align-items: stretch;

            background: #ffffff;
          }

          .reg-shell {
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
          .reg-brand-panel {
            display: none;
          }


          .reg-top-brand {
            display: flex;
            margin-bottom: 42px;
          }

          .reg-form-panel {
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

          .reg-top-brand {
            margin-bottom: 48px;
          }

          .reg-content {
            width: 100%;
            margin: auto 0;
          }

          .reg-content h1 {
            font-size: 34px;
          }

          .reg-description {
            margin-bottom: 25px;
          }

          .reg-form {
            gap: 16px;
          }

          .reg-form input,
          .reg-primary-button {
            min-height: 52px;
          }

          .reg-welcome {
            padding:
              20px
              0;
          }

          .reg-welcome-icon {
            width: 62px;
            height: 62px;
          }
        }

        /* =====================================================
           HP KECIL
        ====================================================== */

        @media (max-width: 380px) {
          .reg-form-panel {
            padding-left: 18px;
            padding-right: 18px;
          }

          .reg-top-brand {
            margin-bottom: 34px;
          }

          .reg-content h1 {
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
          .reg-primary-button,
          .reg-form input,
          .reg-register-button {
            transition: none;
          }
        }
      
        .reg-form select,
        .reg-form textarea {
          width: 100%;
          box-sizing: border-box;
          padding: 0 16px;
          border: 1px solid #dedfd9;
          border-radius: 11px;
          outline: none;
          background: #ffffff;
          color: #303730;
          font: inherit;
          transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
        }
        .reg-form select { height: 53px; }
        .reg-form textarea { min-height: 96px; padding-top: 14px; padding-bottom: 14px; resize: vertical; }
        .reg-form select:focus,
        .reg-form textarea:focus {
          border-color: #2e7548;
          box-shadow: 0 0 0 4px rgba(46,117,72,.12);
        }
        .reg-two { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .reg-back-home {
          display:inline-block; margin-bottom:28px; color:#858982;
          font-size:11px; text-decoration:none;
        }
        .reg-success { text-align:center; }
        .reg-success-mark {
          width:64px;height:64px;margin:0 auto 20px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;background:#eef0e8;
          color:#2e7548;font-size:26px;
        }
        @media (max-width:700px) {
          .reg-two { grid-template-columns:1fr; }
          .reg-back-home { margin-bottom:22px; }
        }
`}</style>
    </main>
  );
}
