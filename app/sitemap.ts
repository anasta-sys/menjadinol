import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const site = process.env.NEXT_PUBLIC_SITE_URL || "https://jalanpulang.com";

const staticPaths = [
  "",
  "/tentang",
  "/perjalanan",
  "/ruang-belajar",
  "/ruang-jeda",
  "/cerita-makna",
  "/kontak",
];

function folderPath(section: string, slug: string) {
  if (section === "layanan") return `/perjalanan/folder/${slug}`;
  if (section === "ruang-belajar") return `/ruang-belajar/tema/${slug}`;
  return `/${section}/folder/${slug}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const base: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${site}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.8,
  }));

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("content_folders")
      .select("section,slug,updated_at")
      .eq("is_published", true);

    const folders: MetadataRoute.Sitemap = (data ?? []).map((folder: any) => ({
      url: `${site}${folderPath(folder.section, folder.slug)}`,
      lastModified: folder.updated_at ? new Date(folder.updated_at) : now,
      changeFrequency: "monthly",
      priority: 0.7,
    }));

    return [...base, ...folders];
  } catch {
    return base;
  }
}
