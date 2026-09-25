import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import RuangTanyaManager, {
  type RuangTanyaConversation,
  type RuangTanyaMessage,
} from "./RuangTanyaManager";

export const metadata = {
  title: "Ruang Tanya - menjadi nol",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type ConversationRow = {
  id: string;
  reader_id: string | null;
  owner_user_id: string | null;
  owner_type: string | null;
  title: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  parent_message_id: string | null;
  regenerated_from_id: string | null;
  edited_at: string | null;
  created_at: string;
};

type SourceRow = {
  message_id: string;
  source_title: string;
  source_url: string | null;
  source_section: string | null;
};

export default async function RuangTanyaPage() {
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

  const currentUserId = claims.claims.sub as string;

  const { data: profile } = await supabase
    .from("admin_users")
    .select("user_id,role")
    .eq("user_id", currentUserId)
    .maybeSingle();

  if (!profile || profile.role !== "superadmin") {
    redirect("/admin");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Konfigurasi server Supabase belum lengkap."
    );
  }

  const admin = createAdminClient(
    url,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const {
    data: conversationData,
    error: conversationError,
  } = await admin
    .from("tanya_conversations")
    .select(
      "id,reader_id,owner_user_id,owner_type,title,status,created_at,updated_at"
    )
    .order("updated_at", { ascending: false })
    .limit(500);

  if (conversationError) {
    throw conversationError;
  }

  const conversationRows =
    (conversationData ?? []) as ConversationRow[];

  const conversationIds =
    conversationRows.map((item) => item.id);

  const ownerUserIds = Array.from(
    new Set(
      conversationRows
        .map((item) => item.owner_user_id)
        .filter((value): value is string => !!value)
    )
  );

  let messageRows: MessageRow[] = [];

  if (conversationIds.length > 0) {
    const { data, error } = await admin
      .from("tanya_messages")
      .select(
        "id,conversation_id,role,content,parent_message_id,regenerated_from_id,edited_at,created_at"
      )
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    messageRows = (data ?? []) as MessageRow[];
  }

  const messageIds = messageRows.map((item) => item.id);

  let sourceRows: SourceRow[] = [];

  if (messageIds.length > 0) {
    const { data, error } = await admin
      .from("tanya_sources")
      .select(
        "message_id,source_title,source_url,source_section"
      )
      .in("message_id", messageIds)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(
        "Ruang Tanya superadmin sources:",
        error
      );
    } else {
      sourceRows = (data ?? []) as SourceRow[];
    }
  }

  let readers: Array<{
    user_id: string;
    email: string | null;
    full_name: string | null;
  }> = [];

  if (ownerUserIds.length > 0) {
    const { data, error } = await admin
      .from("reader_users")
      .select("user_id,email,full_name")
      .in("user_id", ownerUserIds);

    if (error) {
      console.error(
        "Ruang Tanya superadmin readers:",
        error
      );
    } else {
      readers = data ?? [];
    }
  }

  let staff: Array<{
    user_id: string;
    role: string | null;
    display_name: string | null;
  }> = [];

  if (ownerUserIds.length > 0) {
    const { data, error } = await admin
      .from("admin_users")
      .select("user_id,role,display_name")
      .in("user_id", ownerUserIds);

    if (error) {
      console.error(
        "Ruang Tanya superadmin staff:",
        error
      );
    } else {
      staff = data ?? [];
    }
  }

  const readerById = new Map(
    readers.map((item) => [item.user_id, item])
  );

  const staffById = new Map(
    staff.map((item) => [item.user_id, item])
  );

  const sourcesByMessage = new Map<
    string,
    RuangTanyaMessage["sources"]
  >();

  for (const source of sourceRows) {
    const current =
      sourcesByMessage.get(source.message_id) ?? [];

    current.push({
      title: source.source_title,
      url: source.source_url,
      section: source.source_section,
    });

    sourcesByMessage.set(
      source.message_id,
      current
    );
  }

  /*
   * Retry and Edit keep the old assistant answer in the
   * database. A newer assistant message points to the old
   * answer through regenerated_from_id.
   *
   * The dashboard keeps all rows for audit visibility but
   * marks superseded answers so the admin can distinguish
   * the current answer from an older generation.
   */
  const supersededIds = new Set(
    messageRows
      .map((item) => item.regenerated_from_id)
      .filter((value): value is string => !!value)
  );

  const messagesByConversation = new Map<
    string,
    RuangTanyaMessage[]
  >();

  for (const message of messageRows) {
    const current =
      messagesByConversation.get(
        message.conversation_id
      ) ?? [];

    current.push({
      id: message.id,
      role: message.role,
      content: message.content,
      parentMessageId: message.parent_message_id,
      regeneratedFromId:
        message.regenerated_from_id,
      editedAt: message.edited_at,
      createdAt: message.created_at,
      superseded: supersededIds.has(message.id),
      sources:
        sourcesByMessage.get(message.id) ?? [],
    });

    messagesByConversation.set(
      message.conversation_id,
      current
    );
  }

  const conversations: RuangTanyaConversation[] =
    conversationRows.map((conversation) => {
      const ownerId =
        conversation.owner_user_id ?? "";

      const reader = readerById.get(ownerId);
      const staffUser = staffById.get(ownerId);

      const ownerName =
        staffUser?.display_name ||
        reader?.full_name ||
        reader?.email ||
        "Pengguna";

      const ownerEmail =
        reader?.email ?? null;

      const messages =
        messagesByConversation.get(
          conversation.id
        ) ?? [];

      return {
        id: conversation.id,
        title:
          conversation.title ||
          "Percakapan tanpa judul",
        status:
          conversation.status || "active",
        ownerUserId: ownerId,
        ownerType:
          conversation.owner_type || "reader",
        ownerName,
        ownerEmail,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at,
        messages,
      };
    });

  return (
    <RuangTanyaManager
      conversations={conversations}
    />
  );
}