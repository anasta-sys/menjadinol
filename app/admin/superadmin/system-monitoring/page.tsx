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

export default async function SystemMonitoringPage() {
  await requireSuperadmin();

  const admin = getAdminClient();

  const { data, error } = await admin
    .from("system_error_logs")
    .select(
      "id,created_at,severity,module,action,error_code,technical_message,user_message,user_email,user_type,request_path,status,read_at,resolved_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[SYSTEM MONITORING] Gagal membaca log:", error.message);
  }

  const logs = (data ?? []) as SystemLog[];

  const totalCount = logs.length;
  const criticalCount = logs.filter((item) => item.severity === "critical").length;
  const errorCount = logs.filter((item) => item.severity === "error").length;
  const warningCount = logs.filter((item) => item.severity === "warning").length;
  const newCount = logs.filter((item) => item.status === "new").length;
  const readCount = logs.filter((item) => item.status === "read").length;
  const resolvedCount = logs.filter((item) => item.status === "resolved").length;

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
          {cards.map(([label, value]) => (
            <div
              key={String(label)}
              style={{
                padding: 20,
                borderRadius: 20,
                background: "#fff",
                border: "1px solid rgba(73,103,78,.12)",
                boxShadow: "0 8px 24px rgba(55,78,59,.05)",
              }}
            >
              <div
                style={{
                  color: "#758078",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {label}
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "#294431",
                  fontSize: 30,
                  fontWeight: 900,
                }}
              >
                {value}
              </div>
            </div>
          ))}
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
              {logs.map((log) => {
                const help = getDiagnosis(log);

                return (
                  <details
                    key={log.id}
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
                          {log.user_email ?? "Sistem"}
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
                              <ActionButton>
                                Tandai Dibaca
                              </ActionButton>
                            </form>
                          )}

                          <form action={updateLogStatus}>
                            <input type="hidden" name="id" value={log.id} />
                            <input
                              type="hidden"
                              name="status"
                              value="resolved"
                            />
                            <ActionButton>
                              Tandai Diselesaikan
                            </ActionButton>
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
                );
              })}
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
}: {
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      style={{
        border: 0,
        borderRadius: 999,
        padding: "10px 16px",
        background: "#49674e",
        color: "#fff",
        fontWeight: 900,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
