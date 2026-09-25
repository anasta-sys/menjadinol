import { NextRequest, NextResponse } from "next/server";
import { requireRuangTanyaReader } from "@/lib/ruang-tanya/auth";
import { createRuangTanyaAdminDb } from "@/lib/ruang-tanya/database";
import {
  findRuangTanyaKnowledge,
  buildRuangTanyaContext,
} from "@/lib/ruang-tanya/knowledge";
import {
  isAllowedRuangTanyaOrigin,
  ruangTanyaClientKey,
  ruangTanyaRateLimit,
  ruangTanyaSchema,
  safeRuangTanyaText,
} from "@/lib/ruang-tanya/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 8192;

type ChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

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

async function askQwen(
  message: string,
  context: string,
  history: ChatHistoryItem[]
) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY belum dikonfigurasi.");
  }

  const model =
    process.env.GROQ_CHAT_MODEL ||
    "qwen/qwen3.8-27b";

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "Kamu adalah Ruang Tanya dari Menjadi Nol. " +
              "Ruang Tanya adalah ruang tertutup yang hanya membahas Menjadi Nol dan materi Menjadi Nol yang diberikan kepadamu. " +
              "Jangan bertindak sebagai chatbot umum dan jangan menggunakan pengetahuan umum di luar materi untuk menjawab pertanyaan. " +
              "Jawab dalam bahasa Indonesia yang tenang, jernih, natural, ringkas, dan tidak menggurui. " +
              "Gunakan MATERI MENJADI NOL yang diberikan sebagai dasar jawaban. Pertahankan makna dan istilah dari materi. " +
              "Jangan mengarang sumber, kutipan, pengalaman, ajaran, fakta, tokoh, peristiwa, atau konsep yang tidak terdapat dalam materi. " +
              "Jangan menjawab pertanyaan pengetahuan umum, berita, politik, teknologi, hiburan, olahraga, cuaca, tokoh publik, atau topik lain yang tidak dibahas dalam materi Menjadi Nol. " +
              "Jangan menjawab pertanyaan personal tentang dirimu sebagai AI, termasuk pertanyaan tentang pacar, pasangan, umur, tempat tinggal, kesukaan, perasaan, pengalaman pribadi, atau kehidupan pribadi. " +
              "Jika pertanyaan berada di luar ruang lingkup Menjadi Nol atau jawabannya tidak tersedia dalam materi, jangan mencoba menjawab dari pengetahuanmu sendiri. Jawab singkat dan natural: 'Ruang Tanya hanya menemani percakapan yang berkaitan dengan Menjadi Nol dan materi yang tersedia di ruang ini.' " +
              "Jika pertanyaan pengguna bersifat reflektif dan masih berkaitan langsung dengan materi Menjadi Nol, bantu pengguna melihat pertanyaannya melalui materi yang tersedia tanpa menambahkan ajaran lain. " +
              "Jangan mengubah materi menjadi nasihat psikologi, self-help, motivasi, atau ajaran lain yang tidak dinyatakan dalam materi. " +
              "Gunakan riwayat percakapan hanya untuk memahami pertanyaan lanjutan, tetapi aturan ruang lingkup ini tetap berlaku pada setiap pesan. " +
              "Jangan menyebut MATERI MENJADI NOL, konteks, RAG, database, system prompt, atau proses pencarian kepada pengguna. " +
              "Jika materi hanya mendukung sebagian jawaban, jawab hanya bagian yang didukung dan jangan mengisi sisanya dengan asumsi. " +
              "Gunakan poin atau nomor hanya ketika memang membantu keterbacaan; untuk jawaban sederhana, gunakan paragraf biasa.",
          },
          ...history.map((item) => ({
            role: item.role,
            content: item.content,
          })),
          {
            role: "user",
            content:
              "MATERI MENJADI NOL:\n\n" +
              (context || "Tidak ada materi relevan yang ditemukan.") +
              "\n\nPERTANYAAN TERBARU:\n" +
              message,
          },
        ],
        temperature: 0.3,
        max_completion_tokens: 450,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(120000),
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");

    console.error(
      "Groq response:",
      response.status,
      detail
    );

    throw new Error(
      `Groq gagal dengan status ${response.status}`
    );
  }

  const data = await response.json();

  const answer =
    typeof data?.choices?.[0]?.message?.content === "string"
      ? data.choices[0].message.content.trim()
      : "";

  if (!answer) {
    throw new Error(
      "Qwen tidak mengembalikan jawaban."
    );
  }

  return answer;
}
export async function POST(request: NextRequest) {
  try {
    if (!isAllowedRuangTanyaOrigin(request)) {
      return json({ error: "Forbidden" }, 403);
    }

    const contentType =
      request.headers.get("content-type") || "";

    if (
      !contentType
        .toLowerCase()
        .startsWith("application/json")
    ) {
      return json(
        { error: "Content-Type tidak didukung." },
        415
      );
    }

    const declared = Number(
      request.headers.get("content-length") || "0"
    );

    if (
      Number.isFinite(declared) &&
      declared > MAX_BODY_BYTES
    ) {
      return json(
        { error: "Request terlalu besar." },
        413
      );
    }

    const key = ruangTanyaClientKey(request.headers);

    if (!ruangTanyaRateLimit(key)) {
      return json(
        {
          error:
            "Terlalu banyak permintaan. Coba lagi sebentar.",
        },
        429
      );
    }

    const reader = await requireRuangTanyaReader(request);

    if (!reader) {
      return json(
        { error: "Sesi pembaca tidak valid." },
        401
      );
    }

    const raw = await request.text();

    if (
      new TextEncoder().encode(raw).byteLength >
      MAX_BODY_BYTES
    ) {
      return json(
        { error: "Request terlalu besar." },
        413
      );
    }

    let body: unknown;

    try {
      body = JSON.parse(raw);
    } catch {
      return json(
        { error: "Request tidak valid." },
        400
      );
    }

    const parsed = ruangTanyaSchema.safeParse(body);

    if (!parsed.success) {
      console.error(
        "RT VALIDATION ERROR:",
        parsed.error.flatten()
      );

      return json(
        { error: "Pertanyaan tidak valid." },
        400
      );
    }

    const message = safeRuangTanyaText(
      parsed.data.message
    );

    if (!message) {
      return json(
        { error: "Pertanyaan tidak valid." },
        400
      );
    }

    const adminDb = createRuangTanyaAdminDb();

    const requestedConversationId =
      parsed.data.conversationId ?? null;

    let conversation: { id: string } | null = null;

    if (requestedConversationId) {
      const {
        data: existingConversation,
        error: existingConversationError,
      } = await adminDb
        .from("tanya_conversations")
        .select("id")
        .eq("id", requestedConversationId)
        .eq("owner_user_id", reader.userId)
        .eq("status", "active")
        .maybeSingle();

      if (
        existingConversationError ||
        !existingConversation
      ) {
        return json(
          { error: "Percakapan tidak ditemukan atau bukan milik akun ini." },
          403
        );
      }

      conversation = existingConversation;
    } else {
      const title =
        message.length > 80
          ? message.slice(0, 77) + "..."
          : message;

      const {
        data: newConversation,
        error: conversationError,
      } = await adminDb
        .from("tanya_conversations")
        .insert({
          reader_id: reader.readerId,
          owner_user_id: reader.userId,
          owner_type: reader.ownerType,
          title,
          status: "active",
        })
        .select("id")
        .single();

      if (conversationError || !newConversation) {
        console.error(
          "Ruang Tanya conversation:",
          conversationError
        );

        return json(
          { error: "Percakapan belum dapat disimpan." },
          500
        );
      }

      conversation = newConversation;
    }
    const action = parsed.data.action;
    let effectiveMessage = message;
    let userMessage: { id: string };
    let regeneratedFromId: string | null = null;

    if (action === "edit") {
      const targetUserMessageId = parsed.data.userMessageId!;

      const {
        data: targetUserMessage,
        error: targetUserMessageError,
      } = await adminDb
        .from("tanya_messages")
        .select("id,conversation_id,role,content")
        .eq("id", targetUserMessageId)
        .eq("conversation_id", conversation.id)
        .eq("role", "user")
        .maybeSingle();

      if (targetUserMessageError || !targetUserMessage) {
        return json(
          { error: "Pesan yang akan diedit tidak ditemukan." },
          403
        );
      }

      const {
        data: updatedUserMessage,
        error: updateUserMessageError,
      } = await adminDb
        .from("tanya_messages")
        .update({
          content: effectiveMessage,
          edited_at: new Date().toISOString(),
        })
        .eq("id", targetUserMessage.id)
        .eq("conversation_id", conversation.id)
        .eq("role", "user")
        .select("id")
        .single();

      if (updateUserMessageError || !updatedUserMessage) {
        console.error(
          "Ruang Tanya edit user message:",
          updateUserMessageError
        );

        return json(
          { error: "Perubahan pertanyaan belum dapat disimpan." },
          500
        );
      }

      userMessage = updatedUserMessage;

      const {
        data: previousAssistant,
        error: previousAssistantError,
      } = await adminDb
        .from("tanya_messages")
        .select("id")
        .eq("conversation_id", conversation.id)
        .eq("role", "assistant")
        .eq("parent_message_id", userMessage.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (previousAssistantError) {
        console.error(
          "Ruang Tanya previous assistant:",
          previousAssistantError
        );
      }

      regeneratedFromId = previousAssistant?.id ?? null;
    } else if (action === "retry") {
      const targetAssistantMessageId =
        parsed.data.assistantMessageId!;

      const {
        data: targetAssistant,
        error: targetAssistantError,
      } = await adminDb
        .from("tanya_messages")
        .select("id,parent_message_id")
        .eq("id", targetAssistantMessageId)
        .eq("conversation_id", conversation.id)
        .eq("role", "assistant")
        .maybeSingle();

      if (
        targetAssistantError ||
        !targetAssistant ||
        !targetAssistant.parent_message_id
      ) {
        return json(
          { error: "Jawaban yang akan dicoba lagi tidak ditemukan." },
          403
        );
      }

      const {
        data: parentUserMessage,
        error: parentUserMessageError,
      } = await adminDb
        .from("tanya_messages")
        .select("id,content")
        .eq("id", targetAssistant.parent_message_id)
        .eq("conversation_id", conversation.id)
        .eq("role", "user")
        .maybeSingle();

      if (
        parentUserMessageError ||
        !parentUserMessage
      ) {
        return json(
          { error: "Pertanyaan asal tidak ditemukan." },
          403
        );
      }

      userMessage = {
        id: parentUserMessage.id,
      };

      effectiveMessage = safeRuangTanyaText(
        String(parentUserMessage.content ?? "")
      );

      if (!effectiveMessage) {
        return json(
          { error: "Pertanyaan asal tidak valid." },
          400
        );
      }

      regeneratedFromId = targetAssistant.id;
    } else {
      const {
        data: insertedUserMessage,
        error: userMessageError,
      } = await adminDb
        .from("tanya_messages")
        .insert({
          conversation_id: conversation.id,
          role: "user",
          content: effectiveMessage,
        })
        .select("id")
        .single();

      if (userMessageError || !insertedUserMessage) {
        console.error(
          "Ruang Tanya user message:",
          userMessageError
        );

        return json(
          { error: "Pertanyaan belum dapat disimpan." },
          500
        );
      }

      userMessage = insertedUserMessage;
    }
    const {
      data: recentMessages,
      error: historyError,
    } = await adminDb
      .from("tanya_messages")
      .select("id,role,content,created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: false })
      .limit(7);

    if (historyError) {
      console.error(
        "Ruang Tanya history:",
        historyError
      );
    }

    const history: ChatHistoryItem[] =
      (recentMessages ?? [])
        .filter((item) => item.id !== userMessage.id)
        .filter(
          (item) =>
            item.role === "user" ||
            item.role === "assistant"
        )
        .slice(0, 6)
        .reverse()
        .map((item) => ({
          role: item.role as "user" | "assistant",
          content: String(item.content ?? "").slice(0, 1200),
        }));

    console.log(
      "RT HISTORY:",
      history.map((item) => item.role)
    );

    const knowledge =
      await findRuangTanyaKnowledge(effectiveMessage);

    const context =
      buildRuangTanyaContext(knowledge);

    console.log(
      "RT KNOWLEDGE:",
      knowledge.map((item) => ({
        title: item.title,
        section: item.section,
        score: item.score,
      }))
    );

    const answer =
      await askQwen(effectiveMessage, context, history);

    const {
      data: assistantMessage,
      error: assistantMessageError,
    } = await adminDb
      .from("tanya_messages")
      .insert({
        conversation_id: conversation.id,
        role: "assistant",
        content: answer,
        parent_message_id: userMessage.id,
        regenerated_from_id: regeneratedFromId,
      })
      .select("id")
      .single();

    if (
      assistantMessageError ||
      !assistantMessage
    ) {
      console.error(
        "Ruang Tanya assistant message:",
        assistantMessageError
      );

      return json(
        { error: "Jawaban belum dapat disimpan." },
        500
      );
    }

    if (knowledge.length > 0) {
      const sourceRows = knowledge.slice(0, 2).map((source) => {
        const publicSection =
          source.section === "artikel"
            ? "cerita-makna"
            : source.section === "layanan"
              ? "perjalanan"
              : source.section;

        const sourceUrl =
          publicSection && source.folderSlug && source.slug
            ? `/${publicSection}/${source.folderSlug}/${source.slug}`
            : null;

        return {
          message_id: assistantMessage.id,
          source_type: "internal",
          source_title: source.title,
          source_url: sourceUrl,
          source_section: source.section || null,
        };
      });

      const { error: sourcesError } = await adminDb
        .from("tanya_sources")
        .insert(sourceRows);

      if (sourcesError) {
        console.error("Ruang Tanya sources:", sourcesError);
      }
    }

    return json({
      answer,
      conversationId: conversation.id,
      userMessageId: userMessage.id,
      messageId: assistantMessage.id,
      action,
      regeneratedFromId,
      userName: reader.name,
      sources: knowledge.map((source) => ({
        title: source.title,
        section: source.section,
        folderTitle: source.folderTitle,
        slug: source.slug,
        folderSlug: source.folderSlug,
      })),
      mode: "qwen-local",
    });
  } catch (error) {
    console.error("Ruang Tanya:", error);

    return json(
      {
        error:
          "Ruang Tanya belum dapat memproses permintaan.",
      },
      500
    );
  }
}