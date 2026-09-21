import Link from "next/link";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireAdminSession, type AdminRole } from "@/lib/admin-auth";
import DashboardOverview, { type AnalyticsPeriod } from "./DashboardOverview";
import FolderManager from "./FolderManager";
import { signOut } from "./actions";

export default async function AdminExtras({
  analyticsPeriod = "30d",
  adminRole = "admin",
  initialSection = "tentang",
}: {
  analyticsPeriod?: AnalyticsPeriod;
  adminRole?: AdminRole;
  initialSection?:
    | "tentang"
    | "layanan"
    | "ruang-belajar"
    | "ruang-jeda"
    | "artikel"
    | "kontak";
}) {
  const session = await requireAdminSession();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Konfigurasi server Supabase belum lengkap.");
  }

  const adminDb = createServiceClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const entriesQuery = adminDb
    .from("content_folder_entries")
    .select(
      "id,folder_id,title,slug,excerpt,body,table_data,attachment_path,attachment_name,attachment_mime,attachment_size,status,published_at,author_id"
    )
    .order("created_at", { ascending: false });

  if (adminRole === "writer") {
    entriesQuery.eq("author_id", session.userId);
  }

  const [{ data: folders }, { data: entries }] = await Promise.all([
    adminDb
      .from("content_folders")
      .select("id,section,title,slug,description,parent_id")
      .order("section", { ascending: true })
      .order("title", { ascending: true }),

    entriesQuery,
  ]);

  /*
   * WRITER = PENULIS MURNI
   * Tidak boleh melihat dashboard Admin / analytics / reader login / pengaturan.
   * Setelah login Writer langsung mendapat editor konten saja.
   */
  if (adminRole === "writer") {
    return (
      <section
        style={{
          width: "100%",
          marginTop: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            marginBottom: "18px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              className="eyebrow"
              style={{ marginBottom: "4px" }}
            >
              PENULIS
            </p>
            <h1
              style={{
                margin: 0,
                fontSize: "28px",
              }}
            >
              Ruang Menulis
            </h1>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className="admin-secondary"
            >
              Keluar
            </button>
          </form>
        </div>

        <div id="content-manager">
          <FolderManager
            folders={(folders ?? []) as any}
            entries={(entries ?? []) as any}
            adminRole="writer"
            initialSection={initialSection}
          />
        </div>
      </section>
    );
  }

  /*
   * Dashboard penuh hanya untuk Admin / Superadmin.
   */
  return (
    <>
      {adminRole === "superadmin" && (
  <div
    className="proper-dashboard-card"
    style={{
      marginBottom: "18px",
      padding: "18px 22px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "18px",
      flexWrap: "wrap",
    }}
  >
    <div style={{ flex: "1 1 420px" }}>
      <p
        className="eyebrow"
        style={{
          margin: "0 0 5px",
        }}
      >
        SUPERADMIN
      </p>

      <h2
        style={{
          margin: 0,
          fontSize: "22px",
        }}
      >
        Pengaturan Superadmin
      </h2>

      <p
        style={{
          margin: "5px 0 0",
          opacity: 0.7,
          fontSize: "13px",
          lineHeight: 1.5,
        }}
      >
        Kelola admin, penulis, pembaca, dan pengaturan akses khusus.
      </p>
    </div>

    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flexWrap: "wrap",
      }}
    >
      <Link
        href="/admin/superadmin"
        className="login-submit admin-save"
        style={{
          textDecoration: "none",
          padding: "9px 16px",
          minHeight: "auto",
          whiteSpace: "nowrap",
          background: "#0f6845",
          color: "#ffffff",
          border: "1px solid #0f6845",
          borderRadius: "999px",
          fontWeight: 700,
      }}
      >
        Superadmin
      </Link>

      <Link
        href="/admin/superadmin/role-manager"
        className="login-submit admin-save"
       style={{
          textDecoration: "none",
          padding: "9px 16px",
          minHeight: "auto",
          whiteSpace: "nowrap",
          background: "#0f6845",
          color: "#ffffff",
          border: "1px solid #0f6845",
          borderRadius: "999px",
          fontWeight: 700,
      }}
      >
        Role Manager
      </Link>
    </div>
  </div>
)}

      <DashboardOverview analyticsPeriod={analyticsPeriod} adminRole={adminRole} />

      <div id="content-manager" style={{ marginTop: "24px" }}>
        <FolderManager
          folders={(folders ?? []) as any}
          entries={(entries ?? []) as any}
          adminRole={adminRole}
          initialSection={initialSection}
        />
      </div>
    </>
  );
}

