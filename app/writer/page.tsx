import { redirect } from "next/navigation";
import { createClient as createServiceClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import FolderManager from "@/app/admin/FolderManager";

export const metadata = {
  title: "Ruang Penulis · kembali ke nol",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type WriterSection =
  | "tentang"
  | "layanan"
  | "ruang-belajar"
  | "sinopsis"
  | "artikel"
  | "kontak";

const allowedSections = new Set<WriterSection>([
  "tentang",
  "layanan",
  "ruang-belajar",
  "sinopsis",
  "artikel",
  "kontak",
]);

function normalizeSection(value?: string): WriterSection {
  if (
    value &&
    allowedSections.has(value as WriterSection)
  ) {
    return value as WriterSection;
  }

  return "ruang-belajar";
}

export default async function WriterPage({
  searchParams,
}: {
  searchParams: Promise<{
    section?: string;
  }>;
}) {
  /*
   * =========================================================
   * 1. CEK SESSION WRITER
   * =========================================================
   */
  const supabase = await createClient();

  const {
    data: claims,
    error: claimsError,
  } = await supabase.auth.getClaims();

  const userId =
    claims?.claims?.sub as string | undefined;

  if (
    claimsError ||
    !userId
  ) {
    redirect("/writer-login");
  }

  /*
   * Writer wajib MFA / AAL2.
   */
  if (
    claims?.claims?.aal !== "aal2"
  ) {
    redirect("/writer-login");
  }

  /*
   * =========================================================
   * 2. SECTION
   * =========================================================
   */
  const params = await searchParams;

  const initialSection =
    normalizeSection(params?.section);

  /*
   * =========================================================
   * 3. SERVICE ROLE
   * =========================================================
   */
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    throw new Error(
      "Konfigurasi server Supabase belum lengkap."
    );
  }

  const adminDb =
    createServiceClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

  /*
   * =========================================================
   * 4. CEK ROLE
   * =========================================================
   */
  const {
    data: profile,
    error: profileError,
  } = await adminDb
    .from("admin_users")
    .select(
      "user_id,role,display_name"
    )
    .eq(
      "user_id",
      userId
    )
    .maybeSingle();

  if (
    profileError ||
    !profile
  ) {
    redirect("/writer-login");
  }

  if (
    profile.role !== "writer"
  ) {
    if (
      profile.role === "superadmin"
    ) {
      redirect(
        "/admin/superadmin"
      );
    }

    if (
      profile.role === "admin"
    ) {
      redirect(
        "/admin"
      );
    }

    redirect(
      "/writer-login"
    );
  }

  /*
   * =========================================================
   * 5. DATA WRITER
   * =========================================================
   */
  const [
    foldersResult,
    entriesResult,
  ] = await Promise.all([
    adminDb
      .from(
        "content_folders"
      )
      .select(
        "id,section,title,slug,description"
      )
      .order(
        "section",
        {
          ascending: true,
        }
      )
      .order(
        "title",
        {
          ascending: true,
        }
      ),

    adminDb
      .from(
        "content_folder_entries"
      )
      .select(
        "id,folder_id,title,slug,excerpt,body,table_data,attachment_path,attachment_name,attachment_mime,attachment_size,status,published_at,author_id"
      )
      .eq(
        "author_id",
        userId
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      ),
  ]);

  if (
    foldersResult.error
  ) {
    throw new Error(
      foldersResult.error.message
    );
  }

  if (
    entriesResult.error
  ) {
    throw new Error(
      entriesResult.error.message
    );
  }

  /*
   * =========================================================
   * 6. UI WRITER
   *
   * Header global tetap satu.
   * Tidak ada tombol Keluar tambahan di area Writer.
   * Logout tetap memakai header global.
   * =========================================================
   */
  return (
    <main
      style={{
        maxWidth: "1600px",
        margin: "0 auto",
        padding: "20px 18px 40px",
      }}
    >
      <section
        style={{
          width: "100%",
          marginTop: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            marginBottom: "18px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              className="eyebrow"
              style={{
                marginBottom: "4px",
              }}
            >
              PENULIS
            </p>

            <h1
              style={{
                margin: 0,
                fontSize: "28px",
              }}
            >
              Ruang Menulis
            </h1>

            <p
              style={{
                margin: "6px 0 0",
                opacity: 0.68,
              }}
            >
              Pilih bagian melalui header,
              lalu tulis dan kirim untuk review.
            </p>
          </div>
        </div>

        <div id="content-manager">
          <FolderManager
            folders={
              (foldersResult.data ?? []) as any
            }
            entries={
              (entriesResult.data ?? []) as any
            }
            adminRole="writer"
            initialSection={
              initialSection
            }
          />
        </div>
      </section>
    </main>
  );
}