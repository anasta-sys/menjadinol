import { NextRequest, NextResponse } from "next/server";
import { requireRuangTanyaReader } from "@/lib/ruang-tanya/auth";
import { createRuangTanyaAdminDb } from "@/lib/ruang-tanya/database";
import { isAllowedRuangTanyaOrigin } from "@/lib/ruang-tanya/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    if (!isAllowedRuangTanyaOrigin(request)) {
      return json({ error: "Forbidden" }, 403);
    }

    const reader = await requireRuangTanyaReader(request);

    if (!reader) {
      return json({ error: "Sesi pembaca tidak valid." }, 401);
    }

    const adminDb = createRuangTanyaAdminDb();
    const conversationId = request.nextUrl.searchParams.get("id");

    if (!conversationId) {
      const { data, error } = await adminDb
        .from("tanya_conversations")
        .select("id,title,status,created_at,updated_at")
        .eq("owner_user_id", reader.userId)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Ruang Tanya conversation list:", error);
        return json({ error: "Riwayat percakapan belum dapat dimuat." }, 500);
      }

      return json({
        conversations: (data ?? []).map((item) => ({
          id: item.id,
          title: item.title || "Percakapan",
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        })),
      });
    }

    const { data: conversation, error: conversationError } = await adminDb
      .from("tanya_conversations")
      .select("id,title,status,created_at,updated_at")
      .eq("id", conversationId)
      .eq("owner_user_id", reader.userId)
      .eq("status", "active")
      .maybeSingle();

    if (conversationError || !conversation) {
      return json({ error: "Percakapan tidak ditemukan." }, 404);
    }

    const { data: messages, error: messagesError } = await adminDb
      .from("tanya_messages")
      .select("id,role,content,created_at")
      .eq("conversation_id", conversation.id)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Ruang Tanya conversation messages:", messagesError);
      return json({ error: "Isi percakapan belum dapat dimuat." }, 500);
    }

    const assistantIds = (messages ?? [])
      .filter((item) => item.role === "assistant")
      .map((item) => item.id);

    let sources: Array<{
      message_id: string;
      source_title: string;
      source_url: string | null;
      source_section: string | null;
    }> = [];

    if (assistantIds.length > 0) {
      const { data: sourceRows, error: sourceError } = await adminDb
        .from("tanya_sources")
        .select("message_id,source_title,source_url,source_section")
        .in("message_id", assistantIds)
        .order("created_at", { ascending: true });

      if (sourceError) {
        console.error("Ruang Tanya conversation sources:", sourceError);
      } else {
        sources = sourceRows ?? [];
      }
    }

    return json({
      conversation: {
        id: conversation.id,
        title: conversation.title || "Percakapan",
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at,
      },
      messages: (messages ?? []).map((item) => ({
        id: item.id,
        role: item.role,
        content: item.content,
        createdAt: item.created_at,
        sources:
          item.role === "assistant"
            ? sources
                .filter((source) => source.message_id === item.id)
                .map((source) => ({
                  title: source.source_title,
                  url: source.source_url,
                  section: source.source_section,
                }))
            : [],
      })),
    });
  } catch (error) {
    console.error("Ruang Tanya conversations:", error);
    return json({ error: "Riwayat percakapan belum dapat diproses." }, 500);
  }
}