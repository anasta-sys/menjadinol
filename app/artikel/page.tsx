import PageBackLink from "@/app/components/PageBackLink";
import { createClient } from "@/lib/supabase/server";
import SectionFolders from "@/app/components/SectionFolders";
import SectionCreatePanel from "@/app/components/SectionCreatePanel";
import EditablePageIntro from "@/app/components/EditablePageIntro";

export const metadata = { title: "Artikel" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createClient();
  const { data: folders } = await supabase
    .from("content_folders")
    .select("id,section,title,slug,description")
    .eq("section", "artikel")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  return (
    <main className="article-index">
      <div className="shell">
        <EditablePageIntro
          pageKey="artikel"
          defaultEyebrow="artikel"
          defaultTitle="Catatan sepanjang jalan"
          defaultDescription=""
        />
        <SectionFolders folders={(folders ?? []) as any} />
        <SectionCreatePanel section="artikel" label="Artikel" />

        <PageBackLink />
      </div>
    </main>
  );
}
