import { notFound, redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import SectionContentManager, {
  type ContentEntry,
  type ContentFolder,
  type ContentAuthor,
} from "./SectionContentManager";

export const dynamic = "force-dynamic";

const SECTIONS = {
  tentang: { dbSection: "tentang", label: "Tentang" },
  perjalanan: { dbSection: "layanan", label: "Perjalanan" },
  "ruang-belajar": { dbSection: "ruang-belajar", label: "Ruang Belajar" },
  "ruang-jeda": { dbSection: "ruang-jeda", label: "Ruang Jeda" },
  artikel: { dbSection: "artikel", label: "Cerita & Makna" },
  kontak: { dbSection: "kontak", label: "Kontak" },
} as const;

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const config = SECTIONS[section as keyof typeof SECTIONS];
  if (!config) notFound();

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
  if (!url || !serviceRoleKey) throw new Error("Konfigurasi server Supabase belum lengkap.");

  const admin = createAdminClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: folders, error: foldersError } = await admin
    .from("content_folders")
    .select("id,section,title,slug")
    .eq("section", config.dbSection)
    .order("title", { ascending: true });

  if (foldersError) throw foldersError;

  const folderIds = (folders ?? []).map((folder) => folder.id);

  let entries: ContentEntry[] = [];
  if (folderIds.length) {
    const { data, error } = await admin
      .from("content_folder_entries")
      .select("id,title,slug,status,published_at,created_at,folder_id,author_id,updated_by,last_published_by,excerpt,body")
      .in("folder_id", folderIds)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) throw error;
    entries = (data ?? []) as ContentEntry[];
  }

  const { data: staff, error: staffError } = await admin
    .from("admin_users")
    .select("user_id,display_name")
    .order("display_name", { ascending: true });

  if (staffError) throw staffError;

  const { data: authUsers, error: authError } =
    await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (authError) throw authError;

  const emailById = new Map(
    (authUsers.users ?? []).map((user) => [user.id, user.email ?? null])
  );

  const authors: ContentAuthor[] = (staff ?? []).map((user) => ({
    user_id: user.user_id,
    display_name: user.display_name,
    email: emailById.get(user.user_id) ?? null,
  }));

  return (
    <SectionContentManager
      sectionSlug={section}
      sectionLabel={config.label}
      entries={entries}
      folders={(folders ?? []) as ContentFolder[]}
      authors={authors}
    />
  );
}
