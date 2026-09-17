import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import ContentManager from "./ContentManager";

export const metadata = {
  title: "Content Manager · menjadi nol",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const SECTIONS = [
  { slug: "tentang", dbSection: "tentang", label: "Tentang" },
  { slug: "perjalanan", dbSection: "layanan", label: "Perjalanan" },
  { slug: "ruang-belajar", dbSection: "ruang-belajar", label: "Ruang Belajar" },
  { slug: "sinopsis", dbSection: "sinopsis", label: "Sinopsis" },
  { slug: "artikel", dbSection: "artikel", label: "Artikel" },
  { slug: "kontak", dbSection: "kontak", label: "Kontak" },
] as const;

export default async function ContentManagerPage() {
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

  const { data: folders, error } = await admin
    .from("content_folders")
    .select("id,section");

  if (error) throw error;

  const counts = SECTIONS.map((section) => ({
    ...section,
    folderCount: (folders ?? []).filter(
      (folder) => folder.section === section.dbSection
    ).length,
  }));

  return <ContentManager sections={counts} />;
}
