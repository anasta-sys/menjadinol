import PageBackLink from "@/app/components/PageBackLink";
import { createClient } from "@/lib/supabase/server";
import SectionFolders from "@/app/components/SectionFolders";
import SectionCreatePanel from "@/app/components/SectionCreatePanel";
import EditablePageIntro from "@/app/components/EditablePageIntro";

export const metadata = {
  title: "Perjalanan"
};

export const dynamic = "force-dynamic";

export default async function PerjalananPage() {
  const supabase = await createClient();

  const { data: folders, error } = await supabase
    .from("content_folders")
    .select("id,section,title,slug,description")
    .eq("section", "layanan")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    console.error("Gagal mengambil folder Perjalanan:", error.message);
  }

  return (
    <main className="inner-page">
      <div className="shell inner-card">

        <EditablePageIntro
          pageKey="perjalanan"
          defaultEyebrow="perjalanan"
          defaultTitle="Setiap perjalanan membawa kita lebih dekat pada kesadaran"
          defaultDescription="Ruang untuk menyusuri pengalaman, refleksi, dan proses kehidupan. Bukan tentang seberapa jauh kita berjalan, tetapi tentang apa yang kita sadari sepanjang perjalanan."
        />

        <SectionFolders
          folders={(folders ?? []) as any}
        />

        <SectionCreatePanel
          section="layanan"
          label="Perjalanan"
        />
        <PageBackLink />
      </div>
    </main>
  );
}