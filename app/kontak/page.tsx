import PageBackLink from "@/app/components/PageBackLink";
import { createClient } from "@/lib/supabase/server";
import SectionFolders from "@/app/components/SectionFolders";
import SectionCreatePanel from "@/app/components/SectionCreatePanel";
import EditablePageIntro from "@/app/components/EditablePageIntro";
import ContactEmailVerification from "@/app/components/contact/ContactEmailVerification";

export const metadata = {
  title: "Terima kasih sudah singgah.",
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createClient();

  const { data: folders } = await supabase
    .from("content_folders")
    .select("id,section,title,slug,description,parent_id")
    .eq("section", "kontak")
    .eq("is_published", true)
    .is("parent_id", null)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  return (
    <main className="inner-page">
      <div className="shell inner-card">
        <EditablePageIntro
          pageKey="kontak"
          defaultEyebrow="kontak"
          defaultTitle="Terima kasih sudah singgah"
          defaultDescription="Untuk keamanan dan privasi, website ini tidak menggunakan form publik atau pelacak pihak ketiga."
        />

        <ContactEmailVerification />

        <SectionFolders folders={(folders ?? []) as any} />
        <SectionCreatePanel section="kontak" label="Kontak" />

        <PageBackLink />
      </div>
    </main>
  );
}