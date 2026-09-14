"use client";

import { FormEvent, useState } from "react";

export default function SuperAdminForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail) {
      setMessage("Masukkan email kamu.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/superadmin/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            email: normalizedEmail,
          }),
        }
      );

      const result =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Email reset belum dapat dikirim."
        );
      }

      setSuccess(true);

      setMessage(
        "Jika email tersebut terdaftar sebagai akun Superadmin, tautan reset password telah dikirim."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Email reset belum dapat dikirim."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="forgot-page">
      <section className="forgot-card">

        <div className="brand">
          <img
            src="/jalan-pulang-symbol.png"
            alt=""
          />

          <span>menjadi nol</span>
        </div>

        <p className="eyebrow">
          PEMULIHAN AKUN SUPERADMIN
        </p>

        <h1>Lupa password?</h1>

        <p className="description">
          Masukkan email akun Superadmin
          Menjadi Nol. Kami akan mengirimkan
          tautan untuk membuat password baru.
        </p>

        <form onSubmit={handleSubmit}>
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
              placeholder="nama@email.com"
              autoComplete="email"
              required
              disabled={loading}
            />
          </label>

          {message && (
            <div
              className={
                success
                  ? "message success"
                  : "message error"
              }
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "mengirim..."
              : "kirim tautan reset"}
          </button>
        </form>

        <a
          href="/superadmin-login"
          className="back"
        >
          ← kembali ke login Superadmin
        </a>

      </section>

      <style jsx>{`
        .forgot-page {
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

        .forgot-card {
          width: min(100%, 520px);

          padding: 52px 56px;

          box-sizing: border-box;

          border:
            1px solid
            rgba(82,94,78,.07);

          border-radius: 28px;

          background: #ffffff;

          box-shadow:
            0 24px 70px
            rgba(73,68,57,.08);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;

          margin-bottom: 42px;

          color: #52624f;

          font-family:
            Georgia,
            "Times New Roman",
            serif;
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

          font-family:
            Georgia,
            "Times New Roman",
            serif;

          font-size:
            clamp(36px,5vw,48px);

          font-weight: 500;
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

          border:
            1px solid
            #dedfd9;

          border-radius: 11px;

          outline: none;

          background: #fff;

          font: inherit;
        }

        input:focus {
          border-color: #768573;

          box-shadow:
            0 0 0 4px
            rgba(118,133,115,.11);
        }

        button {
          min-height: 53px;

          border: 0;
          border-radius: 999px;

          background: #78936b;

          color: #ffffff;

          font-weight: 700;

          cursor: pointer;
        }

        button:disabled {
          opacity: .6;
          cursor: wait;
        }

        .message {
          padding: 11px 13px;

          border-radius: 9px;

          font-size: 12px;
          line-height: 1.5;
        }

        .error {
          background: #fff6f3;
          color: #9a5143;
        }

        .success {
          background: #f5f8f2;
          color: #52664d;
        }

        .back {
          display: block;

          margin-top: 24px;

          color: #66745f;

          font-size: 12px;
          font-weight: 600;

          text-align: center;
          text-decoration: none;
        }

        @media (max-width: 700px) {
          .forgot-page {
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

          .forgot-card {
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