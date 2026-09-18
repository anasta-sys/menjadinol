import { redirect } from "next/navigation";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireSuperAdmin } from "@/lib/admin-auth";
import ContactMessagesManager, { type ContactMessage } from "./ContactMessagesManager";

export default async function ContactMessagesPage() {
  try {
    await requireSuperAdmin();
  } catch {
    redirect("/admin");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return <ContactMessagesManager initialMessages={[]} loadError="Konfigurasi server Supabase belum lengkap." />;
  }

  const db = createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await db
    .from("contact_messages")
    .select("id,name,email,subject,message,is_read,created_at,deleted_at")
    .order("created_at", { ascending: false });

  return (
    <ContactMessagesManager
      initialMessages={(data ?? []) as ContactMessage[]}
      loadError={error?.message ?? ""}
    />
  );
}
