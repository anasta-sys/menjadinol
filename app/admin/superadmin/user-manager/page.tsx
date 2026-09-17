import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import UserManager, { type ManagedUser } from "./UserManager";

export const metadata = {
  title: "User Manager · menjadi nol",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function UserManagerPage() {
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

  const staffById = new Map(
    (staffResult.data ?? []).map((item) => [item.user_id, item])
  );
  const readerById = new Map(
    (readersResult.data ?? []).map((item) => [item.user_id, item])
  );

  const users: ManagedUser[] = (authResult.data.users ?? []).map((authUser) => {
    const staff = staffById.get(authUser.id);
    const reader = readerById.get(authUser.id);

    const role = staff?.role || "reader";

    const readerInactive =
      !!reader &&
      (reader.is_active === false || reader.status === "blocked");

    const authInactive =
      !!authUser.banned_until &&
      new Date(authUser.banned_until).getTime() > Date.now();

    return {
      user_id: authUser.id,
      role,
      display_name:
        staff?.display_name ||
        reader?.full_name ||
        authUser.user_metadata?.display_name ||
        authUser.user_metadata?.full_name ||
        null,
      email: reader?.email || authUser.email || null,
      status: readerInactive || authInactive ? "inactive" : "active",
    };
  });

  users.sort((a, b) =>
    (a.display_name || a.email || "").localeCompare(
      b.display_name || b.email || "",
      "id"
    )
  );

  return (
    <UserManager
      users={users}
      currentUserId={currentUserId}
    />
  );
}
