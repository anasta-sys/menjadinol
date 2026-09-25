import { createRuangTanyaAdminDb } from "@/lib/ruang-tanya/database";

type KnowledgeSource = {
  id: string;
  title: string;
  slug: string;
  section: string;
  folderTitle: string;
  folderSlug: string;
  excerpt: string;
  text: string;
  score: number;
};

function htmlToText(value: string) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function words(value: string) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^\p{L}\p{N}\s-]/gu, " ")
        .split(/\s+/)
        .filter((word) => word.length >= 3)
    )
  );
}

function relevance(
  question: string,
  title: string,
  excerpt: string,
  text: string
) {
  const terms = words(question);

  const titleLower = title.toLowerCase();
  const excerptLower = excerpt.toLowerCase();
  const textLower = text.toLowerCase();

  let score = 0;

  for (const term of terms) {
    if (titleLower.includes(term)) score += 8;
    if (excerptLower.includes(term)) score += 4;
    if (textLower.includes(term)) score += 1;
  }

  const whole = question.trim().toLowerCase();

  if (whole && titleLower.includes(whole)) {
    score += 20;
  }

  return score;
}

export async function findRuangTanyaKnowledge(
  question: string
): Promise<KnowledgeSource[]> {
  const db = createRuangTanyaAdminDb();

  const { data: entries, error: entriesError } = await db
    .from("content_folder_entries")
    .select(
      "id,title,slug,excerpt,body,folder_id,published_at"
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1000);

  if (entriesError) {
    console.error(
      "Ruang Tanya knowledge entries:",
      entriesError
    );
    return [];
  }

  if (!entries?.length) {
    return [];
  }

  const folderIds = Array.from(
    new Set(
      entries
        .map((entry) => String(entry.folder_id || ""))
        .filter(Boolean)
    )
  );

  const { data: folders, error: foldersError } = await db
    .from("content_folders")
    .select("id,section,title,slug")
    .in("id", folderIds);

  if (foldersError) {
    console.error(
      "Ruang Tanya knowledge folders:",
      foldersError
    );
    return [];
  }

  const folderMap = new Map(
    (folders || []).map((folder) => [
      String(folder.id),
      folder,
    ])
  );

  return entries
    .map((entry) => {
      const folder = folderMap.get(
        String(entry.folder_id)
      );

      const title = String(entry.title || "").trim();
      const excerpt = htmlToText(
        String(entry.excerpt || "")
      );
      const text = htmlToText(
        String(entry.body || "")
      );

      return {
        id: String(entry.id),
        title,
        slug: String(entry.slug || ""),
        section: String(folder?.section || ""),
        folderTitle: String(folder?.title || ""),
        folderSlug: String(folder?.slug || ""),
        excerpt,
        text,
        score: relevance(
          question,
          title,
          excerpt,
          text
        ),
      };
    })
    .filter(
      (item) =>
        item.score > 0 &&
        (item.text.length > 0 ||
          item.excerpt.length > 0)
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

export function buildRuangTanyaContext(
  sources: KnowledgeSource[]
) {
  return sources
    .map((source, index) => {
      const content = (
        source.text ||
        source.excerpt
      ).slice(0, 2500);

      return [
        `[SUMBER ${index + 1}]`,
        `Judul: ${source.title}`,
        `Bagian: ${source.section}`,
        `Folder: ${source.folderTitle}`,
        `Isi:`,
        content,
      ].join("\n");
    })
    .join("\n\n");
}
