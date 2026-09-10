import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import SuperAdminDashboard from "./SuperAdminDashboard";

export const metadata = {
  title: "Super Admin · kembali ke nol",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export type SuperAdminEntry = {
  id: string;
  title: string;
  slug: string;
  status: string;
  published_at: string | null;
  created_at: string | null;
  folder_id: string | null;
  author_id: string | null;
  updated_by: string | null;
  last_published_by: string | null;
  excerpt: string | null;
  body: string | null;
};

export type SuperAdminUser = {
  user_id: string;
  role: string;
  display_name: string | null;
  email: string | null;
};

export type SuperAdminFolder = {
  id: string;
  section: string;
  title: string;
  slug: string;
};

export type WriterApplication = {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  display_name: string;
  requested_access: "writer" | "admin";
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export default async function SuperAdminPage() {
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

  const { data: profile } = await supabase
    .from("admin_users")
    .select("user_id,role,display_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profile || profile.role !== "superadmin") {
    redirect("/admin");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Konfigurasi server Supabase belum lengkap.");
  }

  const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const [
    entriesResult,
    foldersResult,
    adminsResult,
    authUsersResult,
    applicationsResult,
  ] = await Promise.all([
      admin
        .from("content_folder_entries")
        .select(
          "id,title,slug,status,published_at,created_at,folder_id,author_id,updated_by,last_published_by,excerpt,body"
        )
        .order("created_at", { ascending: false })
        .limit(1000),

      admin
        .from("content_folders")
        .select("id,section,title,slug")
        .order("section", { ascending: true }),

      admin
        .from("admin_users")
        .select("user_id,role,display_name")
        .order("display_name", { ascending: true }),

      admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      }),

      admin
        .from("writer_applications")
        .select(
          "id,user_id,email,full_name,display_name,requested_access,reason,status,reviewed_by,reviewed_at,created_at"
        )
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

  if (entriesResult.error) throw entriesResult.error;
  if (foldersResult.error) throw foldersResult.error;
  if (adminsResult.error) throw adminsResult.error;
  if (authUsersResult.error) throw authUsersResult.error;
  if (applicationsResult.error) throw applicationsResult.error;

  const emailById = new Map(
    (authUsersResult.data.users ?? []).map((user) => [
      user.id,
      user.email ?? null,
    ])
  );

  const admins: SuperAdminUser[] = (adminsResult.data ?? []).map(
    (item) => ({
      user_id: item.user_id,
      role: item.role,
      display_name: item.display_name,
      email: emailById.get(item.user_id) ?? null,
    })
  );

  return (
    <SuperAdminDashboard
      entries={(entriesResult.data ?? []) as SuperAdminEntry[]}
      folders={(foldersResult.data ?? []) as SuperAdminFolder[]}
      admins={admins}
      applications={
        (applicationsResult.data ?? []) as WriterApplication[]
      }
      currentUserId={userId}
    />
  );
}