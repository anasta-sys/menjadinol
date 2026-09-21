import { redirect } from "next/navigation";

import {
  requireAdminSession,
  type AdminRole,
} from "@/lib/admin-auth";

import AdminExtras from "./AdminExtras";

export const metadata = {
  title: "Admin · menjadi nol",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

type AnalyticsPeriod =
  | "7d"
  | "30d"
  | "3m"
  | "6m"
  | "1y"
  | "all";

type ContentSection =
  | "tentang"
  | "layanan"
  | "ruang-belajar"
  | "ruang-jeda"
  | "artikel"
  | "kontak";

const allowedSections =
  new Set<ContentSection>([
    "tentang",
    "layanan",
    "ruang-belajar",
    "ruang-jeda",
    "artikel",
    "kontak",
  ]);

function normalizePeriod(
  value?: string
): AnalyticsPeriod {
  if (
    value === "7d" ||
    value === "30d" ||
    value === "3m" ||
    value === "6m" ||
    value === "1y" ||
    value === "all"
  ) {
    return value;
  }

  return "30d";
}

function normalizeSection(
  value?: string
): ContentSection {
  if (
    value &&
    allowedSections.has(
      value as ContentSection
    )
  ) {
    return value as ContentSection;
  }

  return "tentang";
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string;
    section?: string;
  }>;
}) {
  /*
   * =========================================================
   * 1. QUERY PARAM
   * =========================================================
   */
  const params =
    await searchParams;

  const analyticsPeriod =
    normalizePeriod(
      params?.period
    );

  const initialSection =
    normalizeSection(
      params?.section
    );

  /*
   * =========================================================
   * 2. SERVER AUTH
   * =========================================================
   */
  let session;

  try {
    session =
      await requireAdminSession();
  } catch (error) {
    console.error(
      "Admin session check failed:",
      error
    );

    redirect("/admin-login");
  }

  const adminRole =
    session.role as AdminRole;

  /*
   * =========================================================
   * 3. WRITER TIDAK BOLEH MASUK /admin
   * =========================================================
   */
  if (
    adminRole === "writer"
  ) {
    redirect(
      `/writer?section=${initialSection}`
    );
  }

  /*
   * =========================================================
   * 4. HANYA ADMIN / SUPERADMIN
   * =========================================================
   */
  if (
    adminRole !== "admin" &&
    adminRole !== "superadmin"
  ) {
    redirect("/admin-login");
  }

  /*
   * =========================================================
   * 5. AMBIL NAMA ADMIN YANG SEDANG LOGIN
   * =========================================================
   */
  const {
    data: adminProfile,
    error: adminProfileError,
  } = await session.supabase
    .from("admin_users")
    .select("display_name")
    .eq("user_id", session.userId)
    .maybeSingle();

  if (adminProfileError) {
    console.error(
      "Failed to load admin display name:",
      adminProfileError
    );
  }

  const displayName =
    adminProfile?.display_name?.trim() ||
    "Admin";

  /*
   * =========================================================
   * 6. ADMIN CONTENT AREA
   * =========================================================
   */
  return (
    <main
      className="admin-page"
      style={{
        maxWidth: "1600px",
        margin: "0 auto",
        padding: "18px",
      }}
    >
      {/* GREETING ADMIN */}
      <section
        style={{
          marginBottom: "18px",
          padding: "22px 24px",
          border: "1px solid rgba(105, 125, 100, 0.14)",
          borderRadius: "18px",
          background:
            "linear-gradient(135deg, #fffdf8 0%, #f4f7ef 100%)",
        }}
      >
        <p
          style={{
            margin: "0 0 5px",
            color: "#71806d",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Menjadi Nol
        </p>

        <h1
          style={{
            margin: "0 0 7px",
            color: "#344737",
            fontFamily:
              'Georgia, "Times New Roman", serif',
            fontSize: "clamp(24px, 3vw, 34px)",
            fontWeight: 500,
            lineHeight: 1.2,
          }}
        >
          Halo, {displayName} 👋
        </h1>

        <p
          style={{
            margin: 0,
            color: "#687168",
            fontSize: "14px",
            lineHeight: 1.65,
          }}
        >
          Selamat datang kembali. Silakan mulai
          membuat dan mengelola konten untuk ruang
          Menjadi Nol.
        </p>
      </section>

      <AdminExtras
        analyticsPeriod={
          analyticsPeriod
        }
        adminRole={
          adminRole
        }
        initialSection={
          initialSection
        }
      />
    </main>
  );
}