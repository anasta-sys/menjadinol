import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const metadata = {
  title: "Monitoring Sistem | Menjadi Nol",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

type LogStatus = "new" | "read" | "resolved";
type LogSeverity = "info" | "warning" | "error" | "critical";

type SystemLog = {
  id: string;
  created_at: string;
  severity: LogSeverity;
  module: string;
  action: string | null;
  error_code: string | null;
  technical_message: string | null;
  user_message: string | null;
  user_email: string | null;
  user_type: "reader" | "writer" | "admin" | "superadmin" | "system" | null;
  request_path: string | null;
  status: LogStatus;
  read_at: string | null;
  resolved_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Konfigurasi server Supabase belum lengkap.");
  }

  return createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function requireSuperadmin() {
  const supabase = await createClient();

  const { data: claims, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claims?.claims?.sub) {
    redirect("/login");
  }

  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aal?.currentLevel !== "aal2") {
    redirect("/login");
  }

  const userId = claims.claims.sub as string;

  const { data: profile } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profile || profile.role !== "superadmin") {
    redirect("/admin");
  }
}

async function updateLogStatus(formData: FormData) {
  "use server";

  await requireSuperadmin();

  const id = String(formData.get("id") ?? "");
  const nextStatus = String(formData.get("status") ?? "");

  if (!id || !["read", "resolved"].includes(nextStatus)) {
    return;
  }

  const admin = getAdminClient();
  const now = new Date().toISOString();

  const values =
    nextStatus === "read"
      ? {
          status: "read" as const,
          read_at: now,
        }
      : {
          status: "resolved" as const,
          read_at: now,
          resolved_at: now,
        };

  const { error } = await admin
    .from("system_error_logs")
    .update(values)
    .eq("id", id);

  if (error) {
    console.error(
      "[SYSTEM MONITORING] Gagal memperbarui status log:",
      error.message
    );
  }

  revalidatePath("/admin/superadmin/system-monitoring");
}

function getDiagnosis(log: SystemLog) {
  const code = (log.error_code ?? "").toUpperCase();
  const module = log.module.toLowerCase();
  const action = (log.action ?? "").toLowerCase();
  const message = `${log.technical_message ?? ""} ${log.user_message ?? ""}`.toLowerCase();

  if (
    code.includes("RESEND") ||
    code.includes("EMAIL") ||
    message.includes("resend") ||
    message.includes("email")
  ) {
    return {
      diagnosis: "Gangguan pada proses pengiriman email.",
      solution:
        "Periksa RESEND_API_KEY, alamat pengirim, domain email, konfigurasi Resend, dan log server. Setelah pengiriman kembali normal, tandai kejadian sebagai diselesaikan.",
    };
  }

  if (
    code.includes("SESSION") ||
    action.includes("session") ||
    message.includes("session")
  ) {
    return {
      diagnosis: "Sistem gagal membuat atau mempertahankan sesi pengguna.",
      solution:
        "Periksa tabel sesi, permission/RLS, koneksi Supabase, cookie/session server, dan log server pada waktu kejadian.",
    };
  }

  if (
    code.includes("OTP") ||
    action.includes("otp") ||
    module.includes("otp")
  ) {
    return {
      diagnosis: "Gangguan teknis pada proses OTP.",
      solution:
        "Periksa akses database OTP, masa berlaku OTP, proses penyimpanan/pembaruan OTP, dan log server. OTP salah atau kedaluwarsa karena input pengguna tidak perlu dianggap sebagai gangguan sistem.",
    };
  }

  if (
    code.includes("DATABASE") ||
    code.includes("DB_") ||
    message.includes("database") ||
    message.includes("supabase") ||
    message.includes("permission denied")
  ) {
    return {
      diagnosis: "Gangguan pada akses database atau Supabase.",
      solution:
        "Periksa koneksi Supabase, tabel yang digunakan, permission/RLS, service role di server, serta log database/server sesuai waktu kejadian.",
    };
  }

  if (
    module.includes("writer") ||
    log.user_type === "writer"
  ) {
    return {
      diagnosis: "Gangguan teknis terdeteksi pada alur Writer.",
      solution:
        "Periksa proses Writer yang tercantum pada kolom Proses/Kode, lalu cocokkan technical message dengan log server. Pastikan database dan layanan email yang dipakai proses tersebut normal.",
    };
  }

  if (
    module.includes("reader") ||
    log.user_type === "reader"
  ) {
    return {
      diagnosis: "Gangguan teknis terdeteksi pada alur Reader.",
      solution:
        "Periksa proses Reader yang tercantum pada kolom Proses/Kode, koneksi Supabase, sesi Reader, serta log server pada waktu kejadian.",
    };
  }

  if (
    log.user_type === "admin" ||
    log.user_type === "superadmin" ||
    module.includes("admin")
  ) {
    return {
      diagnosis: "Gangguan teknis terdeteksi pada alur Admin/Superadmin.",
      solution:
        "Periksa autentikasi, MFA/recovery, profil admin, koneksi Supabase, dan log server sesuai proses serta kode error yang tercatat.",
    };
  }

  return {
    diagnosis: "Sistem mencatat gangguan teknis yang memerlukan pemeriksaan.",
    solution:
      "Gunakan Modul, Proses, Kode, Path, dan Pesan Teknis di bawah sebagai titik awal. Periksa log server pada waktu kejadian dan layanan terkait sebelum menandai sebagai diselesaikan.",
  };
}

function statusLabel(status: LogStatus) {
  if (status === "new") return "Baru";
  if (status === "read") return "Dibaca";
  return "Diselesaikan";
}

export default async function SystemMonitoringPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    status?: string;
    severity?: string;
    role?: string;
    q?: string;
  }>;
}) {
  await requireSuperadmin();

  const params = await searchParams;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0
    ? requestedPage
    : 1;

  const allowedStatuses = new Set(["new", "read", "resolved"]);
  const allowedSeverities = new Set([
    "critical",
    "error",
    "warning",
    "info",
  ]);
  const allowedRoles = new Set([
    "reader",
    "writer",
    "admin",
    "superadmin",
    "system",
  ]);

  const statusFilter = allowedStatuses.has(params.status ?? "")
    ? params.status!
    : "";

  const severityFilter = allowedSeverities.has(params.severity ?? "")
    ? params.severity!
    : "";

  const roleFilter = allowedRoles.has(params.role ?? "")
    ? params.role!
    : "";

  const searchFilter = (params.q ?? "")
    .trim()
    .slice(0, 100);

  const admin = getAdminClient();

  const LOG_COLUMNS =
    "id,created_at,severity,module,action,error_code,technical_message,user_message,user_email,user_type,request_path,status,read_at,resolved_at";

  const PAGE_SIZE = 10;

  function applyFilters(query: any) {
    let filtered = query;

    if (statusFilter) {
      filtered = filtered.eq("status", statusFilter);
    }

    if (severityFilter) {
      filtered = filtered.eq("severity", severityFilter);
    }

    if (roleFilter === "system") {
      filtered = filtered.is("user_type", null);
    } else if (roleFilter) {
      filtered = filtered.eq("user_type", roleFilter);
    }

    if (searchFilter) {
      const safeSearch = searchFilter.replace(/[,%()]/g, " ");

      filtered = filtered.or(
        [
          `user_email.ilike.%${safeSearch}%`,
          `error_code.ilike.%${safeSearch}%`,
          `module.ilike.%${safeSearch}%`,
          `action.ilike.%${safeSearch}%`,
        ].join(",")
      );
    }

    return filtered;
  }

  async function countLogs(
    column?: "severity" | "status",
    value?: string,
    useActiveFilters = false
  ) {
    let query = admin
      .from("system_error_logs")
      .select("id", { count: "exact", head: true });

    if (column && value) {
      query = query.eq(column, value);
    }

    if (useActiveFilters) {
      query = applyFilters(query);
    }

    const { count, error } = await query;

    if (error) {
      console.error(
        "[SYSTEM MONITORING] Gagal menghitung log:",
        error.message
      );
      return 0;
    }

    return count ?? 0;
  }

  const [
    totalCount,
    criticalCount,
    errorCount,
    warningCount,
    newCount,
    readCount,
    resolvedCount,
  ] = await Promise.all([
    countLogs(),
    countLogs("severity", "critical"),
    countLogs("severity", "error"),
    countLogs("severity", "warning"),
    countLogs("status", "new"),
    countLogs("status", "read"),
    countLogs("status", "resolved"),
  ]);

  const [
    filteredTotalCount,
    filteredNewCount,
    filteredReadCount,
    filteredResolvedCount,
  ] = await Promise.all([
    countLogs(undefined, undefined, true),
    countLogs("status", "new", true),
    countLogs("status", "read", true),
    countLogs("status", "resolved", true),
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTotalCount / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;

  const statusGroups: Array<{
    status: LogStatus;
    count: number;
  }> = [
    { status: "new", count: filteredNewCount },
    { status: "read", count: filteredReadCount },
    { status: "resolved", count: filteredResolvedCount },
  ];

  let groupStart = 0;
  let error: { message: string } | null = null;
  const pageLogs: SystemLog[] = [];

  for (const group of statusGroups) {
    const groupEnd = groupStart + group.count;

    const overlapStart = Math.max(pageStart, groupStart);
    const overlapEnd = Math.min(pageEnd, groupEnd);

    if (overlapStart < overlapEnd) {
      const rangeFrom = overlapStart - groupStart;
      const rangeTo = overlapEnd - groupStart - 1;

      let logQuery = admin
        .from("system_error_logs")
        .select(LOG_COLUMNS)
        .eq("status", group.status);

      if (severityFilter) {
        logQuery = logQuery.eq("severity", severityFilter);
      }

      if (roleFilter === "system") {
        logQuery = logQuery.is("user_type", null);
      } else if (roleFilter) {
        logQuery = logQuery.eq("user_type", roleFilter);
      }

      if (searchFilter) {
        const safeSearch = searchFilter.replace(/[,%()]/g, " ");

        logQuery = logQuery.or(
          [
            `user_email.ilike.%${safeSearch}%`,
            `error_code.ilike.%${safeSearch}%`,
            `module.ilike.%${safeSearch}%`,
            `action.ilike.%${safeSearch}%`,
          ].join(",")
        );
      }

      const { data, error: groupError } = await logQuery
        .order("created_at", { ascending: false })
        .range(rangeFrom, rangeTo);

      if (groupError) {
        console.error(
          `[SYSTEM MONITORING] Gagal membaca log ${group.status}:`,
          groupError.message
        );

        error = { message: groupError.message };
        break;
      }

      pageLogs.push(...((data ?? []) as SystemLog[]));
    }

    groupStart = groupEnd;

    if (pageLogs.length >= PAGE_SIZE) {
      break;
    }
  }

  const logs = pageLogs;

  function monitoringPageHref(pageNumber: number) {
    const query = new URLSearchParams();

    query.set("page", String(pageNumber));

    if (statusFilter) {
      query.set("status", statusFilter);
    }

    if (severityFilter) {
      query.set("severity", severityFilter);
    }

    if (roleFilter) {
      query.set("role", roleFilter);
    }

    if (searchFilter) {
      query.set("q", searchFilter);
    }

    return `/admin/superadmin/system-monitoring?${query.toString()}`;
  }

  const hasActiveFilter = Boolean(
    statusFilter ||
      severityFilter ||
      roleFilter ||
      searchFilter
  );

  const cards = [
    ["Total", totalCount],
    ["Critical", criticalCount],
    ["Error", errorCount],
    ["Warning", warningCount],
    ["Baru", newCount],
    ["Dibaca", readCount],
    ["Diselesaikan", resolvedCount],
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f8f2",
        padding: "32px 20px 64px",
      }}
    >
      <div
        style={{
          width: "min(1200px, 100%)",
          margin: "0 auto",
        }}
      >
        <Link
          href="/admin/superadmin"
          style={{
            display: "inline-block",
            marginBottom: 24,
            color: "#49674e",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          {"<- Dashboard Superadmin"}
        </Link>

        <p
          style={{
            margin: 0,
            color: "#76907a",
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: "0.14em",
          }}
        >
          11 - MONITORING SISTEM
        </p>

        <h1
          style={{
            margin: "8px 0",
            color: "#294431",
            fontSize: "clamp(28px, 5vw, 42px)",
          }}
        >
          Monitoring Sistem
        </h1>

        <p
          style={{
            margin: 0,
            color: "#657268",
            lineHeight: 1.7,
          }}
        >
          Pusat pemantauan gangguan teknis Menjadi Nol.
          Akses halaman ini khusus Superadmin.
        </p>

        <section
          style={{
            marginTop: 30,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 14,
          }}
        >
          {cards.map(([label, value]) => {
            const cardStyle =
              label === "Critical"
                ? {
                    background: "#f8e8e8",
                    border: "#e5bcbc",
                    text: "#8c3b3b",
                  }
                : label === "Error"
                  ? {
                      background: "#faeeee",
                      border: "#e8caca",
                      text: "#a34b4b",
                    }
                  : label === "Warning"
                    ? {
                        background: "#fbf3dc",
                        border: "#e5d29c",
                        text: "#856b24",
                      }
                    : label === "Baru"
                      ? {
                          background: "#eaf3f7",
                          border: "#bed5df",
                          text: "#426b7b",
                        }
                      : label === "Dibaca"
                        ? {
                            background: "#f1edf7",
                            border: "#d5c8e4",
                            text: "#67547d",
                          }
                        : label === "Diselesaikan"
                          ? {
                              background: "#eaf4e8",
                              border: "#c4d9bf",
                              text: "#49674e",
                            }
                          : {
                              background: "#edf3ea",
                              border: "#cbd9c7",
                              text: "#36583e",
                            };

            return (
              <div
                key={String(label)}
                style={{
                  padding: 20,
                  borderRadius: 20,
                  background: cardStyle.background,
                  border: `1px solid ${cardStyle.border}`,
                  boxShadow: "0 8px 24px rgba(55,78,59,.05)",
                }}
              >
                <div
                  style={{
                    color: cardStyle.text,
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {label}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: cardStyle.text,
                    fontSize: 30,
                    fontWeight: 900,
                  }}
                >
                  {value}
                </div>
              </div>
            );
          })}
        </section>

        <section
          style={{
            marginTop: 18,
            padding: 22,
            borderRadius: 22,
            background: "#fff",
            border: "1px solid rgba(73,103,78,.12)",
          }}
        >
          <h2
            style={{
              margin: "0 0 8px",
              color: "#294431",
              fontSize: 18,
            }}
          >
            Kejadian Sistem Terbaru
          </h2>

          <p
            style={{
              margin: "0 0 18px",
              color: "#758078",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            Log berstatus Diselesaikan disimpan sementara dan dibersihkan
            otomatis setelah 30 hari.
          </p>

          <form
            method="GET"
            action="/admin/superadmin/system-monitoring"
            style={{
              marginBottom: 22,
              padding: 16,
              borderRadius: 16,
              background: "#f7f9f5",
              border: "1px solid #dfe7dc",
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
              alignItems: "end",
            }}
          >
            <label
              style={{
                display: "grid",
                gap: 6,
                color: "#49674e",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              Status
              <select
                name="status"
                defaultValue={statusFilter}
                style={{
                  width: "100%",
                  minHeight: 42,
                  padding: "0 12px",
                  borderRadius: 10,
                  border: "1px solid #cfd9cc",
                  background: "#fff",
                  color: "#294431",
                  fontWeight: 700,
                }}
              >
                <option value="">Semua Status</option>
                <option value="new">Baru</option>
                <option value="read">Dibaca</option>
                <option value="resolved">Diselesaikan</option>
              </select>
            </label>

            <label
              style={{
                display: "grid",
                gap: 6,
                color: "#49674e",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              Severity
              <select
                name="severity"
                defaultValue={severityFilter}
                style={{
                  width: "100%",
                  minHeight: 42,
                  padding: "0 12px",
                  borderRadius: 10,
                  border: "1px solid #cfd9cc",
                  background: "#fff",
                  color: "#294431",
                  fontWeight: 700,
                }}
              >
                <option value="">Semua Severity</option>
                <option value="critical">Critical</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </label>

            <label
              style={{
                display: "grid",
                gap: 6,
                color: "#49674e",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              Role
              <select
                name="role"
                defaultValue={roleFilter}
                style={{
                  width: "100%",
                  minHeight: 42,
                  padding: "0 12px",
                  borderRadius: 10,
                  border: "1px solid #cfd9cc",
                  background: "#fff",
                  color: "#294431",
                  fontWeight: 700,
                }}
              >
                <option value="">Semua Role</option>
                <option value="reader">Pembaca</option>
                <option value="writer">Penulis</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
                <option value="system">Sistem</option>
              </select>
            </label>

            <label
              style={{
                display: "grid",
                gap: 6,
                color: "#49674e",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              Cari
              <input
                type="search"
                name="q"
                defaultValue={searchFilter}
                maxLength={100}
                placeholder="Email, error code, module, action..."
                autoComplete="off"
                style={{
                  width: "100%",
                  minHeight: 42,
                  padding: "0 12px",
                  borderRadius: 10,
                  border: "1px solid #cfd9cc",
                  background: "#fff",
                  color: "#294431",
                  fontWeight: 700,
                }}
              />
            </label>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <button
                type="submit"
                style={{
                  minHeight: 42,
                  padding: "0 16px",
                  border: "1px solid #49674e",
                  borderRadius: 10,
                  background: "#49674e",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Terapkan Filter
              </button>

              {hasActiveFilter && (
                <Link
                  href="/admin/superadmin/system-monitoring"
                  style={{
                    minHeight: 42,
                    padding: "0 16px",
                    border: "1px solid #c8d2c5",
                    borderRadius: 10,
                    background: "#fff",
                    color: "#49674e",
                    fontWeight: 900,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  Reset
                </Link>
              )}
            </div>
          </form>

          {hasActiveFilter && (
            <div
              style={{
                margin: "-8px 0 18px",
                color: "#758078",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Menampilkan {filteredTotalCount} kejadian sesuai filter.
            </div>
          )}

          {error && (
            <p style={{ color: "#8c3b3b" }}>
              Log sistem belum dapat dimuat.
            </p>
          )}

          {!error && logs.length === 0 && (
            <p
              style={{
                color: "#758078",
                lineHeight: 1.7,
              }}
            >
              Belum ada kejadian sistem yang tercatat.
            </p>
          )}

          {logs.length > 0 && (
            <div style={{ display: "grid", gap: 12 }}>
              {pageLogs.map((log, index) => {
                const help = getDiagnosis(log);

                const showResolvedDivider =
                  log.status === "resolved" &&
                  (index === 0 ||
                    pageLogs[index - 1]?.status !== "resolved");

                return (
                  <div key={log.id}>
                    {showResolvedDivider && (
                      <div
                        style={{
                          margin: "22px 0 12px",
                          paddingTop: 18,
                          borderTop: "2px solid #d8dfd4",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 900,
                            letterSpacing: ".08em",
                            textTransform: "uppercase",
                            color: "#78917d",
                          }}
                        >
                          Sudah Diselesaikan
                        </div>
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 12,
                            color: "#879087",
                          }}
                        >
                          Kejadian di bawah ini sudah selesai ditangani.
                        </div>
                      </div>
                    )}

                    <details
                      style={{
                      border: "1px solid #e1e8df",
                      borderRadius: 16,
                      overflow: "hidden",
                      background: "#fbfcf9",
                    }}
                  >
                    <summary
                      style={{
                        cursor: "pointer",
                        padding: "16px 18px",
                        listStyle: "none",
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "140px 90px 100px minmax(130px,1fr) minmax(130px,1fr)",
                          gap: 12,
                          alignItems: "center",
                          minWidth: 760,
                        }}
                      >
                        <span style={{ fontSize: 12, color: "#657268" }}>
                          {formatDate(log.created_at)}
                        </span>

                        <strong
                          style={{
                            fontSize: 12,
                            textTransform: "uppercase",
                            color:
                              log.severity === "critical" ||
                              log.severity === "error"
                                ? "#8c3b3b"
                                : "#7a6530",
                          }}
                        >
                          {log.severity}
                        </strong>

                        <strong
                          style={{
                            fontSize: 12,
                            color: "#49674e",
                          }}
                        >
                          {statusLabel(log.status)}
                        </strong>

                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            color: "#294431",
                          }}
                        >
                          {log.module}
                          {log.action ? ` / ${log.action}` : ""}
                        </span>

                        <span
                          style={{
                            fontSize: 12,
                            color: "#657268",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {log.user_email ?? "Email tidak tercatat"}
                        </span>
                      </div>
                    </summary>

                    <div
                      style={{
                        borderTop: "1px solid #e1e8df",
                        padding: 18,
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(190px, 1fr))",
                          gap: 12,
                        }}
                      >
                        <Info label="Jenis User" value={log.user_type ?? "system"} />
                        <Info label="Kode" value={log.error_code ?? "-"} />
                        <Info label="Path" value={log.request_path ?? "-"} />
                        <Info label="Dibaca" value={formatDate(log.read_at)} />
                        <Info
                          label="Diselesaikan"
                          value={formatDate(log.resolved_at)}
                        />
                      </div>

                      <Panel title="Pesan">
                        {log.user_message ||
                          log.technical_message ||
                          "-"}
                      </Panel>

                      {log.technical_message &&
                        log.technical_message !== log.user_message && (
                          <Panel title="Pesan Teknis">
                            {log.technical_message}
                          </Panel>
                        )}

                      <Panel title="Diagnosis">
                        {help.diagnosis}
                      </Panel>

                      <Panel title="Saran Penanganan">
                        {help.solution}
                      </Panel>

                      {log.status !== "resolved" && (
                        <div
                          style={{
                            marginTop: 18,
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 10,
                          }}
                        >
                          {log.status === "new" && (
                            <form action={updateLogStatus}>
                              <input type="hidden" name="id" value={log.id} />
                              <input type="hidden" name="status" value="read" />
                              <ActionButton variant="read">Tandai Dibaca</ActionButton>
                            </form>
                          )}

                          <form action={updateLogStatus}>
                            <input type="hidden" name="id" value={log.id} />
                            <input
                              type="hidden"
                              name="status"
                              value="resolved"
                            />
                            <ActionButton variant="resolved">Tandai Diselesaikan</ActionButton>
                          </form>
                        </div>
                      )}

                      {log.status === "resolved" && (
                        <p
                          style={{
                            margin: "18px 0 0",
                            color: "#657268",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          Kejadian sudah diselesaikan dan akan dibersihkan
                          otomatis 30 hari setelah waktu penyelesaian.
                        </p>
                      )}
                    </div>
                    </details>
                  </div>
                );
              })}

              {totalPages >= 1 && (
                <nav
                  aria-label="Halaman Monitoring Sistem"
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 22,
                    paddingTop: 18,
                    borderTop: "1px solid #e1e8df",
                  }}
                >
                  {Array.from(
                    { length: totalPages },
                    (_, index) => index + 1
                  ).map((pageNumber) => {
                    const active = pageNumber === currentPage;

                    return (
                      <Link
                        key={pageNumber}
                        href={monitoringPageHref(pageNumber)}
                        aria-current={active ? "page" : undefined}
                        style={{
                          minWidth: 36,
                          height: 36,
                          padding: "0 10px",
                          borderRadius: 9,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: active
                            ? "1px solid #49674e"
                            : "1px solid #d8dfd4",
                          background: active
                            ? "#49674e"
                            : "#ffffff",
                          color: active
                            ? "#ffffff"
                            : "#49674e",
                          fontSize: 13,
                          fontWeight: 900,
                          textDecoration: "none",
                        }}
                      >
                        {pageNumber}
                      </Link>
                    );
                  })}
                </nav>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        background: "#f4f7f1",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 900,
          color: "#76907a",
          marginBottom: 5,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          color: "#294431",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: 14,
        borderRadius: 14,
        background: "#fff",
        border: "1px solid #e5eae3",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 900,
          color: "#76907a",
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 13,
          lineHeight: 1.65,
          color: "#39483d",
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ActionButton({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "read" | "resolved";
}) {
  const isRead = variant === "read";

  return (
    <>
      <style>{`
        .monitoring-action:hover {
          transform: translateY(-2px);
        }

        .monitoring-action:active {
          transform: translateY(0);
        }

        .monitoring-action:focus-visible {
          outline: 3px solid rgba(181, 145, 62, 0.32);
          outline-offset: 3px;
        }

        .monitoring-action-read:hover {
          background: #dfe9dc !important;
          color: #294431 !important;
          border-color: #49674e !important;
          box-shadow: 0 6px 16px rgba(73, 103, 78, 0.16);
        }

        .monitoring-action-resolved:hover {
          background: #b5913e !important;
          color: #ffffff !important;
          border-color: #b5913e !important;
          box-shadow: 0 6px 16px rgba(181, 145, 62, 0.24);
        }
      `}</style>

      <button
        type="submit"
        className={`monitoring-action monitoring-action-${variant}`}
        style={{
        border: isRead
          ? "1px solid #78917d"
          : "1px solid #49674e",
        borderRadius: 999,
        padding: "10px 17px",
        background: isRead ? "#f7f5e9" : "#49674e",
        color: isRead ? "#36583e" : "#ffffff",
        fontWeight: 900,
        cursor: "pointer",
        transition:
          "background-color 160ms ease, color 160ms ease, border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
      }}
    >
      {children}
    </button>
    </>
  );
}
