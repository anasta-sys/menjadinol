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
  | "sinopsis"
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
  status: EntryStatus;
  created_at: string | null;
  updated_at: string | null;

  // Identitas penulis disimpan sebagai UUID di database.
  // Nama yang dikirim ke client hanya display_name.
  author_id: string | null;
  author_name?: string | null;
};

function publicPath(section: Section) {
  return section === "layanan"
    ? "/perjalanan"
    : `/${section}`;
}

function sectionLabel(section: Section) {
  if (section === "layanan") {
    return "perjalanan";
  }

  return section.replace("-", " ");
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
    .select("id,title,slug,description")
    .eq("section", section)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (folderError || !folder) {
    notFound();
  }

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
      "id,folder_id,title,slug,excerpt,body,table_data,attachment_path,attachment_name,attachment_mime,attachment_size,status,created_at,updated_at,author_id"
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
      "Gagal mengambil tulisan folder:",
      entriesError.message
    );
  }

  /*
   * Nama penulis diambil SERVER-SIDE menggunakan Admin Client.
   * Service role tidak pernah dikirim ke browser.
   *
   * Kita hanya mengambil user_id + display_name,
   * bukan email/password/session admin.
   */
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
          attachment_url: null
        };
      }

      try {
        const { data, error } = await adminSupabase.storage
          .from(MATERIAL_BUCKET)
          .createSignedUrl(entry.attachment_path, 60 * 15);

        if (error) {
          console.error(
            "Gagal membuat signed URL materi:",
            error.message
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
            attachment_url: null
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
          attachment_url: data.signedUrl
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
          attachment_url: null
        };
      }
    })
  );

  return (
    <main className="inner-page folder-public-page">
      <div className="shell inner-card">
        <p className="eyebrow">
          {sectionLabel(section)}
        </p>

        <h1>{folder.title}</h1>

        {folder.description && (
          <p className="inner-lead">
            {folder.description}
          </p>
        )}

        <div className="folder-entry-list">
          <FolderEntryList
            entries={entriesWithSignedUrls as Entry[]}
            isAdmin={isAdmin}
          />
        </div>

        {isAdmin && (
          <FolderAdminControls
            folder={{
              id: folder.id,
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
          ← kembali
        </Link>
      </div>
    </main>
  );
}
