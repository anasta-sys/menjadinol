"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function WriterResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

    if (password.length < 8) {
      setMessage(
        "Password minimal 8 karakter."
      );
      return;
    }

    if (password !== confirmPassword) {
      setMessage(
        "Konfirmasi password belum sama."
      );
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error(
          "Tautan pemulihan tidak valid atau sudah kedaluwarsa."
        );
      }

      const { error } =
        await supabase.auth.updateUser({
          password,
        });

      if (error) {
        throw error;
      }

      await supabase.auth.signOut();

      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
      setMessage(
        "Password penulis berhasil diperbarui. Silakan masuk kembali."
      );
    } catch (error) {
      console.error(
        "Writer reset password gagal:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Password belum dapat diperbarui."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="reset-page">
      <section className="reset-card">
        <div className="brand">
          <img
            src="/jalan-pulang-symbol.png"
            alt=""
          />
          <span>menjadi nol</span>
        </div>

        <p className="eyebrow">
          PASSWORD BARU PENULIS
        </p>

        <h1>Buat password baru</h1>

        <p className="description">
          Masukkan password baru untuk akun
          penulis Menjadi Nol.
        </p>

        {!success ? (
          <form onSubmit={handleSubmit}>
            <label>
              Password baru
              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                autoComplete="new-password"
                minLength={8}
                required
                disabled={loading}
              />
            </label>

            <label>
              Ulangi password baru
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                autoComplete="new-password"
                minLength={8}
                required
                disabled={loading}
              />
            </label>

            {message && (
              <div className="message error">
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
              {!loading && <span>→</span>}
            </button>
          </form>
        ) : (
          <>
            <div className="message success">
              {message}
            </div>

            <a
              href="/writer-login"
              className="login-button"
            >
              masuk sebagai penulis →
            </a>
          </>
        )}

        {!success && (
          <a
            href="/writer-login"
            className="back-link"
          >
            ← kembali ke login penulis
          </a>
        )}
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
            linear-gradient(
              rgba(248,247,239,.70),
              rgba(248,247,239,.70)
            ),
            url("/menjadi-nol-nature.png")
              center center / cover no-repeat;
          background-attachment: fixed;
        }

        .reset-card {
          width: min(100%, 520px);
          padding: 52px 56px;
          box-sizing: border-box;
          border: 1px solid rgba(82,94,78,.07);
          border-radius: 28px;
          background: #fff;
          box-shadow: 0 24px 70px rgba(73,68,57,.08);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 42px;
          color: #52624f;
          font-family: Georgia, "Times New Roman", serif;
        }

        .brand img {
          width: 30px;
          height: 30px;
          object-fit: contain;
        }

        .eyebrow {
          margin: 0 0 12px;
          color: #8c8f84;
          font-size: 11px;
          font-weight: 750;
          letter-spacing: .18em;
        }

        h1 {
          margin: 0;
          color: #29412f;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(34px, 5vw, 46px);
          font-weight: 500;
          line-height: 1.08;
        }

        .description {
          margin: 15px 0 30px;
          color: #6f766d;
          font-size: 14px;
          line-height: 1.75;
        }

        form {
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

        input {
          width: 100%;
          height: 53px;
          padding: 0 16px;
          box-sizing: border-box;
          border: 1px solid #dedfd9;
          border-radius: 11px;
          outline: none;
          background: #fff;
          color: #303730;
          font: inherit;
        }

        input:focus {
          border-color: #768573;
          box-shadow:
            0 0 0 4px
            rgba(118,133,115,.11);
        }

        button,
        .login-button {
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
          color: #fff;
          font: inherit;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
        }

        button span {
          margin-left: auto;
          font-size: 18px;
        }

        .message {
          padding: 11px 13px;
          border-radius: 9px;
          font-size: 12px;
          line-height: 1.5;
        }

        .error {
          border: 1px solid #ecd4ce;
          background: #fff6f3;
          color: #9a5143;
        }

        .success {
          margin-bottom: 20px;
          border: 1px solid #d9e3d3;
          background: #f5f8f2;
          color: #52664d;
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

        @media (max-width: 700px) {
          .reset-page {
            padding: 0;
            align-items: stretch;
            background:
              linear-gradient(
                rgba(248,247,239,.78),
                rgba(248,247,239,.78)
              ),
              url("/menjadi-nol-nature.png")
                center center / cover no-repeat;
            background-attachment: scroll;
          }

          .reset-card {
            width: 100%;
            min-height: 100dvh;
            padding: 28px 22px;
            border: 0;
            border-radius: 0;
            box-shadow: none;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
        }
      `}</style>
    </main>
  );
}
