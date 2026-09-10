"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SuperAdminLogin() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        throw new Error("Email atau password tidak sesuai.");
      }

      const userId = data.user?.id;

      if (!userId) {
        throw new Error("Sesi Super Admin tidak ditemukan.");
      }

      /*
       * Hanya mengecek apakah akun yang login mempunyai
       * profile superadmin.
       *
       * Keamanan utama tetap dicek kembali di
       * /admin/superadmin pada SERVER.
       */
      const { data: profile, error: profileError } =
        await supabase
          .from("admin_users")
          .select("user_id,role")
          .eq("user_id", userId)
          .maybeSingle();

      if (
        profileError ||
        !profile ||
        profile.role !== "superadmin"
      ) {
        await supabase.auth.signOut();

        throw new Error(
          "Akun ini tidak memiliki akses Super Admin."
        );
      }

      /*
       * Cek MFA.
       */
      const { data: aal, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalError) {
        throw new Error(
          "Tidak dapat memeriksa keamanan akun."
        );
      }

      /*
       * Kalau sudah AAL2, langsung Super Admin.
       */
      if (aal.currentLevel === "aal2") {
        router.replace("/admin/superadmin");
        router.refresh();
        return;
      }

      /*
       * Kalau MFA belum selesai, masuk ke halaman MFA Super Admin.
       */
      router.replace("/superadmin-login/mfa");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Login Super Admin gagal."
      );

      setLoading(false);
    }
  }

  return (
    <main className="sa-page">
      <section className="sa-shell">
        {/* KIRI — identitas Kembali ke Nol */}
        <aside className="sa-brand" aria-hidden="true">
          <div className="sa-nature" />
          <div className="sa-glow" />

          <div className="sa-brand-center">
            <img
              src="/jalan-pulang-symbol.png"
              alt=""
              className="sa-symbol"
            />
            <h2>kembali ke nol</h2>
            <div className="sa-divider" />
            <p>
              Ruang untuk berhenti, merasa,
              <br />
              memahami, dan kembali ke nol.
            </p>
          </div>
        </aside>

        {/* KANAN — login Superadmin */}
        <section className="sa-login">
          <div className="sa-mobile-brand" aria-hidden="true">
            <img src="/jalan-pulang-symbol.png" alt="" />
            <span>kembali ke nol</span>
          </div>

          <div className="sa-content">
            <p className="sa-eyebrow">SUPERADMIN ACCESS</p>
            <h1>Masuk ke Superadmin</h1>
            <p className="sa-description">
              Akses ruang pengawasan dan pengelolaan konten.
            </p>

            <form onSubmit={handleLogin} className="sa-form">
              <label htmlFor="superadmin-email">Email</label>
              <div className="sa-input-wrap">
                <span className="sa-input-icon" aria-hidden="true">✉</span>
                <input
                  id="superadmin-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={loading}
                  placeholder="Masukkan email kamu"
                />
              </div>

              <label htmlFor="superadmin-password">Password</label>
              <div className="sa-input-wrap">
                <span className="sa-input-icon sa-lock" aria-hidden="true">♙</span>
                <input
                  id="superadmin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={loading}
                  placeholder="Masukkan password"
                />
                <button
                  type="button"
                  className="sa-eye"
                  onClick={() => setShowPassword((value) => !value)}
                  disabled={loading}
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? "◉" : "⊙"}
                </button>
              </div>

              {error && (
                <div className="sa-error" role="alert">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="sa-primary"
              >
                <span>{loading ? "memeriksa..." : "lanjut verifikasi"}</span>
                {!loading && <span aria-hidden="true">→</span>}
              </button>

              <div className="sa-or"><span>atau</span></div>

              <a href="/login" className="sa-secondary">
                Masuk sebagai Admin biasa
              </a>
            </form>

            <div className="sa-protected">
              <div className="sa-shield" aria-hidden="true">♢</div>
              <div>
                <strong>Akses Dilindungi</strong>
                <p>
                  Halaman ini hanya untuk Superadmin.<br />
                  Keamanan diperkuat dengan Password + MFA.
                </p>
              </div>
            </div>
          </div>
        </section>
      </section>

      <style jsx>{`
        .sa-page,
        .sa-page * {
          box-sizing: border-box;
        }

        .sa-page {
          width: 100%;
          min-height: 100dvh;
          padding: 24px 24px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          overflow-x: hidden;
          color: #29412f;
          background:
            radial-gradient(circle at 14% 12%, rgba(255, 248, 225, .66), transparent 34%),
            radial-gradient(circle at 88% 88%, rgba(224, 234, 213, .42), transparent 35%),
            #f7f3e9;
        }

        .sa-shell {
          width: min(1180px, 100%);
          min-height: min(650px, calc(100dvh - 132px));
          margin: auto 0 24px;
          display: grid;
          grid-template-columns: minmax(0, .92fr) minmax(0, 1.08fr);
          gap: 24px;
        }

        .sa-brand,
        .sa-login {
          min-width: 0;
          min-height: 650px;
          border: 1px solid rgba(108, 101, 84, .12);
          border-radius: 28px;
          box-shadow: 0 22px 64px rgba(73, 68, 57, .075);
        }

        .sa-brand {
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, #fffdf8 0%, #fbf6ea 57%, #edf2e4 100%);
        }

        .sa-nature {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 50% 69%, rgba(255, 239, 192, .58), transparent 27%),
            linear-gradient(155deg, transparent 0 59%, rgba(177, 192, 158, .13) 59% 69%, transparent 69%),
            linear-gradient(205deg, transparent 0 63%, rgba(151, 174, 139, .12) 63% 76%, transparent 76%);
        }

        .sa-glow {
          position: absolute;
          left: 50%;
          bottom: 19%;
          width: 420px;
          height: 230px;
          transform: translateX(-50%);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,244,207,.58), rgba(255,246,219,.20) 48%, transparent 72%);
          filter: blur(18px);
        }

        .sa-brand-center {
          position: relative;
          z-index: 2;
          width: 88%;
          padding: 32px 22px;
          text-align: center;
          transform: translateY(-12px);
        }

        .sa-symbol {
          width: clamp(112px, 10vw, 145px);
          height: auto;
          object-fit: contain;
          filter: drop-shadow(0 5px 14px rgba(59,70,55,.06));
        }

        .sa-brand-center h2 {
          margin: 16px 0 14px;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(38px, 4vw, 55px);
          font-weight: 500;
          line-height: 1;
          letter-spacing: -.035em;
        }

        .sa-divider {
          width: 27px;
          height: 1px;
          margin: 0 auto 18px;
          background: #657262;
        }

        .sa-brand-center p {
          margin: 0;
          color: #5d675d;
          font-size: 14px;
          line-height: 1.75;
        }

        .sa-login {
          display: flex;
          align-items: center;
          padding: 54px 72px;
          background: #fff;
        }

        .sa-mobile-brand {
          display: none;
        }

        .sa-content {
          width: min(100%, 500px);
          margin: 0 auto;
        }

        .sa-eyebrow {
          margin: 0 0 12px;
          text-align: center;
          color: #63765f;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .16em;
        }

        .sa-content h1 {
          margin: 0;
          text-align: center;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(39px, 3.7vw, 52px);
          font-weight: 500;
          line-height: 1.08;
          letter-spacing: -.035em;
        }

        .sa-description {
          margin: 15px auto 31px;
          max-width: 430px;
          text-align: center;
          color: #717870;
          font-size: 14px;
          line-height: 1.65;
        }

        .sa-form {
          display: grid;
          gap: 11px;
        }

        .sa-form label {
          margin-top: 4px;
          color: #344137;
          font-size: 12px;
          font-weight: 700;
        }

        .sa-input-wrap {
          position: relative;
        }

        .sa-input-wrap input {
          width: 100%;
          height: 54px;
          padding: 0 50px 0 43px;
          border: 1px solid #dcded8;
          border-radius: 11px;
          outline: none;
          background: #fff;
          color: #303730;
          font: inherit;
          font-size: 13px;
          transition: border-color 150ms ease, box-shadow 150ms ease;
        }

        .sa-input-wrap input::placeholder {
          color: #a7aba5;
        }

        .sa-input-wrap input:focus {
          border-color: #7f917a;
          box-shadow: 0 0 0 4px rgba(118,133,115,.10);
        }

        .sa-input-icon {
          position: absolute;
          z-index: 2;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          color: #858d84;
          font-size: 16px;
          pointer-events: none;
        }

        .sa-lock {
          font-size: 15px;
          transform: translateY(-50%) rotate(180deg);
        }

        .sa-eye {
          position: absolute;
          z-index: 2;
          right: 11px;
          top: 50%;
          width: 36px;
          height: 36px;
          transform: translateY(-50%);
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: #7d857b;
          cursor: pointer;
          font-size: 18px;
        }

        .sa-eye:hover:not(:disabled) {
          background: #f5f7f3;
        }

        .sa-error {
          padding: 11px 13px;
          border: 1px solid #ecd4ce;
          border-radius: 9px;
          background: #fff6f3;
          color: #9a5143;
          font-size: 12px;
          line-height: 1.5;
        }

        .sa-primary {
          width: 100%;
          min-height: 53px;
          margin-top: 12px;
          padding: 0 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 0;
          border-radius: 999px;
          background: #6f8b64;
          color: #fff;
          cursor: pointer;
          font: inherit;
          font-size: 13px;
          font-weight: 700;
          transition: transform 150ms ease, box-shadow 150ms ease, opacity 150ms ease;
        }

        .sa-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(51,67,54,.18);
        }

        .sa-primary:disabled {
          opacity: .6;
          cursor: wait;
        }

        .sa-or {
          margin: 4px 0;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #a1a59d;
          font-size: 11px;
        }

        .sa-or::before,
        .sa-or::after {
          content: "";
          height: 1px;
          flex: 1;
          background: #ecece8;
        }

        .sa-secondary {
          width: 100%;
          min-height: 49px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #dfe3dc;
          border-radius: 999px;
          background: #fff;
          color: #435742;
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
        }

        .sa-protected {
          margin-top: 25px;
          padding: 16px 18px;
          display: flex;
          gap: 13px;
          align-items: flex-start;
          border: 1px solid #dfe6d9;
          border-radius: 12px;
          background: #f5f8f1;
          color: #425544;
        }

        .sa-shield {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #e2eadc;
          font-size: 21px;
        }

        .sa-protected strong {
          display: block;
          margin: 1px 0 5px;
          font-size: 13px;
        }

        .sa-protected p {
          margin: 0;
          color: #667065;
          font-size: 11px;
          line-height: 1.55;
        }


        @media (max-width: 1024px) {
          .sa-page { padding: 20px; }
          .sa-shell {
            min-height: calc(100dvh - 40px);
            grid-template-columns: minmax(0,.92fr) minmax(0,1.08fr);
            gap: 18px;
          }
          .sa-brand, .sa-login { min-height: 620px; }
          .sa-login { padding: 44px 38px; }
        }

        @media (max-width: 700px) {
          .sa-page {
            padding: 0;
            align-items: stretch;
            background: #fff;
          }

          .sa-shell {
            width: 100%;
            min-height: auto;
            display: block;
            margin: 0;
          }

          .sa-brand {
            display: none;
          }

          .sa-login {
            width: 100%;
            min-height: calc(100dvh - 96px);
            padding:
              max(24px, env(safe-area-inset-top))
              22px
              max(28px, env(safe-area-inset-bottom));
            display: flex;
            flex-direction: column;
            align-items: stretch;
            border: 0;
            border-radius: 0;
            box-shadow: none;
          }

          .sa-mobile-brand {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 44px;
            color: #536454;
            font-family: Georgia, "Times New Roman", serif;
            font-size: 14px;
          }

          .sa-mobile-brand img {
            width: 32px;
            height: 32px;
            object-fit: contain;
          }

          .sa-content {
            width: 100%;
            margin: auto 0;
          }

          .sa-content h1 { font-size: 35px; }
          .sa-description { margin-bottom: 25px; }
          .sa-protected { margin-top: 22px; }
        }
      `}</style>
    </main>
  );
}
