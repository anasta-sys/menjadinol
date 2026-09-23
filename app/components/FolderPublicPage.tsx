import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MATERIAL_BUCKET } from "@/lib/material-attachments";
import FolderAdminControls from "@/app/components/FolderAdminControls";
import FolderEntryList from "@/app/components/FolderEntryList";
import type { ContentTableData } from "@/app/components/ContentTableBuilder";

type Section =
  | "tentang"
  | "artikel"
  | "layanan"
  | "ruang-belajar"
  | "ruang-jeda"
  | "kontak";

type EntryStatus = "draft" | "published";

type Entry = {
  id: string;
  folder_id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  table_data: ContentTableData | null;
  attachment_path: string | null;
  has_attachment?: boolean;
  attachment_name: string | null;
  attachment_mime: string | null;
  attachment_size: number | null;
  attachment_url?: string | null;
  attachment_secure_url?: string | null;
  status: EntryStatus;
  created_at: string | null;
  updated_at: string | null;
  writer_location?: string | null;
  author_id: string | null;
  author_name?: string | null;
};

function publicPath(section: Section) {
  if (section === "layanan") return "/perjalanan";
  if (section === "artikel") return "/cerita-makna";
  return `/${section}`;
}

function folderPath(section: Section) {
  if (section === "layanan") return "/perjalanan/folder";
  if (section === "ruang-belajar") return "/ruang-belajar/tema";
  if (section === "artikel") return "/cerita-makna/folder";
  return `/${section}/folder`;
}

function sectionLabel(section: Section) {
  switch (section) {
    case "artikel":
      return "Cerita & Makna";
    case "layanan":
      return "Perjalanan";
    case "ruang-belajar":
      return "Ruang Belajar";
    case "ruang-jeda":
      return "Ruang Jeda";
    case "tentang":
      return "Tentang";
    case "kontak":
      return "Kontak";
    default:
      return section;
  }
}

export default async function FolderPublicPage({
  section,
  slug,
}: {
  section: Section;
  slug: string;
}) {
  const supabase = await createClient();

  const { data: folder, error: folderError } = await supabase
    .from("content_folders")
    .select("id,section,title,slug,description,parent_id")
    .eq("section", section)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (folderError || !folder) {
    notFound();
  }

  const { data: childFolders, error: childFoldersError } = await supabase
    .from("content_folders")
    .select("id,section,title,slug,description,parent_id")
    .eq("section", section)
    .eq("parent_id", folder.id)
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (childFoldersError) {
    console.error(
      "Gagal mengambil subfitur:",
      childFoldersError.message
    );
  }

  const hasChildren = (childFolders ?? []).length > 0;

  let isAdmin = false;

  const { data: claims } = await supabase.auth.getClaims();

  if (claims?.claims?.sub) {
    const { data: aal } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aal?.currentLevel === "aal2") {
      const { data: admin } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", claims.claims.sub)
        .maybeSingle();

      isAdmin = Boolean(admin);
    }
  }

  let query = supabase
    .from("content_folder_entries")
    .select(
      "id,folder_id,title,slug,excerpt,body,table_data,attachment_path,attachment_name,attachment_mime,attachment_size,status,created_at,updated_at,writer_location,author_id"
    )
    .eq("folder_id", folder.id);

  if (!isAdmin) {
    query = query.eq("status", "published");
  }

  const { data: entries, error: entriesError } = await query.order(
    "created_at",
    { ascending: true }
  );

  if (entriesError) {
    console.error(
      "Gagal mengambil tulisan fitur:",
      entriesError.message
    );
  }

  const adminSupabase = createAdminClient();

  const authorIds = Array.from(
    new Set(
      (entries ?? [])
        .map((entry: any) => entry.author_id as string | null)
        .filter((value): value is string => Boolean(value))
    )
  );

  const authorNameMap = new Map<string, string>();

  if (authorIds.length > 0) {
    const { data: authors, error: authorsError } = await adminSupabase
      .from("admin_users")
      .select("user_id,display_name")
      .in("user_id", authorIds);

    if (authorsError) {
      console.error(
        "Gagal mengambil nama penulis:",
        authorsError.message
      );
    } else {
      for (const author of authors ?? []) {
        authorNameMap.set(
          author.user_id,
          author.display_name?.trim() || "Admin"
        );
      }
    }
  }

  const entriesWithSignedUrls = await Promise.all(
    (entries ?? []).map(async (entry: any) => {
      const authorName =
        (entry.author_id
          ? authorNameMap.get(entry.author_id)
          : null) ?? "Penulis belum tercatat";

      if (!entry.attachment_path) {
        const {
          attachment_path: _privatePath,
          author_id: _privateAuthorId,
          ...publicEntry
        } = entry;

        return {
          ...publicEntry,
          author_name: authorName,
          has_attachment: false,
          attachment_url: null,
        };
      }

      try {
        const { data, error } = await adminSupabase.storage
          .from(MATERIAL_BUCKET)
          .createSignedUrl(entry.attachment_path, 60 * 15);

        if (error || !data?.signedUrl) {
          const {
            attachment_path: _privatePath,
            author_id: _privateAuthorId,
            ...publicEntry
          } = entry;

          return {
            ...publicEntry,
            author_name: authorName,
            has_attachment: true,
            attachment_url: null,
          };
        }

        const {
          attachment_path: _privatePath,
          author_id: _privateAuthorId,
          ...publicEntry
        } = entry;

        return {
          ...publicEntry,
          author_name: authorName,
          has_attachment: true,
          attachment_url: data.signedUrl,
          attachment_secure_url: `/api/material/view?path=${encodeURIComponent(entry.attachment_path)}`,
        };
      } catch (error) {
        console.error(
          "Materi privat belum dapat ditampilkan:",
          error instanceof Error ? error.message : error
        );

        const {
          attachment_path: _privatePath,
          author_id: _privateAuthorId,
          ...publicEntry
        } = entry;

        return {
          ...publicEntry,
          author_name: authorName,
          has_attachment: true,
          attachment_url: null,
        };
      }
    })
  );

  return (
    <main className="inner-page folder-public-page">
      <div
        className="shell inner-card"
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          boxSizing: "border-box",
        }}
      >
        <p className="eyebrow">
          {sectionLabel(section)}
        </p>

        <h1>{folder.title}</h1>

        {folder.description && (
          <p className="inner-lead">
            {folder.description}
          </p>
        )}

        {hasChildren && (
          <section
            className="section-folder-grid"
            aria-label={`Subfitur ${folder.title}`}
            style={{ marginTop: "30px" }}
          >
            {(childFolders ?? []).map((child) => (
              <article
                key={child.id}
                className="section-folder-shell"
              >
                <Link
                  className="section-folder-card"
                  href={`${folderPath(section)}/${child.slug}`}
                >
                  <div
                    className="section-cute-icon"
                    aria-hidden="true"
                  >
                    <span className="section-cute-spark">&#10022;</span>
                    <span className="section-cute-emoji">&#9671;</span>
                  </div>

                  <div className="section-folder-copy">
                    <h2>{child.title}</h2>

                    {child.description && (
                      <p>{child.description}</p>
                    )}
                  </div>

                  <span
                    className="folder-arrow"
                    aria-hidden="true"
                  >
                    &rarr;
                  </span>
                </Link>
              </article>
            ))}
          </section>
        )}

        <div
            className="folder-entry-list"
            style={{
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              overflow: "hidden",
              boxSizing: "border-box",
            }}
          >
            <FolderEntryList
              entries={entriesWithSignedUrls as Entry[]}
              isAdmin={isAdmin}
            />
          </div>

        {isAdmin && (
          <FolderAdminControls
            folder={{
              id: folder.id,
              section,
              title: folder.title,
              slug: folder.slug,
              description: folder.description ?? "",
            }}
          />
        )}

        <Link
          className="back-link"
          href={publicPath(section)}
        >
          &larr; kembali
        </Link>
      </div>
    </main>
  );
}






