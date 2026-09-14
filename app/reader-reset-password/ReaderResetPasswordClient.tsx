"use client";

import {
  FormEvent,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

export default function ReaderResetPasswordClient() {
  const supabase = createClient();

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

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

    if (password.length < 8) {
      setMessage(
        "Password minimal 8 karakter."
      );
      return;
    }

    if (password !== confirmPassword) {
      setMessage(
        "Konfirmasi password tidak sama."
      );
      return;
    }

    setLoading(true);

    try {
      const {
        data: sessionData,
      } =
        await supabase.auth.getSession();

      if (!sessionData.session) {
        throw new Error(
          "Tautan reset tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru."
        );
      }

      const { error } =
        await supabase.auth.updateUser({
          password,
        });

      if (error) {
        throw new Error(
          error.message ||
            "Password gagal diperbarui."
        );
      }

      await supabase.auth.signOut();

      setPassword("");
      setConfirmPassword("");

      setShowPassword(false);
      setShowConfirmPassword(false);

      setSuccess(true);
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Password gagal diperbarui."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="reset-page">
      <section className="reset-card">

        <div className="reset-brand">
          <img
            src="/jalan-pulang-symbol.png"
            alt=""
          />
          <span>menjadi nol</span>
        </div>

        {!success ? (
          <>
            <p className="eyebrow">
              PASSWORD BARU
            </p>

            <h1>Buat password baru</h1>

            <p className="description">
              Gunakan password baru minimal
              8 karakter yang tidak mudah
              ditebak.
            </p>

            <form
              className="reset-form"
              onSubmit={handleSubmit}
            >
              <label>
                Password baru

                <div className="password-field">
                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value
                      )
                    }
                    placeholder="Minimal 8 karakter"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="password-eye"
                    onClick={() =>
                      setShowPassword(
                        (value) => !value
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Sembunyikan password"
                        : "Lihat password"
                    }
                    disabled={loading}
                  >
                    {showPassword
                      ? "◉"
                      : "◎"}
                  </button>
                </div>
              </label>

              <label>
                Konfirmasi password

                <div className="password-field">
                  <input
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      confirmPassword
                    }
                    onChange={(event) =>
                      setConfirmPassword(
                        event.target.value
                      )
                    }
                    placeholder="Ulangi password baru"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="password-eye"
                    onClick={() =>
                      setShowConfirmPassword(
                        (value) => !value
                      )
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Sembunyikan password"
                        : "Lihat password"
                    }
                    disabled={loading}
                  >
                    {showConfirmPassword
                      ? "◉"
                      : "◎"}
                  </button>
                </div>
              </label>

              {message && (
                <div
                  className="error"
                  role="alert"
                  aria-live="polite"
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "menyimpan..."
                  : "simpan password baru"}

                {!loading && (
                  <span>→</span>
                )}
              </button>
            </form>

            <a
              href="/reader-login"
              className="back-link"
            >
              ← kembali ke login
            </a>
          </>
        ) : (
          <div className="success">

            <div className="success-icon">
              ✓
            </div>

            <p className="eyebrow">
              BERHASIL
            </p>

            <h1>
              Password diperbarui
            </h1>

            <p className="description">
              Password baru berhasil
              disimpan. Silakan masuk
              kembali menggunakan password
              barumu.
            </p>

            <a
              href="/reader-login"
              className="primary-link"
            >
              masuk kembali
              <span>→</span>
            </a>
          </div>
        )}

        <div className="privacy">
          ♡ Setelah mengganti password,
          kamu perlu login dan verifikasi
          OTP kembali.
        </div>
      </section>

      <style jsx>{`
        .reset-page {
          min-height: 100dvh;
          width: 100%;
          padding: 34px;
          box-sizing: border-box;

          display: flex;
          align-items: center;
          justify-content: center;

          background:
            radial-gradient(
              circle at 18% 16%,
              rgba(255, 247, 226, 0.56),
              transparent 35%
            ),
            radial-gradient(
              circle at 86% 84%,
              rgba(226, 236, 216, 0.36),
              transparent 38%
            ),
            #f8f4ec;
        }

        .reset-card {
          width: min(100%, 520px);

          padding: 52px 56px;
          box-sizing: border-box;

          border:
            1px solid
            rgba(82, 94, 78, 0.07);

          border-radius: 28px;

          background: #ffffff;

          box-shadow:
            0 24px 70px
              rgba(73, 68, 57, 0.08),
            0 3px 12px
              rgba(73, 68, 57, 0.035);
        }

        .reset-brand {
          display: flex;
          align-items: center;
          gap: 10px;

          margin-bottom: 42px;

          color: #52624f;

          font-family:
            Georgia,
            "Times New Roman",
            serif;

          font-size: 16px;
        }

        .reset-brand img {
          width: 30px;
          height: 30px;
          object-fit: contain;
        }

        .eyebrow {
          margin: 0 0 12px;

          color: #8c8f84;

          font-size: 11px;
          font-weight: 750;

          letter-spacing: 0.18em;
        }

        h1 {
          margin: 0;

          color: #29412f;

          font-family:
            Georgia,
            "Times New Roman",
            serif;

          font-size:
            clamp(36px, 5vw, 48px);

          font-weight: 500;
          line-height: 1.08;

          letter-spacing: -0.035em;
        }

        .description {
          margin:
            15px
            0
            30px;

          color: #6f766d;

          font-size: 14px;
          line-height: 1.75;
        }

        .reset-form {
          display: grid;
          gap: 18px;
        }

        label {
          display: grid;
          gap: 8px;

          color: #414941;

          font-size: 12px;
          font-weight: 650;
        }

        .password-field {
          position: relative;
          width: 100%;
        }

        input {
          width: 100%;
          height: 53px;

          padding:
            0
            52px
            0
            16px;

          box-sizing: border-box;

          border:
            1px solid #dedfd9;

          border-radius: 11px;

          outline: none;

          background: #ffffff;
          color: #303730;

          font: inherit;
        }

        input:focus {
          border-color: #768573;

          box-shadow:
            0
            0
            0
            4px
            rgba(118, 133, 115, 0.11);
        }

        input:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        button,
        .primary-link {
          width: 100%;
          min-height: 53px;

          padding: 0 18px;
          box-sizing: border-box;

          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;

          border: 0;
          border-radius: 999px;

          background: #78936b;
          color: #ffffff;

          font-family: inherit;
          font-size: 13px;
          font-weight: 700;

          text-decoration: none;

          cursor: pointer;
        }

        button span,
        .primary-link span {
          margin-left: auto;

          font-size: 18px;
        }

        button:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .password-eye {
          position: absolute;

          top: 50%;
          right: 10px;

          transform:
            translateY(-50%);

          width: 36px;
          height: 36px;
          min-height: 0;

          padding: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 0;
          border-radius: 50%;

          background: transparent;
          color: #66745f;

          font-size: 20px;
          font-weight: 400;
          line-height: 1;

          cursor: pointer;
        }

        .password-eye:hover {
          background:
            rgba(
              120,
              147,
              107,
              0.09
            );

          color: #435742;
        }

        .password-eye:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error {
          padding: 11px 13px;

          border:
            1px solid #ecd4ce;

          border-radius: 9px;

          background: #fff6f3;
          color: #9a5143;

          font-size: 12px;
          line-height: 1.5;
        }

        .back-link {
          display: block;

          margin-top: 24px;

          color: #66745f;

          font-size: 12px;
          font-weight: 600;

          text-align: center;
          text-decoration: none;
        }

        .back-link:hover {
          text-decoration: underline;
        }

        .success {
          text-align: center;
        }

        .success-icon {
          width: 62px;
          height: 62px;

          margin:
            0
            auto
            22px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: #eef0e8;
          color: #65745f;

          font-size: 25px;
        }

        .privacy {
          margin-top: 30px;

          color: #969a92;

          font-size: 10.5px;
          line-height: 1.6;

          text-align: center;
        }

        a:focus-visible,
        button:focus-visible {
          outline: 2px solid #78936b;
          outline-offset: 4px;
        }

        @media (max-width: 700px) {
          .reset-page {
            padding: 0;
            align-items: stretch;

            background: #ffffff;
          }

          .reset-card {
            width: 100%;
            min-height: 100dvh;

            padding:
              max(
                28px,
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

            border: 0;
            border-radius: 0;

            box-shadow: none;

            display: flex;
            flex-direction: column;
            justify-content: center;
          }

          .reset-brand {
            margin-bottom: 48px;
          }

          h1 {
            font-size: 34px;
          }
        }
      `}</style>
    </main>
  );
}