import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import InnerPage from "@/app/components/InnerPage";
import PageContent from "@/app/components/PageContent";

export type PublicPageKey =
  | "tentang"
  | "perjalanan"
  | "ruang-belajar"
  | "sinopsis"
  | "artikel"
  | "kontak";

export default async function PublicPage({
  pageKey,
  children,
}: {
  pageKey: PublicPageKey;
  children?: React.ReactNode;
}) {
  const supabase =
    await createClient();

  const {
    data: content,
    error,
  } = await supabase
    .from("page_content")
    .select(
      `
      page_key,
      eyebrow,
      title,
      description,
      created_at,
      updated_at,
      author_id,
      writer_location
      `
    )
    .eq("page_key", pageKey)
    .maybeSingle();

  if (error) {
    console.error(
      `Gagal mengambil page_content ${pageKey}:`,
      error.message
    );
  }

  if (!content) {
    notFound();
  }

  let authorName:
    | string
    | null = null;

  if (content.author_id) {
    const adminSupabase =
      createAdminClient();

    const {
      data: author,
      error: authorError,
    } = await adminSupabase
      .from("admin_users")
      .select(
        "display_name"
      )
      .eq(
        "user_id",
        content.author_id
      )
      .maybeSingle();

    if (authorError) {
      console.error(
        "Gagal mengambil nama penulis:",
        authorError.message
      );
    }

    authorName =
      author?.display_name?.trim() ||
      null;
  }

  return (
    <InnerPage
      className={`${pageKey}-page`}
    >
      <PageContent
        content={{
          ...content,
          author_name:
            authorName ||
            "Penulis belum tercatat",
        }}
      />

      {children}
    </InnerPage>
  );
}