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
    | "sinopsis"
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
      .select("id,section,title,slug,description")
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
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p className="eyebrow">superadmin</p>
            <h2 style={{ margin: 0 }}>Pengaturan Superadmin</h2>
            <p style={{ marginTop: "6px", opacity: 0.7 }}>
              Akses khusus untuk pengelolaan admin dan pengaturan sensitif.
            </p>
          </div>

          <Link
            href="/admin/superadmin"
            className="login-submit admin-save"
            style={{ textDecoration: "none" }}
          >
            buka superadmin
          </Link>
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
