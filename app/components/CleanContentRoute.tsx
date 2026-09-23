import { createClient } from "@/lib/supabase/server";
import FolderPublicPage from "@/app/components/FolderPublicPage";
import PublicEntryPage from "@/app/components/PublicEntryPage";

type DatabaseSection =
  | "tentang"
  | "artikel"
  | "layanan"
  | "ruang-belajar"
  | "ruang-jeda"
  | "kontak";

function databaseSection(publicSection: string): DatabaseSection {
  if (publicSection === "cerita-makna") return "artikel";
  if (publicSection === "perjalanan") return "layanan";

  return publicSection as DatabaseSection;
}

export default async function CleanContentRoute({
  section,
  slug,
}: {
  section: string;
  slug: string;
}) {
  const supabase = await createClient();
  const internalSection = databaseSection(section);

  const { data: folder } = await supabase
    .from("content_folders")
    .select("id")
    .eq("section", internalSection)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (folder) {
    return (
      <FolderPublicPage
        section={internalSection}
        slug={slug}
      />
    );
  }

  return (
    <PublicEntryPage
      section={section}
      slug={slug}
    />
  );
}
