import PageBackLink from "@/app/components/PageBackLink";
import { createClient } from "@/lib/supabase/server";
import SectionFolders from "@/app/components/SectionFolders";
import SectionCreatePanel from "@/app/components/SectionCreatePanel";
import EditablePageIntro from "@/app/components/EditablePageIntro";

export const metadata = {
  title: "Cerita & Makna",
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createClient();

  const { data: folders } = await supabase
    .from("content_folders")
    .select("id,section,title,slug,description,parent_id")
    .eq("section", "artikel")
    .eq("is_published", true)
    .is("parent_id", null)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  return (
    <main className="article-index">
      <section
        className="shell"
        style={{
          paddingTop: "8px",
          paddingBottom: "8px",
        }}
      >
        <div
          style={{
            width: "min(100%, 1040px)",
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
            pageKey="artikel"
            defaultEyebrow="artikel"
            defaultTitle="Catatan sepanjang jalan"
            defaultDescription=""
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
              section="artikel"
              label="Cerita & Makna"
            />

            <PageBackLink />
          </div>
        </div>
      </section>
    </main>
  );
}