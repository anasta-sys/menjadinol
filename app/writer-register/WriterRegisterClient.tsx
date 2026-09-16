"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type RequestedAccess = "writer" | "admin";

export default function WriterRegisterClient() {
  const supabase = useMemo(() => createClient(), []);

  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [requestedAccess, setRequestedAccess] =
    useState<RequestedAccess>("writer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setSuccess(false);

    const cleanFullName = fullName.trim();
    const cleanDisplayName = displayName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanReason = reason.trim();

    if (
      !cleanFullName ||
      !cleanDisplayName ||
      !cleanEmail ||
      !cleanReason
    ) {
      setMessage("Mohon lengkapi seluruh data pendaftaran.");
      return;
    }

    if (password.length < 8) {
      setMessage("Password minimal 8 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Konfirmasi password belum sama.");
      return;
    }

    setLoading(true);

    try {
      const emailRedirectTo =
        `${window.location.origin}/writer-login?confirmed=1`;

      /*
       * Aman untuk dua kondisi:
       * 1. Email sudah punya akun Supabase Auth -> verifikasi password
       *    dengan signInWithPassword lalu gunakan user_id asli.
       * 2. Email benar-benar baru -> buat akun melalui signUp.
       *
       * Ini mencegah user_id "dummy/obfuscated" dari signUp ulang
       * pada email yang sebenarnya sudah terdaftar.
       */
      let userId = "";
      let existingAccount = false;

      const {
        data: existingLogin,
        error: existingLoginError,
      } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (!existingLoginError && existingLogin.user?.id) {
        userId = existingLogin.user.id;
        existingAccount = true;
      } else {
        const { data: signUpData, error: signUpError } =
          await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              emailRedirectTo,
              data: {
                full_name: cleanFullName,
                display_name: cleanDisplayName,
                requested_access: requestedAccess,
              },
            },
          });

        if (signUpError) {
          throw new Error(signUpError.message);
        }

        /*
         * Supabase dapat menyamarkan respons signup jika email
         * sebenarnya sudah terdaftar. identities kosong adalah
         * indikasi akun lama, jadi jangan kirim user_id tersebut
         * ke API approval.
         */
        if (
          signUpData.user &&
          Array.isArray(signUpData.user.identities) &&
          signUpData.user.identities.length === 0
        ) {
          throw new Error(
            "Email ini sudah memiliki akun. Gunakan password akun yang sudah ada agar identitas dapat diverifikasi."
          );
        }

        userId = signUpData.user?.id ?? "";
      }

      if (!userId) {
        throw new Error("Identitas akun belum berhasil diverifikasi.");
      }

      const response = await fetch("/api/writer-register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          email: cleanEmail,
          full_name: cleanFullName,
          display_name: cleanDisplayName,
          requested_access: requestedAccess,
          reason: cleanReason,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error || "Permohonan belum berhasil disimpan."
        );
      }

      setSuccess(true);
      setMessage(
        existingAccount
          ? "Permohonan berhasil masuk ke antrean Superadmin menggunakan akun yang sudah terverifikasi."
          : "Permohonan berhasil masuk ke antrean Superadmin. Silakan konfirmasi email bila diminta."
      );
    } catch (error) {
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
    <main className="writer-register-page">
      <section className="writer-register-shell">
        <section
          className="proper-login-visual writer-brand-panel"
          aria-hidden="true"
        >
          <div className="login-symbol-wrap">
            <img
              src="/jalan-pulang-symbol.png"
              alt=""
              aria-hidden="true"
            />
          </div>

          <div className="login-wordmark">
            menjadi nol
          </div>

          <div className="login-tagline">
            Perjalanan pulang dalam diri
          </div>

          <p>
            Ruang untuk berbagi tulisan,
            refleksi, dan perjalanan dalam diri.
          </p>

          <div className="login-security-list">
            <span>Supabase Auth</span>
            <span>RLS</span>
            <span>MFA / TOTP</span>
          </div>
        </section>

        <div className="writer-form-panel">
          <div className="writer-mobile-brand">
            <img src="/jalan-pulang-symbol.png" alt="" />
            <span>menjadi nol</span>
          </div>

          <div className="writer-form-content">
            <p className="writer-eyebrow">BERGABUNG MENULIS</p>
            <h1>Daftar sebagai Penulis atau Admin</h1>

            <p className="writer-description">
              Isi data berikut untuk mengajukan akses. Akun baru tidak
              langsung memperoleh akses pengelolaan sebelum disetujui
              Superadmin.
            </p>

            {success ? (
              <div className="writer-success">
                <strong>Permohonan sudah terkirim.</strong>
                <p>{message}</p>
                <a href="/writer-login">Ke halaman login →</a>
              </div>
            ) : (
              <form className="writer-form" onSubmit={handleSubmit}>
                <div className="writer-two-columns">
                  <label>
                    Nama lengkap
                    <input
                      type="text"
                      value={fullName}
                      onChange={(event) =>
                        setFullName(event.target.value)
                      }
                      placeholder="Nama lengkap"
                      maxLength={120}
                      required
                      disabled={loading}
                    />
                  </label>

                  <label>
                    Nama pena / nama tampil
                    <input
                      type="text"
                      value={displayName}
                      onChange={(event) =>
                        setDisplayName(event.target.value)
                      }
                      placeholder="Contoh: Anasta"
                      maxLength={80}
                      required
                      disabled={loading}
                    />
                  </label>
                </div>

                <label>
                  Mengajukan sebagai
                  <select
                    value={requestedAccess}
                    onChange={(event) =>
                      setRequestedAccess(
                        event.target.value as RequestedAccess
                      )
                    }
                    disabled={loading}
                  >
                    <option value="writer">Penulis</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>

                <label>
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="nama@email.com"
                    autoComplete="email"
                    inputMode="email"
                    required
                    disabled={loading}
                  />
                </label>

                <div className="writer-two-columns">
                  <label>
                    Password
                    <input
                      type="password"
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      placeholder="Minimal 8 karakter"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      disabled={loading}
                    />
                  </label>

                  <label>
                    Konfirmasi password
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      placeholder="Ulangi password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      disabled={loading}
                    />
                  </label>
                </div>

                <label>
                  Alasan ingin bergabung
                  <textarea
                    value={reason}
                    onChange={(event) =>
                      setReason(event.target.value)
                    }
                    placeholder="Ceritakan secara singkat alasan ingin menjadi bagian dari Menjadi Nol."
                    minLength={10}
                    maxLength={1200}
                    rows={5}
                    required
                    disabled={loading}
                  />
                </label>

                {message && (
                  <div className="writer-message" role="alert">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  className="writer-submit"
                  disabled={loading}
                >
                  {loading
                    ? "mengirim permohonan..."
                    : "kirim permohonan"}
                  {!loading && <span>→</span>}
                </button>

                <div className="writer-login-link">
                  Sudah memiliki akses? <a href="/writer-login">Masuk</a>
                </div>

                <div className="writer-security-note">
                  Permohonan Penulis/Admin harus mendapat persetujuan
                  Superadmin. Superadmin tidak dapat didaftarkan melalui
                  halaman ini.
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      <style jsx>{`
        .writer-register-page {
          min-height: 100vh;
          padding: 38px 22px;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at 14% 18%, rgba(126, 148, 111, .12), transparent 32%),
            linear-gradient(180deg, #f8f6ef 0%, #efede3 100%);
          color: #304137;
        }

        .writer-register-shell {
          width: min(1120px, 100%);
          min-height: 720px;
          display: grid;
          grid-template-columns: .92fr 1.08fr;
          gap: 22px;
          align-items: stretch;
        }

        /*
         * PANEL KIRI SENGAJA MEMAKAI MARKUP + CLASS
         * YANG SAMA DENGAN LOGIN ADMIN.
         * Jangan dibuat ulang dengan logo/style lain.
         */
        .writer-brand-panel {
          min-height: 100%;

          background-image:
            linear-gradient(
              180deg,
              rgba(255, 253, 247, 0.20) 0%,
              rgba(255, 250, 239, 0.16) 48%,
              rgba(232, 242, 226, 0.28) 100%
            ),
            url("/menjadi-nol-nature.png");

          background-size: cover;
          background-position: center center;
          background-repeat: no-repeat;
        }

        .writer-mobile-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          letter-spacing: .08em;
        }

        .writer-mobile-brand img {
          width: 28px;
          height: 28px;
          object-fit: contain;
        }

        .writer-form-panel {
          padding: 34px clamp(30px, 5vw, 68px);
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: rgba(255,255,255,.94);
          border: 1px solid rgba(38,56,45,.11);
          border-radius: 30px;
          box-shadow: 0 25px 70px rgba(61,68,56,.09);
        }

        .writer-mobile-brand {
          display: none;
        }

        .writer-form-content {
          width: 100%;
          max-width: 600px;
          margin: auto;
        }

        .writer-eyebrow {
          margin: 0 0 10px;
          font-size: 11px;
          letter-spacing: .16em;
          color: #788875;
        }

        h1 {
          margin: 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(31px, 4vw, 44px);
          line-height: 1.08;
          font-weight: 500;
          color: #C6923A;
        }

        .writer-description {
          margin: 15px 0 27px;
          color: #717870;
          line-height: 1.7;
          font-size: 14px;
        }

        .writer-form {
          display: grid;
          gap: 16px;
        }

        .writer-two-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        label {
          display: grid;
          gap: 7px;
          font-size: 12px;
          font-weight: 650;
          color: #46554a;
        }

        input,
        select,
        textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid rgba(70, 91, 76, .18);
          border-radius: 13px;
          background: #fff;
          color: #304137;
          font: inherit;
          font-weight: 400;
          outline: none;
          transition: border-color .18s ease, box-shadow .18s ease;
        }

        input,
        select {
          min-height: 46px;
          padding: 10px 13px;
        }

        textarea {
          padding: 12px 13px;
          resize: vertical;
          line-height: 1.55;
        }

        input:focus,
        select:focus,
        textarea:focus {
          border-color: rgba(89, 117, 91, .55);
          box-shadow: 0 0 0 3px rgba(103, 128, 99, .10);
        }

        .writer-message,
        .writer-security-note,
        .writer-success {
          padding: 12px 14px;
          border-radius: 13px;
          font-size: 12px;
          line-height: 1.6;
        }

        .writer-message {
          background: rgba(150, 70, 70, .07);
          color: #8b514a;
        }

        .writer-security-note {
          background: #f1f5ed;
          color: #667461;
        }

        .writer-submit {
          min-height: 49px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border: 0;
          border-radius: 14px;
          background: #526b58;
          color: white;
          cursor: pointer;
          font-weight: 750;
          text-transform: lowercase;
        }

        .writer-submit:disabled {
          cursor: wait;
          opacity: .62;
        }

        .writer-login-link {
          text-align: center;
          color: #737a72;
          font-size: 12px;
        }

        .writer-login-link a,
        .writer-success a {
          color: #465f4d;
          font-weight: 700;
          text-decoration: none;
        }

        .writer-success {
          margin-top: 26px;
          background: #eef4e9;
          color: #52644f;
        }

        .writer-success strong {
          display: block;
          margin-bottom: 5px;
          font-size: 15px;
        }

        .writer-success p {
          margin: 0 0 14px;
        }

        @media (max-width: 820px) {
          .writer-register-page {
            padding: 18px 12px;
            place-items: start center;
          }

          .writer-register-shell {
            display: block;
            min-height: auto;
          }

          .writer-brand-panel {
            display: none;
          }

          .writer-form-panel {
            padding: 26px 20px 32px;
          }

          .writer-mobile-brand {
            display: flex;
            margin-bottom: 42px;
          }
        }

        @media (max-width: 560px) {
          .writer-two-columns {
            grid-template-columns: 1fr;
          }

          .writer-form-panel {
            padding: 23px 17px 28px;
          }

          h1 {
            font-size: 34px;
          }
        }
      `}</style>
    </main>
  );
}
