"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function authenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Tidak memiliki akses.");
  return supabase;
}

export async function setContactMessageRead(id: string, isRead: boolean) {
  try {
    const supabase = await authenticatedClient();
    const { error } = await supabase
      .from("contact_messages")
      .update({ is_read: isRead })
      .eq("id", id);

    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/superadmin/messages");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Akses ditolak." };
  }
}

export async function deleteContactMessage(id: string) {
  try {
    const supabase = await authenticatedClient();
    const { error } = await supabase.from("contact_messages").delete().eq("id", id);

    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/superadmin/messages");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Akses ditolak." };
  }
}
