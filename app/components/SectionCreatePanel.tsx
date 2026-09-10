import { createClient } from "@/lib/supabase/server";
import SectionCreateAdmin from "@/app/components/SectionCreateAdmin";

type Section =
  | "tentang"
  | "artikel"
  | "layanan"
  | "ruang-belajar"
  | "sinopsis"
  | "kontak";

export default async function SectionCreatePanel({
  section,
  label,
}: {
  section: Section;
  label: string;
}) {
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims?.sub) {
    return null;
  }

  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aal?.currentLevel !== "aal2") {
    return null;
  }

  const { data: admin } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", claims.claims.sub)
    .maybeSingle();

  if (!admin) {
    return null;
  }

  return (
    <SectionCreateAdmin
      section={section}
      label={label}
    />
  );
}
