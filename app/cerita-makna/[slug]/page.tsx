import PublicEntryPage from "@/app/components/PublicEntryPage";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <PublicEntryPage
      section="cerita-makna"
      slug={slug}
    />
  );
}
