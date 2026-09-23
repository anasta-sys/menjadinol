import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MATERIAL_BUCKET } from "@/lib/material-attachments";
import { EntryContent } from "@/app/components/FolderEntryList";
import type { ContentTableData } from "@/app/components/ContentTableBuilder";

type Entry = {
  id: string;
  folder_id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  table_data: ContentTableData | null;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  attachment_size: number | null;
  status: "draft" | "published";
  created_at: string | null;
  updated_at: string | null;
  writer_location?: string | null;
  author_id: string | null;
};

function publicSectionMatches(databaseSection: string, publicSection: string) {
  if (publicSection === "cerita-makna") {
    return databaseSection === "artikel";
  }

  if (publicSection === "perjalanan") {
    return databaseSection === "layanan";
  }

  return databaseSection === publicSection;
}

function sectionLabel(section: string) {
  switch (section) {
    case "cerita-makna":
      return "Cerita & Makna";
    case "perjalanan":
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

export default async function PublicEntryPage({
  section,
  slug,
  folderSlug,
}: {
  section: string;
  slug: string;
  folderSlug?: string;
}) {
  const supabase = await createClient();

  const { data: entry, error: entryError } = await supabase
    .from("content_folder_entries")
    .select(
      "id,folder_id,title,slug,excerpt,body,table_data,attachment_path,attachment_name,attachment_mime,attachment_size,status,created_at,updated_at,writer_location,author_id"
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle<Entry>();

  if (entryError || !entry) {
    notFound();
  }

  const { data: folder, error: folderError } = await supabase
    .from("content_folders")
    .select("id,section,slug,is_published")
    .eq("id", entry.folder_id)
    .eq("is_published", true)
    .maybeSingle();

  if (
    folderError ||
    !folder ||
    !publicSectionMatches(folder.section, section) ||
    (folderSlug && folder.slug !== folderSlug)
  ) {
    notFound();
  }

  const adminSupabase = createAdminClient();

  let authorName = "Penulis belum tercatat";

  if (entry.author_id) {
    const { data: author } = await adminSupabase
      .from("admin_users")
      .select("display_name")
      .eq("user_id", entry.author_id)
      .maybeSingle();

    authorName = author?.display_name?.trim() || "Admin";
  }

  let attachmentUrl: string | null = null;
  let attachmentSecureUrl: string | null = null;

  if (entry.attachment_path) {
    const { data } = await adminSupabase.storage
      .from(MATERIAL_BUCKET)
      .createSignedUrl(entry.attachment_path, 60 * 10);

    attachmentUrl = data?.signedUrl ?? null;
    attachmentSecureUrl =
      `/api/material/view?path=${encodeURIComponent(entry.attachment_path)}`;
  }

  const publicEntry = {
    id: entry.id,
    title: entry.title,
    slug: entry.slug,
    excerpt: entry.excerpt,
    body: entry.body,
    table_data: entry.table_data,
    has_attachment: Boolean(entry.attachment_path),
    attachment_name: entry.attachment_name,
    attachment_mime: entry.attachment_mime,
    attachment_size: entry.attachment_size,
    attachment_url: attachmentUrl,
    attachment_secure_url: attachmentSecureUrl,
    status: entry.status,
    created_at: entry.created_at,
    updated_at: entry.updated_at,
    author_name: authorName,
    writer_location: entry.writer_location,
  };

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
        <p className="eyebrow">{sectionLabel(section)}</p>

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
          <EntryContent entry={publicEntry} isAdmin={false} />
        </div>
      </div>
    </main>
  );
}



