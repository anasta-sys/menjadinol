import { redirect } from "next/navigation";
import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";

import { createClient } from
  "@/lib/supabase/server";

export const metadata = {
  title: "Riwayat Login Reader",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

type LoginRow = {
  id: number;
  user_id: string;
  email: string;
  reader_name: string | null;
  logged_in_at: string;
  device: string;
  os: string;
  browser: string;
};

function formatJakarta(
  value: string
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }
  ).format(date) + " WIB";
}

export default async function
ReaderLoginHistoryPage() {
  /*
   * Validasi admin + MFA menggunakan
   * mekanisme admin yang sudah ada.
   */
  const supabase =
    await createClient();

  const {
    data: claims,
    error: claimsError,
  } =
    await supabase.auth.getClaims();

  if (
    claimsError ||
    !claims?.claims?.sub
  ) {
    redirect("/login");
  }

  const { data: aal } =
    await supabase.auth
      .mfa
      .getAuthenticatorAssuranceLevel();

  if (
    aal?.currentLevel !== "aal2"
  ) {
    redirect("/login");
  }

  const userId =
    claims.claims.sub as string;

  const { data: adminUser } =
    await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

  if (!adminUser) {
    redirect("/login");
  }

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRole =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error(
      "Konfigurasi server admin belum lengkap."
    );
  }

  /*
   * Login history sengaja hanya dapat
   * dibaca service-role setelah admin + MFA lolos.
   */
  const admin =
    createAdminClient(
      url,
      serviceRole,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

  const {
    data,
    error,
  } =
    await admin
      .from("reader_login_history")
      .select(
        "id,user_id,email,reader_name,logged_in_at,device,os,browser"
      )
      .order(
        "logged_in_at",
        { ascending: false }
      )
      .limit(500);

  if (error) {
    console.error(
      "Reader login history read error:",
      error
    );
  }

  const rows =
    (data ?? []) as LoginRow[];

  const uniqueUsers =
    new Set(
      rows.map((row) => row.user_id)
    ).size;

  const todayJakarta =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).format(new Date());

  const loginsToday =
    rows.filter((row) => {
      const day =
        new Intl.DateTimeFormat(
          "en-CA",
          {
            timeZone: "Asia/Jakarta",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }
        ).format(
          new Date(row.logged_in_at)
        );

      return day === todayJakarta;
    }).length;

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>
              reader security
            </p>

            <h1 style={styles.title}>
              Riwayat login pembaca
            </h1>

            <p style={styles.subtitle}>
              Login berhasil setelah password + OTP.
              Waktu ditampilkan dalam WIB.
            </p>
          </div>

          <a
            href="/admin"
            style={styles.backButton}
          >
            ← kembali ke dashboard
          </a>
        </header>

        <section style={styles.statsGrid}>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>
              Total login tercatat
            </span>
            <strong style={styles.statValue}>
              {rows.length.toLocaleString("id-ID")}
            </strong>
          </div>

          <div style={styles.statCard}>
            <span style={styles.statLabel}>
              User unik
            </span>
            <strong style={styles.statValue}>
              {uniqueUsers.toLocaleString("id-ID")}
            </strong>
          </div>

          <div style={styles.statCard}>
            <span style={styles.statLabel}>
              Login hari ini
            </span>
            <strong style={styles.statValue}>
              {loginsToday.toLocaleString("id-ID")}
            </strong>
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.cardHead}>
            <div>
              <h2 style={styles.cardTitle}>
                Aktivitas login
              </h2>
              <p style={styles.cardText}>
                Menampilkan maksimal 500 login terbaru.
              </p>
            </div>
          </div>

          {error && (
            <div style={styles.errorBox}>
              Riwayat login belum dapat dibaca.
              Pastikan SQL 012 sudah dijalankan.
            </div>
          )}

          {!error && rows.length === 0 && (
            <div style={styles.empty}>
              Belum ada riwayat login.
              Login baru akan tercatat setelah fitur ini aktif.
            </div>
          )}

          {!error && rows.length > 0 && (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Nama / Email</th>
                    <th style={styles.th}>Tanggal & Jam</th>
                    <th style={styles.th}>Device</th>
                    <th style={styles.th}>OS</th>
                    <th style={styles.th}>Browser</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td style={styles.td}>
                        <strong style={styles.name}>
                          {row.reader_name || "Reader"}
                        </strong>
                        <div style={styles.email}>
                          {row.email}
                        </div>
                      </td>

                      <td style={styles.td}>
                        {formatJakarta(
                          row.logged_in_at
                        )}
                      </td>

                      <td style={styles.td}>
                        {row.device}
                      </td>

                      <td style={styles.td}>
                        {row.os}
                      </td>

                      <td style={styles.td}>
                        {row.browser}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const styles: Record<
  string,
  React.CSSProperties
> = {
  page: {
    minHeight: "100dvh",
    background: "#f5f1e8",
    padding: "32px 18px",
    color: "#303b32",
  },
  shell: {
    width: "min(1280px, 100%)",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "18px",
    flexWrap: "wrap",
    marginBottom: "22px",
  },
  eyebrow: {
    margin: "0 0 6px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    fontSize: "12px",
    color: "#77816f",
  },
  title: {
    margin: 0,
    fontFamily: "Georgia, serif",
    fontWeight: 500,
    fontSize: "clamp(30px, 5vw, 46px)",
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#697169",
    lineHeight: 1.6,
  },
  backButton: {
    textDecoration: "none",
    color: "#3f5142",
    border: "1px solid rgba(63,81,66,.20)",
    background: "rgba(255,255,255,.72)",
    borderRadius: "12px",
    padding: "11px 14px",
    fontSize: "14px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "12px",
    marginBottom: "16px",
  },
  statCard: {
    background: "rgba(255,255,255,.80)",
    border: "1px solid rgba(63,81,66,.10)",
    borderRadius: "18px",
    padding: "18px",
    boxShadow:
      "0 10px 30px rgba(73,68,55,.05)",
  },
  statLabel: {
    display: "block",
    color: "#737b73",
    fontSize: "13px",
    marginBottom: "8px",
  },
  statValue: {
    fontSize: "28px",
    fontWeight: 600,
  },
  card: {
    background: "rgba(255,255,255,.86)",
    border: "1px solid rgba(63,81,66,.10)",
    borderRadius: "22px",
    padding: "18px",
    boxShadow:
      "0 14px 38px rgba(73,68,55,.06)",
  },
  cardHead: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "14px",
  },
  cardTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 600,
  },
  cardText: {
    margin: "5px 0 0",
    color: "#747b74",
    fontSize: "13px",
  },
  tableWrap: {
    width: "100%",
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
    borderRadius: "14px",
    border: "1px solid rgba(63,81,66,.09)",
  },
  table: {
    width: "100%",
    minWidth: "900px",
    borderCollapse: "collapse",
    background: "#fff",
  },
  th: {
    textAlign: "left",
    padding: "13px 14px",
    fontSize: "12px",
    color: "#697169",
    background: "#f1f3ec",
    borderBottom:
      "1px solid rgba(63,81,66,.10)",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "14px",
    fontSize: "13px",
    verticalAlign: "top",
    borderBottom:
      "1px solid rgba(63,81,66,.08)",
  },
  name: {
    display: "block",
    fontSize: "14px",
    marginBottom: "4px",
  },
  email: {
    color: "#737b73",
    fontSize: "12px",
  },
  errorBox: {
    padding: "14px",
    borderRadius: "12px",
    background: "#fff0ee",
    color: "#954e48",
  },
  empty: {
    padding: "30px 12px",
    textAlign: "center",
    color: "#747b74",
  },
};
