import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { signOut } from "./actions";
import type { AdminRole } from "@/lib/admin-auth";
import styles from "./DashboardOverview.module.css";

type EntryRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  published_at?: string | null;
  created_at?: string | null;
  attachment_path?: string | null;
  folder_id?: string | null;
};

type FolderRow = {
  id: string;
  section: string;
  title: string;
  slug: string;
};

type ViewRow = {
  id?: string;
  session_id: string;
  path: string;
  referrer?: string | null;
  device_type?: string | null;
  created_at: string;
};

type ReaderLoginRow = {
  id: number;
  user_id: string;
  email: string;
  reader_name?: string | null;
  logged_in_at: string;
  device?: string | null;
  os?: string | null;
  browser?: string | null;
};


export type AnalyticsPeriod = "7d" | "30d" | "3m" | "6m" | "1y" | "all";

const analyticsPeriods: {
  key: AnalyticsPeriod;
  label: string;
  badge: string;
}[] = [
  { key: "7d", label: "7 Hari", badge: "7 hari terakhir" },
  { key: "30d", label: "30 Hari", badge: "30 hari terakhir" },
  { key: "3m", label: "3 Bulan", badge: "3 bulan terakhir" },
  { key: "6m", label: "6 Bulan", badge: "6 bulan terakhir" },
  { key: "1y", label: "1 Tahun", badge: "1 tahun terakhir" },
  { key: "all", label: "Semua", badge: "semua waktu" },
];

function periodStart(period: AnalyticsPeriod) {
  if (period === "all") return null;

  const date = new Date();

  if (period === "7d") date.setDate(date.getDate() - 6);
  if (period === "30d") date.setDate(date.getDate() - 29);
  if (period === "3m") date.setMonth(date.getMonth() - 3);
  if (period === "6m") date.setMonth(date.getMonth() - 6);
  if (period === "1y") date.setFullYear(date.getFullYear() - 1);

  date.setHours(0, 0, 0, 0);
  return date;
}

async function fetchPageViews(
  adminSupabase: any,
  period: AnalyticsPeriod
) {
  if (!adminSupabase) {
    return {
      data: null,
      error: new Error("SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi."),
    };
  }

  const start = periodStart(period);
  const pageSize = 1000;
  const maxPages = 100;
  const rows: ViewRow[] = [];

  for (let page = 0; page < maxPages; page += 1) {
    let query = adminSupabase
      .from("page_views")
      .select("id,session_id,path,referrer,device_type,created_at")
      .order("created_at", { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1);

    if (start) {
      query = query.gte("created_at", start.toISOString());
    }

    const result = await query;

    if (result.error) {
      return { data: null, error: result.error };
    }

    const chunk = (result.data ?? []) as ViewRow[];
    rows.push(...chunk);

    if (chunk.length < pageSize) break;
  }

  return { data: rows, error: null };
}

const sectionLabel: Record<string, string> = {
  tentang: "Tentang",
  layanan: "Perjalanan",
  "ruang-belajar": "Ruang Belajar",
  sinopsis: "Sinopsis",
  artikel: "Artikel",
  kontak: "Kontak",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function shortSession(value: string) {
  if (!value) return "anonim";
  return `anon-${value.replace(/-/g, "").slice(0, 8)}`;
}

function startOfDay(date = new Date()) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export default async function DashboardOverview({
  analyticsPeriod = "30d",
  adminRole = "admin",
}: {
  analyticsPeriod?: AnalyticsPeriod;
  adminRole?: AdminRole;
}) {
  const supabase = await createClient();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const adminSupabase =
    supabaseUrl && serviceRoleKey
      ? createAdminClient(supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        })
      : null;

  const [
    foldersResult,
    entriesResult,
    viewsResult,
    claimsResult,
    readerLoginsResult,
  ] = await Promise.all([
    supabase
      .from("content_folders")
      .select("id,section,title,slug"),

    supabase
      .from("content_folder_entries")
      .select(
        "id,title,slug,status,published_at,created_at,attachment_path,folder_id"
      )
      .order("created_at", { ascending: false }),

    fetchPageViews(adminSupabase, analyticsPeriod),

    supabase.auth.getClaims(),

    adminSupabase
      ? adminSupabase
          .from("reader_login_history")
          .select(
            "id,user_id,email,reader_name,logged_in_at,device,os,browser"
          )
          .order("logged_in_at", { ascending: false })
          .limit(6)
      : Promise.resolve({
          data: null,
          error: new Error("SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi."),
        }),
  ]);

  const folders = (foldersResult.data ?? []) as FolderRow[];
  const entries = (entriesResult.data ?? []) as EntryRow[];
  const views = (viewsResult.data ?? []) as ViewRow[];
  const readerLogins =
    (readerLoginsResult.data ?? []) as ReaderLoginRow[];

  const analyticsReady = !viewsResult.error;
  const readerLoginHistoryReady = !readerLoginsResult.error;

  const adminEmail =
    (claimsResult.data?.claims?.email as string | undefined) ?? "Admin";

  const folderMap = new Map(
    folders.map((folder) => [folder.id, folder] as const)
  );

  const published = entries.filter((entry) => entry.status === "published");
  const review = entries.filter((entry) => entry.status === "review");
  const drafts = entries.filter((entry) => entry.status === "draft");
  const mediaCount = entries.filter((entry) => entry.attachment_path).length;

  const todayStart = startOfDay();

  const todayViews = views.filter(
    (view) => new Date(view.created_at) >= todayStart
  );

  const activeCutoff = Date.now() - 5 * 60 * 1000;
  const activeSessions = new Map<string, ViewRow>();

  for (const view of views) {
    if (
      new Date(view.created_at).getTime() >= activeCutoff &&
      !activeSessions.has(view.session_id)
    ) {
      activeSessions.set(view.session_id, view);
    }
  }

  const uniqueSessionsPeriod =
    new Set(views.map((view) => view.session_id)).size;

  const selectedPeriod =
    analyticsPeriods.find((item) => item.key === analyticsPeriod) ??
    analyticsPeriods[1];

  const uniqueSessionsToday =
    new Set(todayViews.map((view) => view.session_id)).size;

  const popularMap = new Map<string, number>();

  for (const view of views) {
    popularMap.set(
      view.path,
      (popularMap.get(view.path) ?? 0) + 1
    );
  }

  const popularPages = [...popularMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  type ChartBucket = {
    key: string;
    label: string;
    value: number;
  };

  const chartBuckets: ChartBucket[] = [];

  if (analyticsPeriod === "7d" || analyticsPeriod === "30d") {
    const days = analyticsPeriod === "7d" ? 7 : 30;

    for (let index = 0; index < days; index += 1) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - index));
      date.setHours(0, 0, 0, 0);

      const key = dayKey(date);
      const value = views.filter(
        (view) => dayKey(new Date(view.created_at)) === key
      ).length;

      chartBuckets.push({
        key,
        label: new Intl.DateTimeFormat("id-ID", {
          day: "2-digit",
          month: "short",
        }).format(date),
        value,
      });
    }
  } else {
    const monthCount =
      analyticsPeriod === "3m"
        ? 4
        : analyticsPeriod === "6m"
          ? 7
          : analyticsPeriod === "1y"
            ? 13
            : null;

    let firstMonth: Date;

    if (monthCount) {
      firstMonth = new Date();
      firstMonth.setDate(1);
      firstMonth.setHours(0, 0, 0, 0);
      firstMonth.setMonth(firstMonth.getMonth() - (monthCount - 1));
    } else if (views.length > 0) {
      const oldest = views.reduce((oldestView, view) =>
        new Date(view.created_at) < new Date(oldestView.created_at)
          ? view
          : oldestView
      );

      firstMonth = new Date(oldest.created_at);
      firstMonth.setDate(1);
      firstMonth.setHours(0, 0, 0, 0);
    } else {
      firstMonth = new Date();
      firstMonth.setDate(1);
      firstMonth.setHours(0, 0, 0, 0);
    }

    const cursor = new Date(firstMonth);
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    while (cursor <= currentMonth) {
      const year = cursor.getFullYear();
      const month = cursor.getMonth();

      const value = views.filter((view) => {
        const date = new Date(view.created_at);
        return date.getFullYear() === year && date.getMonth() === month;
      }).length;

      chartBuckets.push({
        key: `${year}-${String(month + 1).padStart(2, "0")}`,
        label: new Intl.DateTimeFormat("id-ID", {
          month: "short",
          year: analyticsPeriod === "all" ? "2-digit" : undefined,
        }).format(cursor),
        value,
      });

      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  const maxChart = Math.max(
    1,
    ...chartBuckets.map((bucket) => bucket.value)
  );

  const recentEntries = entries.slice(0, 6);
  const recentVisits = [...activeSessions.values()].slice(0, 6);

  const sectionCounts =
    folders.reduce<Record<string, number>>(
      (acc, folder) => {
        acc[folder.section] =
          (acc[folder.section] ?? 0) + 1;
        return acc;
      },
      {}
    );

  return (
    <section className={styles.dashboard}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandLogoWrap}>
            <img
              src="/jalan-pulang-symbol.png"
              alt="Logo kembali ke nol"
              className={styles.brandLogo}
            />
          </div>

          <div>
            <strong>kembali ke nol</strong>
            <span>Spiritual Journey</span>
          </div>
        </div>

        <nav className={styles.nav}>
          <a
            className={styles.navActive}
            href="#dashboard-overview"
          >
            <span>⌂</span>
            Dashboard
          </a>

          <p>KONTEN</p>
          <a href="#content-manager">
            <span>✦</span>
            Kelola Konten
          </a>
          <Link href="/ruang-belajar">
            <span>▤</span>
            Ruang Belajar
          </Link>
          <Link href="/artikel">
            <span>✎</span>
            Artikel
          </Link>
          <a href="#media">
            <span>▣</span>
            Media
          </a>
          <a href="#ringkasan">
            <span>◇</span>
            Kategori
          </a>

          <p>ANALYTICS</p>
          <a href="#analytics">
            <span>◉</span>
            Pengunjung
          </a>
          <a href="#popular">
            <span>⌁</span>
            Halaman Populer
          </a>
          <a href="#activity">
            <span>◷</span>
            Aktivitas
          </a>
          <a href="#reader-logins">
            <span>♙</span>
            Login Pembaca
          </a>

          <p>PENGATURAN</p>
          <a href="#status">
            <span>⚙</span>
            Pengaturan
          </a>
          <a href="#admin-account">
            <span>♙</span>
            Akun Admin
          </a>
        </nav>

        <div className={styles.privacyCard}>
          <span className={styles.privacyIcon}>♙</span>
          <div>
            <strong>Privasi Terjaga</strong>
            <p>
              Data pengunjung bersifat anonim dan tidak
              menyimpan identitas pribadi.
            </p>
          </div>
        </div>

        <div className={styles.sidebarBottom}>
          <Link
            className={styles.siteButton}
            href="/"
            target="_blank"
          >
            Lihat Website ↗
          </Link>

          <form action={signOut}>
            <button
              className={styles.logoutButton}
              type="submit"
            >
              Keluar
            </button>
          </form>
        </div>
      </aside>

      <div className={styles.main} id="dashboard-overview">
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>{adminRole === "writer" ? "PRIVATE PENULIS" : "PRIVATE ADMIN"}</p>

            <h1>Selamat datang kembali.</h1>

            <p>
              Berikut ringkasan aktivitas website dan
              pengelolaan kontenmu.
            </p>
          </div>

          <div
            className={styles.adminMeta}
            id="admin-account"
          >
            <img
              src="/jalan-pulang-symbol.png"
              alt=""
              className={styles.adminLogo}
            />

            <div>
              <strong>{adminRole === "writer" ? "Penulis" : adminRole === "superadmin" ? "Superadmin" : "Admin"}</strong>
              <span>{adminEmail}</span>
            </div>
          </div>
        </header>

        <div className={styles.statGrid}>
          <article className={`${styles.statCard} ${styles.statPurple}`}>
            <span className={styles.statIcon}>♙</span>
            <div>
              <p>Pengunjung Hari Ini</p>
              <strong>
                {analyticsReady ? uniqueSessionsToday : "—"}
              </strong>
              <span>
                {analyticsReady
                  ? `${todayViews.length} page views`
                  : "Analytics belum diaktifkan"}
              </span>
            </div>
          </article>

          <article className={`${styles.statCard} ${styles.statMint}`}>
            <span className={styles.statIcon}>⌁</span>
            <div>
              <p>Pengunjung Aktif</p>
              <strong>
                {analyticsReady ? activeSessions.size : "—"}
              </strong>
              <span>5 menit terakhir</span>
            </div>
          </article>

          <article className={`${styles.statCard} ${styles.statBlue}`}>
            <span className={styles.statIcon}>◉</span>
            <div>
              <p>Total Pengunjung</p>
              <strong>
                {analyticsReady ? uniqueSessionsPeriod : "—"}
              </strong>
              <span>{selectedPeriod.badge}</span>
            </div>
          </article>

          <article className={`${styles.statCard} ${styles.statPeach}`}>
            <span className={styles.statIcon}>↗</span>
            <div>
              <p>Total Page View</p>
              <strong>
                {analyticsReady ? views.length : "—"}
              </strong>
              <span>{selectedPeriod.badge}</span>
            </div>
          </article>
        </div>

        <div
          className={styles.analyticsGrid}
          id="analytics"
        >
          <article className={styles.largeCard}>
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.eyebrow}>
                  ANALYTICS
                </p>
                <h2>Grafik Pengunjung</h2>
              </div>

              <span className={styles.softBadge}>
                {selectedPeriod.badge}
              </span>
            </div>

            {analyticsReady ? (
              <>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    marginBottom: "18px",
                  }}
                >
                  {analyticsPeriods.map((period) => {
                    const active = period.key === analyticsPeriod;

                    return (
                      <Link
                        key={period.key}
                        href={`/admin?period=${period.key}#analytics`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: "34px",
                          padding: "7px 11px",
                          borderRadius: "999px",
                          border: active
                            ? "1px solid rgba(70, 91, 76, .42)"
                            : "1px solid rgba(70, 91, 76, .16)",
                          background: active
                            ? "rgba(110, 139, 119, .15)"
                            : "rgba(255,255,255,.55)",
                          color: "inherit",
                          textDecoration: "none",
                          fontSize: "12px",
                          fontWeight: active ? 700 : 600,
                        }}
                      >
                        {period.label}
                      </Link>
                    );
                  })}
                </div>

                <div
                  className={styles.chart}
                  style={{
                    overflowX: chartBuckets.length > 14 ? "auto" : undefined,
                    paddingBottom: chartBuckets.length > 14 ? "8px" : undefined,
                  }}
                >
                  {chartBuckets.map((bucket) => (
                    <div
                      className={styles.chartColumn}
                      key={bucket.key}
                      style={{
                        minWidth:
                          chartBuckets.length > 14 ? "42px" : undefined,
                      }}
                    >
                      <div className={styles.chartValue}>
                        {bucket.value}
                      </div>

                      <div className={styles.barTrack}>
                        <div
                          className={styles.bar}
                          style={{
                            height: `${Math.max(
                              8,
                              (bucket.value / maxChart) * 100
                            )}%`,
                          }}
                        />
                      </div>

                      <span>{bucket.label}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className={styles.emptyAnalytics}>
                Jalankan migration analytics untuk mulai
                membaca kunjungan website.
              </div>
            )}
          </article>

          <article
            className={styles.card}
            id="popular"
          >
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.eyebrow}>
                  POPULAR
                </p>
                <h2>Halaman Populer</h2>
              </div>
            </div>

            <div className={styles.popularList}>
              {popularPages.length === 0 ? (
                <p className={styles.emptyText}>
                  Belum ada data kunjungan.
                </p>
              ) : (
                popularPages.map(
                  ([path, count], index) => {
                    const percent =
                      views.length > 0
                        ? Math.round(
                            (count / views.length) * 100
                          )
                        : 0;

                    return (
                      <div
                        className={styles.popularRow}
                        key={path}
                      >
                        <span className={styles.rank}>
                          {index + 1}
                        </span>

                        <div className={styles.popularCopy}>
                          <strong>{path}</strong>
                          <div
                            className={styles.popularTrack}
                          >
                            <div
                              className={
                                styles.popularProgress
                              }
                              style={{
                                width: `${Math.max(
                                  percent,
                                  4
                                )}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className={styles.popularMeta}>
                          <strong>{count}</strong>
                          <small>{percent}%</small>
                        </div>
                      </div>
                    );
                  }
                )
              )}
            </div>
          </article>
        </div>

        <article
          className={styles.card}
          id="reader-logins"
          style={{ marginBottom: "22px" }}
        >
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.eyebrow}>
                READER SECURITY
              </p>
              <h2>Login Pembaca Terbaru</h2>
            </div>

            <Link href="/admin/reader-logins">
              Lihat semua →
            </Link>
          </div>

          <div className={styles.activityList}>
            {!readerLoginHistoryReady ? (
              <p className={styles.emptyText}>
                Riwayat login belum dapat dibaca.
              </p>
            ) : readerLogins.length === 0 ? (
              <p className={styles.emptyText}>
                Belum ada login pembaca yang tercatat.
              </p>
            ) : (
              readerLogins.map((login) => (
                <div
                  className={styles.activityRow}
                  key={login.id}
                >
                  <span className={styles.roundIcon}>
                    ♙
                  </span>

                  <div>
                    <strong>
                      {login.reader_name || "Reader"}
                    </strong>
                    <span>{login.email}</span>
                  </div>

                  <small>
                    {formatDate(login.logged_in_at)}
                    {" · "}
                    {[
                      login.device,
                      login.os,
                      login.browser,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Device tidak diketahui"}
                  </small>
                </div>
              ))
            )}
          </div>
        </article>

        <div
          className={styles.contentGrid}
          id="activity"
        >
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.eyebrow}>
                  LIVE
                </p>
                <h2>Aktivitas Terbaru</h2>
              </div>

              <span className={styles.onlineDot}>
                {analyticsReady
                  ? `${activeSessions.size} online`
                  : "0 online"}
              </span>
            </div>

            <div className={styles.activityList}>
              {recentVisits.length === 0 ? (
                <p className={styles.emptyText}>
                  Belum ada aktivitas aktif.
                </p>
              ) : (
                recentVisits.map((view) => (
                  <div
                    className={styles.activityRow}
                    key={view.session_id}
                  >
                    <span
                      className={styles.roundIcon}
                    >
                      ♙
                    </span>

                    <div>
                      <strong>
                        {shortSession(
                          view.session_id
                        )}
                      </strong>
                      <span>{view.path}</span>
                    </div>

                    <small>
                      {view.device_type ??
                        "unknown"}
                    </small>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.eyebrow}>
                  CONTENT
                </p>
                <h2>Konten Terbaru</h2>
              </div>

              <a href="#content-manager">
                Kelola →
              </a>
            </div>

            <div className={styles.contentList}>
              {recentEntries.length === 0 ? (
                <p className={styles.emptyText}>
                  Belum ada konten.
                </p>
              ) : (
                recentEntries.map((entry) => {
                  const folder =
                    entry.folder_id
                      ? folderMap.get(
                          entry.folder_id
                        )
                      : undefined;

                  return (
                    <div
                      className={styles.contentRow}
                      key={entry.id}
                    >
                      <span
                        className={
                          styles.contentIcon
                        }
                      >
                        ▤
                      </span>

                      <div
                        className={
                          styles.contentCopy
                        }
                      >
                        <strong>
                          {entry.title}
                        </strong>
                        <span>
                          {folder
                            ? sectionLabel[
                                folder.section
                              ] ??
                              folder.section
                            : "Konten"}
                        </span>
                      </div>

                      <div
                        className={
                          styles.contentMeta
                        }
                      >
                        <span
                          className={`${styles.status} ${
                            entry.status ===
                            "published"
                              ? styles.published
                              : entry.status ===
                                  "review"
                                ? styles.review
                                : styles.draft
                          }`}
                        >
                          {entry.status}
                        </span>

                        <small>
                          {formatDate(
                            entry.published_at ??
                              entry.created_at
                          )}
                        </small>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </article>

          <article
            className={styles.card}
            id="ringkasan"
          >
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.eyebrow}>
                  RINGKASAN
                </p>
                <h2>Ringkasan Per Bagian</h2>
              </div>
            </div>

            <div className={styles.summaryList}>
              {Object.entries(sectionLabel).map(
                ([key, label], index) => (
                  <div key={key}>
                    <span
                      className={`${styles.summaryDot} ${
                        styles[
                          `summaryDot${
                            (index % 6) + 1
                          }`
                        ]
                      }`}
                    />

                    <span>{label}</span>

                    <strong>
                      {sectionCounts[key] ?? 0}
                    </strong>
                  </div>
                )
              )}

              <div className={styles.summaryTotal}>
                <span>Total Konten</span>
                <strong>
                  {entries.length}
                </strong>
              </div>
            </div>
          </article>
        </div>

        <article
          className={styles.manageCard}
          id="status"
        >
          <div className={styles.manageIntro}>
            <img
              src="/jalan-pulang-symbol.png"
              alt=""
              className={styles.manageLogo}
            />

            <div>
              <p className={styles.eyebrow}>
                KELOLA WEBSITE
              </p>

              <h2>Kelola Konten Website</h2>

              <p>
                Kelola artikel, ruang belajar,
                media, dan semua konten website
                dengan mudah dan aman.
              </p>
            </div>
          </div>

          <div className={styles.manageActions}>
            <a href="#content-manager">
              <span className={styles.actionPurple}>
                ▤
              </span>
              <strong>Tambah Artikel</strong>
              <small>Buat artikel baru</small>
            </a>

            <a href="#content-manager">
              <span className={styles.actionBlue}>
                ▧
              </span>
              <strong>Tambah Materi</strong>
              <small>Tambah materi belajar</small>
            </a>

            <a href="#content-manager" id="media">
              <span className={styles.actionMint}>
                ▣
              </span>
              <strong>Upload Media</strong>
              <small>Gambar / PDF</small>
            </a>

            <a href="#content-manager">
              <span className={styles.actionPink}>
                ◇
              </span>
              <strong>Kelola Kategori</strong>
              <small>Atur konten</small>
            </a>
          </div>
        </article>

        <footer className={styles.footer}>
          <img
            src="/jalan-pulang-symbol.png"
            alt=""
          />

          <strong>kembali ke nol</strong>

          <span>•</span>

          <span>Privasi Terjaga</span>

          <span>•</span>

          <span>© 2026</span>
        </footer>
      </div>
    </section>
  );
}
