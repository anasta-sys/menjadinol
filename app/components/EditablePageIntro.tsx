import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import PageIntroEditor from "@/app/components/PageIntroEditor";

type PageKey =
  | "tentang"
  | "perjalanan"
  | "ruang-belajar"
  | "ruang-jeda"
  | "cerita-makna"
  | "kontak";

function formatWib(
  value: string | null | undefined
) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const tanggal =
    new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date);

  const jam =
    new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .format(date)
      .replace(":", ".");

  return `${tanggal} Â· ${jam} WIB`;
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
  const supabase =
    await createClient();

  const {
    data: content,
    error: contentError,
  } = await supabase
    .from("page_content")
    .select(
      "eyebrow,title,description,created_at,updated_at,author_id,writer_location"
    )
    .eq("page_key", pageKey)
    .maybeSingle();

  if (contentError) {
    console.error(
      `Gagal mengambil page_content ${pageKey}:`,
      contentError.message
    );
  }

  const eyebrow =
    content?.eyebrow ??
    defaultEyebrow;

  const title =
    content?.title ??
    defaultTitle;

  const description =
    content?.description ??
    defaultDescription;

  /*
   * Ambil nama penulis dari admin_users
   * berdasarkan author_id yang tersimpan
   * pada page_content.
   */
  let authorName:
    | string
    | null = null;

  if (content?.author_id) {
    const adminSupabase =
      createAdminClient();

    const {
      data: author,
      error: authorError,
    } = await adminSupabase
      .from("admin_users")
      .select("display_name")
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

  /*
   * Cek hak akses admin.
   */
  let isAdmin = false;

  const {
    data: claims,
  } =
    await supabase.auth.getClaims();

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

  const createdAt =
    content?.created_at ?? null;

  const updatedAt =
    content?.updated_at ?? null;

  /*
   * Direvisi hanya muncul apabila
   * updated_at memang lebih baru
   * daripada created_at.
   */
  const hasRevision =
    Boolean(
      createdAt &&
        updatedAt &&
        new Date(updatedAt).getTime() >
          new Date(createdAt).getTime() +
            1000
    );

  return (
    <>
      <p className="eyebrow">
        {eyebrow}
      </p>

      <h1>
        {title}
      </h1>

      {createdAt && (
        <div
          className="entry-time-meta"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "0px",
            marginTop: "10px",
            marginBottom: "18px",
            color: "#747d75",
            fontSize: "12px",
            lineHeight: 1.6,
          }}
        >
          {/* BARIS 1 â€” PENULIS */}
          <div>
          <span>Ditulis oleh</span>

          <strong
            style={{
            color: "#536653",
            fontWeight: 700,
            marginLeft: "4px",
            }}
          >
          {authorName ||
           "Penulis belum tercatat"}
          </strong>

            <span>
              {" Â· "}
              {formatWib(
                createdAt
              )}
            </span>
          </div>

          {/* BARIS 2 â€” REVISI */}
          {hasRevision && (
            <div
              style={{
                color: "#858d86",
                fontSize: "11px",
                lineHeight: 1.6,
              }}
            >
              Direvisi{" "}
              {formatWib(
                updatedAt
              )}
            </div>
          )}

          {/* BARIS 3 â€” LOKASI */}
          {content?.writer_location && (
            <div
              style={{
                color: "#667768",
                fontSize: "11px",
                lineHeight: 1.6,
              }}
            >
              ðŸ“{" "}
              {
                content.writer_location
              }
            </div>
          )}
        </div>
      )}

      {description && (
        <div
          className={
            leadClassName
          }
          dangerouslySetInnerHTML={{
            __html:
              description,
          }}
        />
      )}

      {isAdmin && (
        <PageIntroEditor
          pageKey={pageKey}
          eyebrow={eyebrow}
          title={title}
          description={
            description
          }
        />
      )}
    </>
  );
}


