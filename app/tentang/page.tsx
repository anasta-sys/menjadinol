import PageBackLink from "@/app/components/PageBackLink";
import { createClient } from "@/lib/supabase/server";
import SectionFolders from "@/app/components/SectionFolders";
import SectionCreatePanel from "@/app/components/SectionCreatePanel";
import EditablePageIntro from "@/app/components/EditablePageIntro";
export const metadata={title:"Setiap orang punya jalannya sendiri."};

export const dynamic = "force-dynamic";

export default async function Page(){
  const supabase = await createClient();
  const { data: folders } = await supabase.from("content_folders").select("id,section,title,slug,description,parent_id").eq("section","tentang").eq("is_published",true).is("parent_id",null).order("sort_order",{ascending:true}).order("title",{ascending:true});
  return (
    <main className="inner-page">
      <div className="shell inner-card">
        <EditablePageIntro
          pageKey="tentang"
          defaultEyebrow="tentang"
          defaultTitle="Setiap orang punya jalannya sendiri"
          defaultDescription="Jalan Pulang adalah ruang refleksi untuk memahami rasa, kesadaran, penerimaan, makna, dan perjalanan hidup."
        />
        <SectionFolders folders={(folders ?? []) as any}/>
        <SectionCreatePanel section="tentang" label="Tentang"/>

        <PageBackLink />
      </div>
    </main>
  );
}