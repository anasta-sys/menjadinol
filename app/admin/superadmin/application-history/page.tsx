import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import ApplicationHistory from "./ApplicationHistory";

export const dynamic = "force-dynamic";

export type WriterApplicationHistory = {
  id: string;
  user_id: string | null;
  email: string;
  display_name: string;
  requested_role: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

async function requireSuperadmin() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2") redirect("/admin");

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (adminUser?.role !== "superadmin") redirect("/admin");
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase server environment belum lengkap.");
  }

  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export default async function ApplicationHistoryPage() {
  await requireSuperadmin();

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("writer_applications")
    .select("id,user_id,email,display_name,requested_role,reason,status,created_at,reviewed_at,reviewed_by")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Gagal memuat riwayat permohonan: ${error.message}`);
  }

  return <ApplicationHistory applications={(data ?? []) as WriterApplicationHistory[]} />;
}
