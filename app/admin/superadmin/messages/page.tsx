import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import ContactMessagesManager, { type ContactMessage } from "./ContactMessagesManager";

export const metadata = {
  title: "Pesan Masuk · Menjadi Nol",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ContactMessagesPage() {
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

  const { data, error } = await admin
    .from("contact_messages")
    .select("id,name,email,subject,message,is_read,created_at")
    .order("created_at", { ascending: false });

  return (
    <ContactMessagesManager
      initialMessages={(data ?? []) as ContactMessage[]}
      loadError={error?.message ?? ""}
    />
  );
}
