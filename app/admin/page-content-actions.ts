"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sanitizeRichText } from "@/lib/rich-text";

type PageKey =
  | "tentang"
  | "perjalanan"
  | "ruang-belajar"
  | "ruang-jeda"
  | "artikel"
  | "kontak";

const allowedPages = new Set<PageKey>([
  "tentang",
  "perjalanan",
  "ruang-belajar",
  "ruang-jeda",
  "artikel",
  "kontak",
]);

function clean(
  value: FormDataEntryValue | null,
  max: number
) {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

function pagePath(pageKey: PageKey) {
  return `/${pageKey}`;
}

async function requireAdminAal2() {
  const supabase = await createClient();

  const {
    data: claims,
    error: claimsError,
  } = await supabase.auth.getClaims();

  if (
    claimsError ||
    !claims?.claims?.sub
  ) {
    throw new Error("Unauthorized");
  }

  const userId =
    claims.claims.sub;

  const { data: aal } =
    await supabase.auth.mfa
      .getAuthenticatorAssuranceLevel();

  if (aal?.currentLevel !== "aal2") {
    throw new Error("MFA required");
  }

  const { data: admin } =
    await supabase
      .from("admin_users")
      .select("user_id")
      .eq(
        "user_id",
        userId
      )
      .maybeSingle();

  if (!admin) {
    throw new Error("Forbidden");
  }

  return {
    supabase,
    userId,
  };
}

export async function updatePageContent(
  formData: FormData
) {
  const {
    supabase,
    userId,
  } =
    await requireAdminAal2();

  const pageKey =
    clean(
      formData.get("page_key"),
      40
    ) as PageKey;

  if (!allowedPages.has(pageKey)) {
    throw new Error(
      "Halaman tidak valid."
    );
  }

  const eyebrow = clean(
    formData.get("eyebrow"),
    60
  );

  const title = clean(
    formData.get("title"),
    240
  );

  const description =
    sanitizeRichText(
      String(
        formData.get("description") ?? ""
      ),
      2000
    );

  const writerLocation = clean(
    formData.get("writer_location"),
    160
  );

  if (!title) {
    throw new Error(
      "Judul halaman wajib diisi."
    );
  }

  const payload = {
    page_key: pageKey,
    eyebrow,
    title,
    description,
    author_id: userId,
    writer_location:
      writerLocation || null,
    updated_at:
      new Date().toISOString(),
  };

  const { error } =
    await supabase
      .from("page_content")
      .upsert(
        payload,
        {
          onConflict: "page_key",
        }
      );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(
    pagePath(pageKey)
  );
}