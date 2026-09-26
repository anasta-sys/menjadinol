import Link from "next/link";
import { redirect } from "next/navigation";
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

type SystemLog = {
  id: string;
  created_at: string;
  severity: "info" | "warning" | "error" | "critical";
  module: string;
  action: string | null;
  error_code: string | null;
  technical_message: string | null;
  user_message: string | null;
  user_email: string | null;
  user_type: "reader" | "writer" | "admin" | "superadmin" | "system" | null;
  request_path: string | null;
  status: "new" | "read" | "resolved";
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

export default async function SystemMonitoringPage() {
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Konfigurasi server Supabase belum lengkap.");
  }

  const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await admin
    .from("system_error_logs")
    .select(
      "id,created_at,severity,module,action,error_code,technical_message,user_message,user_email,user_type,request_path,status"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[SYSTEM MONITORING] Gagal membaca log:", error.message);
  }

  const logs = (data ?? []) as SystemLog[];

  const criticalCount = logs.filter(
    (item) => item.severity === "critical" && item.status !== "resolved"
  ).length;

  const errorCount = logs.filter(
    (item) => item.severity === "error" && item.status !== "resolved"
  ).length;

  const warningCount = logs.filter(
    (item) => item.severity === "warning" && item.status !== "resolved"
  ).length;

  const openCount = logs.filter(
    (item) => item.status !== "resolved"
  ).length;

  const cards = [
    ["Critical", criticalCount],
    ["Error", errorCount],
    ["Warning", warningCount],
    ["Belum Ditangani", openCount],
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
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
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
            overflowX: "auto",
          }}
        >
          <h2
            style={{
              margin: "0 0 18px",
              color: "#294431",
              fontSize: 18,
            }}
          >
            Kejadian Sistem Terbaru
          </h2>

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
            <table
              style={{
                width: "100%",
                minWidth: 950,
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr>
                  {[
                    "Waktu",
                    "Level",
                    "Jenis User",
                    "Modul",
                    "Proses",
                    "Kode",
                    "Pengguna",
                    "Status",
                    "Pesan",
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        textAlign: "left",
                        padding: "12px 10px",
                        color: "#49674e",
                        borderBottom: "1px solid #dde5dc",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td
                      style={{
                        padding: "12px 10px",
                        borderBottom: "1px solid #edf0eb",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(log.created_at)}
                    </td>

                    <td
                      style={{
                        padding: "12px 10px",
                        borderBottom: "1px solid #edf0eb",
                        fontWeight: 900,
                        textTransform: "uppercase",
                      }}
                    >
                      {log.severity}
                    </td>

                    <td
                      style={{
                        padding: "12px 10px",
                        borderBottom: "1px solid #edf0eb",
                        fontWeight: 800,
                        textTransform: "capitalize",
                      }}
                    >
                      {log.user_type ?? "system"}
                    </td>

                    <td
                      style={{
                        padding: "12px 10px",
                        borderBottom: "1px solid #edf0eb",
                      }}
                    >
                      {log.module}
                    </td>

                    <td
                      style={{
                        padding: "12px 10px",
                        borderBottom: "1px solid #edf0eb",
                      }}
                    >
                      {log.action ?? "-"}
                    </td>

                    <td
                      style={{
                        padding: "12px 10px",
                        borderBottom: "1px solid #edf0eb",
                      }}
                    >
                      {log.error_code ?? "-"}
                    </td>

                    <td
                      style={{
                        padding: "12px 10px",
                        borderBottom: "1px solid #edf0eb",
                      }}
                    >
                      {log.user_email ?? "Sistem"}
                    </td>

                    <td
                      style={{
                        padding: "12px 10px",
                        borderBottom: "1px solid #edf0eb",
                        fontWeight: 800,
                      }}
                    >
                      {log.status}
                    </td>

                    <td
                      style={{
                        padding: "12px 10px",
                        borderBottom: "1px solid #edf0eb",
                        maxWidth: 320,
                      }}
                    >
                      {log.user_message ||
                        log.technical_message ||
                        "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  );
}
