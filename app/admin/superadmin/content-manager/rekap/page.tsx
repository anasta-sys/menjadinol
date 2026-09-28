import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import RekapContentManager from "./RekapContentManager";

export const metadata = {
  title: "Rekap Semua Konten · menjadi nol",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const SECTION_LABELS: Record<string, string> = {
  tentang: "Tentang",
  layanan: "Perjalanan",
  "ruang-belajar": "Ruang Belajar",
  "ruang-jeda": "Ruang Jeda",
  artikel: "Cerita & Makna",
  kontak: "Kontak",
};

const SECTION_SLUGS: Record<string, string> = {
  tentang: "tentang",
  layanan: "perjalanan",
  "ruang-belajar": "ruang-belajar",
  "ruang-jeda": "ruang-jeda",
  artikel: "artikel",
  kontak: "kontak",
};

export default async function RekapContentManagerPage() {
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

  const currentUserId = claims.claims.sub as string;

  const { data: profile } = await supabase
    .from("admin_users")
    .select("user_id,role")
    .eq("user_id", currentUserId)
    .maybeSingle();

  if (!profile || profile.role !== "superadmin") {
    redirect("/admin");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Konfigurasi server Supabase belum lengkap.");
  }

  const admin = createAdminClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: folders, error: foldersError } = await admin
    .from("content_folders")
    .select("id,title,slug,section");

  if (foldersError) throw foldersError;

  const { data: entries, error: entriesError } = await admin
    .from("content_folder_entries")
    .select(
      "id,title,slug,status,folder_id,created_at,published_at,excerpt,body"
    )
    .order("created_at", { ascending: false })
    .limit(5000);

  if (entriesError) throw entriesError;

  const folderById = new Map(
    (folders ?? []).map((folder) => [folder.id, folder])
  );

  const rows = (entries ?? []).map((entry) => {
    const folder = folderById.get(entry.folder_id);

    const section = folder?.section ?? "";

    const status =
      entry.status === "published" ||
      entry.status === "review" ||
      entry.status === "draft"
        ? entry.status
        : "draft";

    return {
      id: entry.id,
      title: entry.title,
      status,
      createdAt: entry.created_at,
      publishedAt: entry.published_at,
      excerpt: entry.excerpt ?? null,
      body: entry.body ?? "",
      folderTitle: folder?.title ?? "Tanpa folder",
      sectionLabel: SECTION_LABELS[section] ?? section ?? "Tidak diketahui",
      sectionSlug: SECTION_SLUGS[section] ?? "",
    };
  });

  return (
    <main
      style={{
        width: "min(1400px, calc(100% - 32px))",
        margin: "0 auto",
        padding: "48px 0 80px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 24,
          flexWrap: "wrap",
          marginBottom: 32,
        }}
      >
        <div>
          <p
            style={{
              margin: "0 0 8px",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.16em",
            }}
          >
            CONTENT MANAGER
          </p>

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(32px, 5vw, 52px)",
              color: "#0b553c",
            }}
          >
            Rekap Semua Konten
          </h1>

          <p style={{ marginTop: 12, opacity: 0.72 }}>
            Seluruh tulisan Menjadi Nol dalam satu halaman.
          </p>
        </div>

        <Link
          href="/admin/superadmin/content-manager"
          style={{
            padding: "10px 16px",
            border: "1px solid rgba(11,85,60,.22)",
            borderRadius: 999,
            textDecoration: "none",
            color: "#0b553c",
            fontWeight: 700,
          }}
        >
          ← Content Manager
        </Link>
      </div>

      <RekapContentManager rows={rows} />
    </main>
  );
}
