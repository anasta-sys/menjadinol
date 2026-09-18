import PageBackLink from "@/app/components/PageBackLink";
import { createClient } from "@/lib/supabase/server";
import SectionFolders from "@/app/components/SectionFolders";
import SectionCreatePanel from "@/app/components/SectionCreatePanel";
import EditablePageIntro from "@/app/components/EditablePageIntro";

export const metadata = {
  title: "Ruang Belajar",
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
      <section
        className="shell"
        style={{
          paddingTop: "78px",
          paddingBottom: "78px",
        }}
      >
        <div
          style={{
            width: "min(100%, 1200px)",
            margin: "0 auto",
            background: "rgba(255, 255, 255, 0.94)",
            border: "1px solid rgba(34, 74, 55, 0.10)",
            borderRadius: "30px",
            padding: "clamp(34px, 5vw, 64px)",
            boxSizing: "border-box",
            boxShadow:
              "0 20px 60px rgba(41, 54, 43, 0.10)",
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)",
          }}
        >
          <EditablePageIntro
            pageKey="ruang-belajar"
            defaultEyebrow="ruang belajar"
            defaultTitle="Belajar melalui perjalanan"
            defaultDescription="Kumpulan kajian, refleksi, dan pembelajaran yang dapat dibuka satu per satu sesuai perjalanan yang sedang ingin dipahami."
            leadClassName="learning-lead"
          />

          <div
            style={{
              marginTop: "34px",
            }}
          >
            <SectionFolders
              folders={(folders ?? []) as any}
            />
          </div>

          <div
            style={{
              marginTop: "30px",
            }}
          >
            <SectionCreatePanel
              section="ruang-belajar"
              label="belajar"
            />

            <PageBackLink />
          </div>
        </div>
      </section>
    </main>
  );
}