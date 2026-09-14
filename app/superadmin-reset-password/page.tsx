"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SuperAdminResetPasswordPage() {
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

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

    if (password.length < 10) {
      setMessage(
        "Password minimal 10 karakter."
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
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (
        sessionError ||
        !sessionData.session
      ) {
        throw new Error(
          "Tautan reset tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru."
        );
      }

      const {
        data: userData,
        error: userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !userData.user
      ) {
        throw new Error(
          "Akun Superadmin tidak ditemukan."
        );
      }

      const {
        data: profile,
        error: profileError,
      } =
        await supabase
          .from("admin_users")
          .select("user_id,role")
          .eq(
            "user_id",
            userData.user.id
          )
          .maybeSingle();

      if (
        profileError ||
        !profile ||
        profile.role !== "superadmin"
      ) {
        await supabase.auth.signOut();

        throw new Error(
          "Akun ini bukan akun Superadmin."
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
    <main className="sa-reset-page">
      <section className="sa-reset-shell">

        <aside className="sa-reset-brand">
          <div className="sa-reset-overlay" />

          <div className="sa-reset-brand-content">
            <img
              src="/jalan-pulang-symbol.png"
              alt=""
              aria-hidden="true"
            />

            <h2>menjadi nol</h2>

            <div className="sa-reset-line" />

            <p>
              Setiap jeda adalah kesempatan
              <br />
              untuk memulai kembali.
            </p>
          </div>
        </aside>

        <section className="sa-reset-card">
          <div className="sa-reset-content">

            {!success ? (
              <>
                <p className="sa-reset-eyebrow">
                  SUPERADMIN SECURITY
                </p>

                <h1>
                  Buat password baru
                </h1>

                <p className="sa-reset-description">
                  Masukkan password baru untuk
                  akun Superadmin Menjadi Nol.
                </p>

                <form
                  onSubmit={handleSubmit}
                  className="sa-reset-form"
                >
                  <label>
                    Password baru

                    <div className="sa-password-wrap">
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
                        placeholder="Minimal 10 karakter"
                        autoComplete="new-password"
                        minLength={10}
                        required
                        disabled={loading}
                      />

                      <button
                        type="button"
                        className="sa-eye"
                        onClick={() =>
                          setShowPassword(
                            (current) =>
                              !current
                          )
                        }
                        aria-label={
                          showPassword
                            ? "Sembunyikan password"
                            : "Tampilkan password"
                        }
                      >
                        {showPassword
                          ? "◉"
                          : "⊙"}
                      </button>
                    </div>
                  </label>

                  <label>
                    Konfirmasi password

                    <div className="sa-password-wrap">
                      <input
                        type={
                          showConfirmPassword
                            ? "text"
                            : "password"
                        }
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(
                            event.target.value
                          )
                        }
                        placeholder="Ulangi password baru"
                        autoComplete="new-password"
                        minLength={10}
                        required
                        disabled={loading}
                      />

                      <button
                        type="button"
                        className="sa-eye"
                        onClick={() =>
                          setShowConfirmPassword(
                            (current) =>
                              !current
                          )
                        }
                        aria-label={
                          showConfirmPassword
                            ? "Sembunyikan password"
                            : "Tampilkan password"
                        }
                      >
                        {showConfirmPassword
                          ? "◉"
                          : "⊙"}
                      </button>
                    </div>
                  </label>

                  {message && (
                    <div
                      className="sa-reset-error"
                      role="alert"
                    >
                      {message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="sa-reset-primary"
                  >
                    <span>
                      {loading
                        ? "memperbarui..."
                        : "simpan password baru"}
                    </span>

                    {!loading && (
                      <span aria-hidden="true">
                        →
                      </span>
                    )}
                  </button>
                </form>

                <a
                  href="/superadmin-login"
                  className="sa-reset-back"
                >
                  ← kembali ke Superadmin Login
                </a>
              </>
            ) : (
              <div className="sa-reset-success">
                <div className="sa-success-icon">
                  ✓
                </div>

                <p className="sa-reset-eyebrow">
                  PASSWORD DIPERBARUI
                </p>

                <h1>
                  Password berhasil diganti.
                </h1>

                <p>
                  Silakan login kembali menggunakan
                  password baru dan lanjutkan
                  verifikasi MFA.
                </p>

                <a
                  href="/superadmin-login"
                  className="sa-reset-primary sa-reset-login-link"
                >
                  masuk ke Superadmin
                  <span>→</span>
                </a>
              </div>
            )}
          </div>
        </section>

      </section>

      <style jsx>{`
        .sa-reset-page,
        .sa-reset-page * {
          box-sizing: border-box;
        }

        .sa-reset-page {
          width: 100%;
          min-height: 100dvh;
          padding: 32px 24px;

          display: flex;
          align-items: center;
          justify-content: center;

          color: #29412f;

          background:
            linear-gradient(
              rgba(248,247,239,.68),
              rgba(248,247,239,.68)
            ),
            url("/menjadi-nol-nature.png")
              center center / cover no-repeat;

          background-attachment: fixed;
        }

        .sa-reset-shell {
          width: min(1180px, 100%);
          min-height: 650px;

          display: grid;
          grid-template-columns:
            minmax(0,.92fr)
            minmax(0,1.08fr);

          gap: 24px;
        }

        .sa-reset-brand,
        .sa-reset-card {
          min-width: 0;
          min-height: 650px;

          border:
            1px solid
            rgba(108,101,84,.12);

          border-radius: 28px;

          box-shadow:
            0 22px 64px
            rgba(73,68,57,.075);
        }

        .sa-reset-brand {
          position: relative;
          overflow: hidden;

          display: flex;
          align-items: center;
          justify-content: center;

          background:
            linear-gradient(
              rgba(248,247,239,.46),
              rgba(248,247,239,.46)
            ),
            url("/menjadi-nol-nature.png")
              center center / cover no-repeat;
        }

        .sa-reset-overlay {
          position: absolute;
          inset: 0;

          background:
            linear-gradient(
              180deg,
              rgba(255,255,255,.08),
              rgba(248,247,239,.14)
            );
        }

        .sa-reset-brand-content {
          position: relative;
          z-index: 2;

          width: 88%;
          padding: 32px 22px;

          text-align: center;
        }

        .sa-reset-brand-content img {
          width:
            clamp(115px,10vw,150px);
          height: auto;
          object-fit: contain;
        }

        .sa-reset-brand-content h2 {
          margin: 16px 0 14px;

          font-family:
            Georgia,
            "Times New Roman",
            serif;

          font-size:
            clamp(38px,4vw,55px);

          font-weight: 500;
          line-height: 1;
          letter-spacing: -.035em;
        }

        .sa-reset-line {
          width: 28px;
          height: 1px;

          margin:
            0 auto 18px;

          background: #657262;
        }

        .sa-reset-brand-content p {
          margin: 0;

          color: #435747;

          font-size: 14px;
          line-height: 1.75;
        }

        .sa-reset-card {
          display: flex;
          align-items: center;

          padding: 54px 72px;

          background:
            rgba(255,255,255,.96);
        }

        .sa-reset-content {
          width:
            min(100%,500px);

          margin:
            0 auto;
        }

        .sa-reset-eyebrow {
          margin:
            0 0 12px;

          text-align: center;

          color: #63765f;

          font-size: 11px;
          font-weight: 800;

          letter-spacing: .16em;
        }

        .sa-reset-content h1 {
          margin: 0;

          text-align: center;

          font-family:
            Georgia,
            "Times New Roman",
            serif;

          font-size:
            clamp(39px,3.7vw,52px);

          font-weight: 500;

          line-height: 1.08;
          letter-spacing: -.035em;
        }

        .sa-reset-description {
          max-width: 430px;

          margin:
            15px auto 31px;

          text-align: center;

          color: #717870;

          font-size: 14px;
          line-height: 1.65;
        }

        .sa-reset-form {
          display: grid;
          gap: 15px;
        }

        .sa-reset-form label {
          color: #344137;

          font-size: 12px;
          font-weight: 700;
        }

        .sa-password-wrap {
          position: relative;

          margin-top: 7px;
        }

        .sa-password-wrap input {
          width: 100%;
          height: 54px;

          padding:
            0 52px 0 15px;

          border:
            1px solid #dcded8;

          border-radius: 11px;

          outline: none;

          background: #fff;

          color: #303730;

          font: inherit;
          font-size: 13px;
        }

        .sa-password-wrap input:focus {
          border-color: #7f917a;

          box-shadow:
            0 0 0 4px
            rgba(118,133,115,.10);
        }

        .sa-eye {
          position: absolute;
          right: 11px;
          top: 50%;

          width: 36px;
          height: 36px;

          transform:
            translateY(-50%);

          border: 0;
          border-radius: 8px;

          background: transparent;

          color: #7d857b;

          cursor: pointer;
          font-size: 18px;
        }

        .sa-eye:hover {
          background: #f5f7f3;
        }

        .sa-reset-error {
          padding: 11px 13px;

          border:
            1px solid #ecd4ce;

          border-radius: 9px;

          background: #fff6f3;

          color: #9a5143;

          font-size: 12px;
          line-height: 1.5;
        }

        .sa-reset-primary {
          width: 100%;
          min-height: 53px;

          margin-top: 5px;

          padding: 0 18px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          border: 0;
          border-radius: 999px;

          background: #78936b;

          color: #fff;

          cursor: pointer;

          font: inherit;

          font-size: 13px;
          font-weight: 700;

          text-decoration: none;
        }

        .sa-reset-primary:hover {
          background: #6f8864;
        }

        .sa-reset-primary:disabled {
          opacity: .6;
          cursor: wait;
        }

        .sa-reset-back {
          display: block;

          margin-top: 23px;

          text-align: center;

          color: #5f745f;

          font-size: 12px;
          font-weight: 700;

          text-decoration: none;
        }

        .sa-reset-back:hover {
          text-decoration: underline;
        }

        .sa-reset-success {
          text-align: center;
        }

        .sa-success-icon {
          width: 58px;
          height: 58px;

          margin:
            0 auto 21px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: #e2eadc;

          color: #55704f;

          font-size: 25px;
          font-weight: 800;
        }

        .sa-reset-success p:not(
          .sa-reset-eyebrow
        ) {
          max-width: 430px;

          margin:
            18px auto 29px;

          color: #667065;

          font-size: 14px;
          line-height: 1.65;
        }

        .sa-reset-login-link {
          max-width: 390px;

          margin:
            0 auto;

          justify-content:
            space-between;
        }

        @media
        (max-width: 800px) {

          .sa-reset-page {
            padding: 20px;
            background-attachment:
              scroll;
          }

          .sa-reset-shell {
            grid-template-columns:
              1fr;
          }

          .sa-reset-brand {
            display: none;
          }

          .sa-reset-card {
            min-height:
              calc(100dvh - 40px);

            padding:
              44px 28px;
          }
        }
      `}</style>
    </main>
  );
}