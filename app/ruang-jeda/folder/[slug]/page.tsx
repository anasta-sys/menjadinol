import FolderPublicPage from "@/app/components/FolderPublicPage";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <FolderPublicPage section="ruang-jeda" slug={slug} />;
}

