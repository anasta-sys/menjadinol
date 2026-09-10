import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminExtras from "./AdminExtras";
import type { AdminRole } from "@/lib/admin-auth";

export const metadata = {
  title: "Admin · kembali ke nol",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type AnalyticsPeriod = "7d" | "30d" | "3m" | "6m" | "1y" | "all";

function normalizePeriod(value?: string): AnalyticsPeriod {
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

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const analyticsPeriod = normalizePeriod(params?.period);
  const supabase = await createClient();

  const { data: claims, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claims?.claims?.sub) {
    redirect("/login");
  }

  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aal?.currentLevel !== "aal2") {
    redirect("/login");
  }

  const userId = claims.claims.sub as string;

  const { data: admin } = await supabase
    .from("admin_users")
    .select("user_id, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (!admin) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  let adminRole: AdminRole;

  if (admin.role === "superadmin") {
    adminRole = "superadmin";
  } else if (admin.role === "admin") {
    adminRole = "admin";
  } else if (admin.role === "writer") {
    adminRole = "writer";
  } else {
    redirect("/login");
  }

  return (
    <main
      className="admin-page"
      style={{
        maxWidth: "1600px",
        margin: "0 auto",
        padding: "18px",
      }}
    >
      <AdminExtras
        analyticsPeriod={analyticsPeriod}
        adminRole={adminRole}
      />
    </main>
  );
}
