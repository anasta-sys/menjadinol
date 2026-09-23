import { redirect } from "next/navigation";

export default async function LegacySinopsisFolderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/ruang-jeda/${slug}`);
}

