import PageBackLink from "@/app/components/PageBackLink";
import { createClient } from "@/lib/supabase/server";
import SectionFolders from "@/app/components/SectionFolders";
import SectionCreatePanel from "@/app/components/SectionCreatePanel";
import EditablePageIntro from "@/app/components/EditablePageIntro";

export const metadata = {
  title: "Ruang Belajar"
};

export const dynamic = "force-dynamic";

export default async function RuangBelajarPage() {
  const supabase = await createClient();

  const { data: folders, error } = await supabase
    .from("content_folders")
    .select("id,section,title,slug,description")
    .eq("section", "ruang-belajar")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    console.error(
      "Gagal mengambil folder Ruang Belajar:",
      error.message
    );
  }

  return (
    <main className="learning-page">
      <section className="shell learning-header">
        <EditablePageIntro
          pageKey="ruang-belajar"
          defaultEyebrow="ruang belajar"
          defaultTitle="Belajar melalui perjalanan"
          defaultDescription="Kumpulan kajian, refleksi, dan pembelajaran yang dapat dibuka satu per satu sesuai perjalanan yang sedang ingin dipahami."
          leadClassName="learning-lead"
        />
      </section>

      <section className="shell">
        <SectionFolders
          folders={(folders ?? []) as any}
        />
      </section>

      <div className="shell">
        <SectionCreatePanel
          section="ruang-belajar"
          label="belajar"
        />

        <PageBackLink/>
      </div>
    </main>
  );
}
