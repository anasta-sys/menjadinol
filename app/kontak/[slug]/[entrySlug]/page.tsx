import PublicEntryPage from "@/app/components/PublicEntryPage";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; entrySlug: string }>;
}) {
  const { slug, entrySlug } = await params;

  return (
    <PublicEntryPage
      section="kontak"
      slug={entrySlug}
      folderSlug={slug}
    />
  );
}
