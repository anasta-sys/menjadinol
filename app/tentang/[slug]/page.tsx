import CleanContentRoute from "@/app/components/CleanContentRoute";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <CleanContentRoute
      section="tentang"
      slug={slug}
    />
  );
}
