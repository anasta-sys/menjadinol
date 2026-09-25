"use server";

import { revalidatePath } from "next/cache";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireAdminOrSuperAdmin } from "@/lib/admin-auth";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Konfigurasi Supabase server belum lengkap.");
  }

  return createServiceClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function sendCeritaReply(
  conversationId: string,
  content: string
) {
  try {
    await requireAdminOrSuperAdmin();

    const cleanId = String(conversationId ?? "").trim();
    const cleanContent = String(content ?? "").trim();

    if (!cleanId) {
      return {
        ok: false,
        error: "ID cerita tidak valid.",
      };
    }

    if (!cleanContent) {
      return {
        ok: false,
        error: "Balasan belum ditulis.",
      };
    }

    if (cleanContent.length > 20000) {
      return {
        ok: false,
        error: "Balasan terlalu panjang.",
      };
    }

    const supabase = getServiceClient();

    const { data: conversation, error: conversationError } =
      await supabase
        .from("cerita_conversations")
        .select("id")
        .eq("id", cleanId)
        .maybeSingle();

    if (conversationError) {
      return {
        ok: false,
        error: conversationError.message,
      };
    }

    if (!conversation) {
      return {
        ok: false,
        error: "Cerita tidak ditemukan.",
      };
    }

    const { error: messageError } = await supabase
      .from("cerita_messages")
      .insert({
        conversation_id: cleanId,
        role: "admin",
        content: cleanContent,
      });

    if (messageError) {
      return {
        ok: false,
        error: messageError.message,
      };
    }

    const { error: updateError } = await supabase
      .from("cerita_conversations")
      .update({
        status: "new_reply",
        updated_at: new Date().toISOString(),
      })
      .eq("id", cleanId);

    if (updateError) {
      return {
        ok: false,
        error: updateError.message,
      };
    }

    revalidatePath("/admin/superadmin/ruang-cerita");
    revalidatePath(
      `/admin/superadmin/ruang-cerita/${cleanId}`
    );

    return {
      ok: true,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Akses ditolak.",
    };
  }
}

export async function deleteCerita(conversationId: string) {
  try {
    await requireAdminOrSuperAdmin();

    const cleanId = String(conversationId ?? "").trim();

    if (!cleanId) {
      return {
        ok: false,
        error: "ID cerita tidak valid.",
      };
    }

    const supabase = getServiceClient();

    const { error } = await supabase
      .from("cerita_conversations")
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", cleanId);

    if (error) {
      return {
        ok: false,
        error: error.message,
      };
    }

    revalidatePath("/admin/superadmin/ruang-cerita");

    return {
      ok: true,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Akses ditolak.",
    };
  }
}

export async function restoreCerita(conversationId: string) {
  try {
    await requireAdminOrSuperAdmin();

    const cleanId = String(conversationId ?? "").trim();

    if (!cleanId) {
      return {
        ok: false,
        error: "ID cerita tidak valid.",
      };
    }

    const supabase = getServiceClient();

    const { error } = await supabase
      .from("cerita_conversations")
      .update({
        deleted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cleanId);

    if (error) {
      return {
        ok: false,
        error: error.message,
      };
    }

    revalidatePath("/admin/superadmin/ruang-cerita");

    return {
      ok: true,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Akses ditolak.",
    };
  }
}
