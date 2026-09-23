import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type LatestEntry = {
  id: string;
  folder_id: string;
};

type ContentFolder = {
  section: string;
  slug: string;
};

export default async function LatestContentNotice() {
  const supabase = await createClient();

  const { data: latestEntry, error: entryError } = await supabase
    .from("content_folder_entries")
    .select("id,folder_id,published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle<LatestEntry>();

  if (entryError || !latestEntry) {
    return null;
  }

  const { data: folder, error: folderError } = await supabase
    .from("content_folders")
    .select("section,slug")
    .eq("id", latestEntry.folder_id)
    .eq("is_published", true)
    .maybeSingle<ContentFolder>();

  if (folderError || !folder) {
    return null;
  }

  const href = `/${folder.section}/folder/${folder.slug}?entry=${encodeURIComponent(latestEntry.id)}`;

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


