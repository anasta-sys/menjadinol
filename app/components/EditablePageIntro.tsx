import { createClient } from "@/lib/supabase/server";
import PageIntroEditor from "@/app/components/PageIntroEditor";

type PageKey =
  | "tentang"
  | "perjalanan"
  | "ruang-belajar"
  | "sinopsis"
  | "artikel"
  | "kontak";

function formatWib(value: string | null | undefined) {
  if (!value) return "";

  const date = new Date(value);

  const tanggal = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);

  const jam = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(":", ".");

  return `${tanggal} · ${jam} WIB`;
}


  export default async function EditablePageIntro({
  pageKey,
  defaultEyebrow,
  defaultTitle,
  defaultDescription,
  leadClassName = "inner-lead",
}: {
  pageKey: PageKey;
  defaultEyebrow: string;
  defaultTitle: string;
  defaultDescription: string;
  leadClassName?: string;
}) {
  const supabase = await createClient();

  const {
    data: content,
  } = await supabase
    .from("page_content")
    .select(
       "eyebrow,title,description,created_at,updated_at"
    )
    .eq("page_key",pageKey)
    .maybeSingle();

  const eyebrow =
    content?.eyebrow ??
    defaultEyebrow;

  const title =
    content?.title ??
    defaultTitle;

  const description =
    content?.description ??
    defaultDescription;

  let isAdmin = false;

  const {
    data: claims,
  } = await supabase.auth.getClaims();

  if (claims?.claims?.sub) {
    const { data: aal } =
      await supabase.auth.mfa
        .getAuthenticatorAssuranceLevel();

    if (
      aal?.currentLevel === "aal2"
    ) {
      const { data: admin } =
        await supabase
          .from("admin_users")
          .select("user_id")
          .eq(
            "user_id",
            claims.claims.sub
          )
          .maybeSingle();

      isAdmin = Boolean(admin);
    }
  }

  return (
    <>
      <p className="eyebrow">
        {eyebrow}
      </p>

      <h1>
        {title}
      </h1>

    {content?.created_at && (
    <div className="entry-time-meta">
    <span>Ditulis {formatWib(content.created_at)}</span>

    {content.updated_at &&
      new Date(content.updated_at).getTime() >
        new Date(content.created_at).getTime() + 1000 && (
        <span>Diperbarui {formatWib(content.updated_at)}</span>
      )}
  </div>
  )}

      {description && (
        <div
          className={leadClassName}
          dangerouslySetInnerHTML={{
            __html: description
          }}
        />
      )}

      {isAdmin && (
        <PageIntroEditor
          pageKey={pageKey}
          eyebrow={eyebrow}
          title={title}
          description={description}
        />
      )}
    </>
  );
}
