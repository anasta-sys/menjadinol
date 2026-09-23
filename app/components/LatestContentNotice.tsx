import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type LatestEntry = {
  id: string;
  folder_id: string;
  slug: string;
  published_at: string | null;
};

type ContentFolder = {
  section: string;
};

function publicSection(section: string) {
  if (section === "artikel") return "cerita-makna";
  if (section === "layanan") return "perjalanan";
  return section;
}

export default async function LatestContentNotice() {
  const supabase = await createClient();

  const { data: latestEntry, error: entryError } = await supabase
    .from("content_folder_entries")
    .select("id,folder_id,slug,published_at")
    .eq("status", "published")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle<LatestEntry>();

  if (entryError || !latestEntry) {
    return null;
  }

  const { data: folder, error: folderError } = await supabase
    .from("content_folders")
    .select("section")
    .eq("id", latestEntry.folder_id)
    .eq("is_published", true)
    .maybeSingle<ContentFolder>();

  if (folderError || !folder) {
    return null;
  }

  const section = publicSection(folder.section);
  const href = `/${section}/${encodeURIComponent(latestEntry.slug)}`;

  return (
    <Link
      href={href}
      className="mn-secondary latest-content-button"
      aria-label="Buka konten terbaru"
    >
      Konten Terbaru <span aria-hidden="true">&gt;</span>

      <style>{`
        .latest-content-button {
          gap: 8px;
          white-space: nowrap;
        }

        .latest-content-button span {
          font-size: 13px;
          line-height: 1;
        }
      `}</style>
    </Link>
  );
}
