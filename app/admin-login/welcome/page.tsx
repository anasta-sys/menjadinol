import Link from "next/link";
import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/admin-auth";

export const metadata = {
  title: "Selamat Datang · kembali ke nol",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function AdminWelcomePage() {
  let session;

  try {
    session = await requireAdminSession();
  } catch (error) {
    console.error(
      "Admin welcome session check failed:",
      error
    );

    redirect("/admin-login");
  }

  /*
   * Halaman welcome ini khusus Admin.
   * Superadmin tetap menggunakan alurnya sendiri.
   */
  if (session.role === "superadmin") {
    redirect("/admin/superadmin");
  }

  if (session.role !== "admin") {
    redirect("/admin-login");
  }

  const {
    data: profile,
    error: profileError,
  } = await session.supabase
    .from("admin_users")
    .select("display_name")
    .eq("user_id", session.userId)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Failed to load Admin profile:",
      profileError
    );
  }

  const displayName =
    profile?.display_name?.trim() || "Admin";

  return (
    <main className="welcome-page">
      <section className="welcome-shell">
        {/* KIRI */}
        <aside className="welcome-brand">
          <div className="brand-content">
            <img
              src="/jalan-pulang-symbol.png"
              alt=""
              className="brand-symbol"
            />

            <h2>kembali ke nol</h2>

            <div className="brand-line" />

            <p>
              Ruang untuk berhenti, merasa,
              <br />
              memahami, dan kembali ke nol.
            </p>
          </div>
        </aside>

        {/* KANAN */}
        <section className="welcome-content">
          <div className="welcome-inner">
            <p className="eyebrow">
              ADMIN ACCESS
            </p>

            <h1>
              Halo, {displayName} 👋
            </h1>

            <p className="description">
              Selamat datang kembali.
              Autentikasi akun kamu telah berhasil.
            </p>

            <div className="welcome-message">
              <span className="message-icon">
                ◇
              </span>

              <div>
                <strong>
                  Ruang Admin siap digunakan
                </strong>

                <p>
                  Silakan mulai membuat,
                  mengelola, dan meninjau konten
                  untuk ruang Kembali ke Nol.
                </p>
              </div>
            </div>

            <Link
              href="/admin"
              className="dashboard-button"
            >
              <span>Masuk ke Dashboard</span>
              <span aria-hidden="true">→</span>
            </Link>

            <p className="secure-note">
              Session telah diverifikasi dengan
              Password + MFA.
            </p>
          </div>
        </section>
      </section>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .welcome-page {
          width: 100%;
          min-height: 100dvh;
          padding: 24px;
          display: grid;
          place-items: center;
          background:
            radial-gradient(
              circle at 14% 12%,
              rgba(255,248,225,.66),
              transparent 34%
            ),
            radial-gradient(
              circle at 88% 88%,
              rgba(224,234,213,.42),
              transparent 35%
            ),
            #f7f3e9;
          color: #29412f;
        }

        .welcome-shell {
          width: min(1120px, 100%);
          min-height: 620px;
          display: grid;
          grid-template-columns:
            minmax(0,.92fr)
            minmax(0,1.08fr);
          gap: 24px;
        }

        .welcome-brand,
        .welcome-content {
          min-width: 0;
          min-height: 620px;
          border: 1px solid
            rgba(108,101,84,.12);
          border-radius: 28px;
          box-shadow:
            0 22px 64px
            rgba(73,68,57,.075);
        }

        .welcome-brand {
          display: grid;
          place-items: center;
          overflow: hidden;
          background:
            linear-gradient(
              180deg,
              #fffdf8 0%,
              #fbf6ea 57%,
              #edf2e4 100%
            );
        }

        .brand-content {
          width: 88%;
          padding: 32px 22px;
          text-align: center;
        }

        .brand-symbol {
          width: 135px;
          height: auto;
          object-fit: contain;
        }

        .brand-content h2 {
          margin: 18px 0 14px;
          font-family:
            Georgia,
            "Times New Roman",
            serif;
          font-size:
            clamp(38px,4vw,54px);
          font-weight: 500;
          line-height: 1;
          letter-spacing: -.035em;
        }

        .brand-line {
          width: 28px;
          height: 1px;
          margin: 0 auto 18px;
          background: #657262;
        }

        .brand-content p {
          margin: 0;
          color: #5d675d;
          font-size: 14px;
          line-height: 1.75;
        }

        .welcome-content {
          display: flex;
          align-items: center;
          padding: 60px 72px;
          background: #fff;
        }

        .welcome-inner {
          width: min(100%, 500px);
          margin: 0 auto;
        }

        .eyebrow {
          margin: 0 0 12px;
          color: #71806d;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .16em;
        }

        .welcome-inner h1 {
          margin: 0;
          font-family:
            Georgia,
            "Times New Roman",
            serif;
          font-size:
            clamp(40px,4vw,56px);
          font-weight: 500;
          line-height: 1.08;
          letter-spacing: -.035em;
        }

        .description {
          margin: 18px 0 28px;
          max-width: 430px;
          color: #717870;
          font-size: 14px;
          line-height: 1.7;
        }

        .welcome-message {
          margin-bottom: 28px;
          padding: 18px;
          display: flex;
          gap: 14px;
          align-items: flex-start;
          border: 1px solid #dfe6d9;
          border-radius: 14px;
          background: #f5f8f1;
        }

        .message-icon {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #e2eadc;
          font-size: 22px;
        }

        .welcome-message strong {
          display: block;
          margin: 1px 0 6px;
          font-size: 13px;
        }

        .welcome-message p {
          margin: 0;
          color: #667065;
          font-size: 12px;
          line-height: 1.6;
        }

        .dashboard-button {
          width: 100%;
          min-height: 54px;
          padding: 0 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-radius: 999px;
          background: #6f8b64;
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          transition:
            transform 150ms ease,
            box-shadow 150ms ease;
        }

        .dashboard-button:hover {
          transform: translateY(-1px);
          box-shadow:
            0 10px 24px
            rgba(51,67,54,.18);
        }

        .secure-note {
          margin: 15px 0 0;
          text-align: center;
          color: #90978f;
          font-size: 11px;
        }

        @media (max-width: 700px) {
          .welcome-page {
            padding: 0;
            background: #fff;
          }

          .welcome-shell {
            width: 100%;
            min-height: 100dvh;
            display: block;
          }

          .welcome-brand {
            display: none;
          }

          .welcome-content {
            width: 100%;
            min-height: 100dvh;
            padding:
              max(
                30px,
                env(safe-area-inset-top)
              )
              22px
              max(
                30px,
                env(safe-area-inset-bottom)
              );
            border: 0;
            border-radius: 0;
            box-shadow: none;
          }

          .welcome-inner {
            margin: auto;
          }

          .welcome-inner h1 {
            font-size: 38px;
          }
        }
      `}</style>
    </main>
  );
}