import PageBackLink from "@/app/components/PageBackLink";
import { createClient } from "@/lib/supabase/server";
import SectionFolders from "@/app/components/SectionFolders";
import SectionCreatePanel from "@/app/components/SectionCreatePanel";
import EditablePageIntro from "@/app/components/EditablePageIntro";

export const metadata = {
  title: "Sinopsis"
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createClient();

  const { data: folders } = await supabase
    .from("content_folders")
    .select("id,section,title,slug,description")
    .eq("section", "sinopsis")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  return (
    <main className="inner-page">
      <div className="shell inner-card">

        <EditablePageIntro
          pageKey="sinopsis"
          defaultEyebrow="sinopsis"
          defaultTitle="Cerita yang singgah, makna yang dibawa pulang"
          defaultDescription="Catatan tentang buku, film, dokumenter, dan tontonan yang meninggalkan makna, dilihat melalui perjalanan Jalan Pulang."
        />

        <SectionFolders
          folders={(folders ?? []) as any}
        />

        <SectionCreatePanel
          section="sinopsis"
          label="Sinopsis"
        />

        <PageBackLink />
      </div>
    </main>
  );
}