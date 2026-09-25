import { createClient } from "@/lib/supabase/client";

export type CeritaConversation = {
  id: string;
  reader_id: string;
  title: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type CeritaMessage = {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  parent_message_id: string | null;
  regenerated_from_id: string | null;
  edited_at: string | null;
  created_at: string;
};

function getClient() {
  return createClient();
}

export async function getCurrentUser() {
  const supabase = getClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  return user;
}

export async function signInReader(email: string, password: string) {
  const supabase = getClient();

  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail || !password) {
    throw new Error("Email dan password wajib diisi.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("Login tidak berhasil.");
  }

  const { data: reader, error: readerError } = await supabase
    .from("reader_users")
    .select("id, user_id, email, full_name, is_active, status")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (readerError) {
    await supabase.auth.signOut();
    throw new Error(readerError.message);
  }

  if (!reader) {
    await supabase.auth.signOut();
    throw new Error("Akun ini bukan akun reader Menjadi Nol.");
  }

  if (reader.is_active !== true) {
    await supabase.auth.signOut();
    throw new Error("Akun reader sedang tidak aktif.");
  }

  return {
    user: data.user,
    reader,
  };
}

export async function signOutReader() {
  const supabase = getClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

async function requireReader() {
  const supabase = getClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("LOGIN_REQUIRED");
  }

  const { data: reader, error: readerError } = await supabase
    .from("reader_users")
    .select("id, user_id, email, full_name, is_active, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (readerError) {
    throw new Error(readerError.message);
  }

  if (!reader) {
    throw new Error("Reader profile tidak ditemukan.");
  }

  if (reader.is_active !== true) {
    throw new Error("Akun reader sedang tidak aktif.");
  }

  return {
    supabase,
    user,
    reader,
  };
}

function makeTitle(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "Cerita tanpa judul";
  }

  if (normalized.length <= 55) {
    return normalized;
  }

  return normalized.slice(0, 52).trimEnd() + "...";
}

export async function createStory(content: string) {
  const cleanContent = content.trim();

  if (!cleanContent) {
    throw new Error("Cerita belum diisi.");
  }

  if (cleanContent.length > 2000) {
    throw new Error("Cerita maksimal 2000 karakter.");
  }

  const { supabase, reader } = await requireReader();

  const { data: conversation, error: conversationError } = await supabase
    .from("cerita_conversations")
    .insert({
      reader_id: reader.id,
      title: makeTitle(cleanContent),
      status: "waiting_read",
    })
    .select("id, reader_id, title, status, created_at, updated_at")
    .single();

  if (conversationError) {
    throw new Error(conversationError.message);
  }

  const { data: message, error: messageError } = await supabase
    .from("cerita_messages")
    .insert({
      conversation_id: conversation.id,
      role: "reader",
      content: cleanContent,
    })
    .select(
      "id, conversation_id, role, content, parent_message_id, regenerated_from_id, edited_at, created_at"
    )
    .single();

  if (messageError) {
    /*
     * Best-effort cleanup.
     * RLS may reject DELETE because reader delete permission is intentionally
     * not assumed here. If cleanup is rejected, the original error is still
     * returned and we do not expose elevated credentials in the browser.
     */
    await supabase
      .from("cerita_conversations")
      .delete()
      .eq("id", conversation.id);

    throw new Error(messageError.message);
  }

  return {
    conversation: conversation as CeritaConversation,
    message: message as CeritaMessage,
  };
}

export async function getStories() {
  const { supabase, reader } = await requireReader();

  const { data, error } = await supabase
    .from("cerita_conversations")
    .select("id, reader_id, title, status, created_at, updated_at")
    .eq("reader_id", reader.id)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CeritaConversation[];
}

export async function getThread(conversationId: string) {
  if (!conversationId) {
    throw new Error("Conversation ID tidak tersedia.");
  }

  const { supabase, reader } = await requireReader();

  const { data: conversation, error: conversationError } = await supabase
    .from("cerita_conversations")
    .select("id, reader_id, title, status, created_at, updated_at")
    .eq("id", conversationId)
    .eq("reader_id", reader.id)
    .single();

  if (conversationError) {
    throw new Error(conversationError.message);
  }

  const { data: messages, error: messagesError } = await supabase
    .from("cerita_messages")
    .select(
      "id, conversation_id, role, content, parent_message_id, regenerated_from_id, edited_at, created_at"
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (messagesError) {
    throw new Error(messagesError.message);
  }

  return {
    conversation: conversation as CeritaConversation,
    messages: (messages ?? []) as CeritaMessage[],
  };
}

export async function continueStory(
  conversationId: string,
  content: string
) {
  const cleanContent = content.trim();

  if (!conversationId) {
    throw new Error("Conversation ID tidak tersedia.");
  }

  if (!cleanContent) {
    throw new Error("Lanjutan cerita belum diisi.");
  }

  if (cleanContent.length > 2000) {
    throw new Error("Cerita maksimal 2000 karakter.");
  }

  const { supabase, reader } = await requireReader();

  const { data: conversation, error: conversationError } = await supabase
    .from("cerita_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("reader_id", reader.id)
    .single();

  if (conversationError || !conversation) {
    throw new Error("Cerita tidak ditemukan atau tidak dapat diakses.");
  }

  const { data: message, error: messageError } = await supabase
    .from("cerita_messages")
    .insert({
      conversation_id: conversationId,
      role: "reader",
      content: cleanContent,
    })
    .select(
      "id, conversation_id, role, content, parent_message_id, regenerated_from_id, edited_at, created_at"
    )
    .single();

  if (messageError) {
    throw new Error(messageError.message);
  }

  const { error: updateError } = await supabase
    .from("cerita_conversations")
    .update({
      status: "waiting_reply",
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId)
    .eq("reader_id", reader.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return message as CeritaMessage;
}