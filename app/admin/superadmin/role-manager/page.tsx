import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import RoleManager, { type ManagedUser } from "./RoleManager";

export const metadata = {
  title: "Role Manager · menjadi nol",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function RoleManagerPage() {
  const supabase = await createClient();

  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claims?.claims?.sub) redirect("/login");

  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2") redirect("/login");

  const currentUserId = claims.claims.sub as string;

  const { data: profile } = await supabase
    .from("admin_users")
    .select("user_id,role")
    .eq("user_id", currentUserId)
    .maybeSingle();

  if (!profile || profile.role !== "superadmin") redirect("/admin");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Konfigurasi server Supabase belum lengkap.");
  }

  const admin = createAdminClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const [staffResult, readersResult, authResult] = await Promise.all([
    admin
      .from("admin_users")
      .select("user_id,role,display_name")
      .order("display_name", { ascending: true }),
    admin
      .from("reader_users")
      .select("user_id,email,full_name,is_active,status")
      .not("user_id", "is", null)
      .order("full_name", { ascending: true }),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  if (staffResult.error) throw staffResult.error;
  if (readersResult.error) throw readersResult.error;
  if (authResult.error) throw authResult.error;

  const authById = new Map(
    (authResult.data.users ?? []).map((u) => [u.id, u])
  );
  const users = new Map<string, ManagedUser>();

  for (const item of readersResult.data ?? []) {
    if (!item.user_id || item.is_active === false || item.status === "blocked") continue;
    const auth = authById.get(item.user_id);
    users.set(item.user_id, {
      user_id: item.user_id,
      role: "reader",
      display_name:
        item.full_name ||
        auth?.user_metadata?.display_name ||
        auth?.user_metadata?.full_name ||
        null,
      email: item.email || auth?.email || null,
    });
  }

  for (const item of staffResult.data ?? []) {
    const auth = authById.get(item.user_id);
    users.set(item.user_id, {
      user_id: item.user_id,
      role: item.role,
      display_name:
        item.display_name ||
        auth?.user_metadata?.display_name ||
        auth?.user_metadata?.full_name ||
        null,
      email: auth?.email || null,
    });
  }

  const managedUsers = [...users.values()].sort((a, b) =>
    (a.display_name || a.email || "").localeCompare(
      b.display_name || b.email || "",
      "id"
    )
  );

  return (
    <RoleManager
      users={managedUsers}
      currentUserId={currentUserId}
    />
  );
}
