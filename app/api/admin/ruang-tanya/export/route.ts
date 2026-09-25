import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  PageBreak,
} from "docx";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

type ExportFormat = "txt" | "docx" | "xlsx";

type ConversationRow = {
  id: string;
  title: string | null;
  status: string | null;
  owner_user_id: string | null;
  owner_type: string | null;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  edited_at: string | null;
  regenerated_from_id: string | null;
  created_at: string;
};

type SourceRow = {
  message_id: string;
  source_title: string;
  source_url: string | null;
  source_section: string | null;
};

function safeFileName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80) || "pengguna";
}

function dateText(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

async function requireSuperadmin() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    return null;
  }

  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aal?.currentLevel !== "aal2") {
    return null;
  }

  const { data: admin } = await supabase
    .from("admin_users")
    .select("user_id,role")
    .eq("user_id", userId)
    .maybeSingle();

  if (!admin || admin.role !== "superadmin") {
    return null;
  }

  return userId;
}

export async function GET(request: NextRequest) {
  const superadminId = await requireSuperadmin();

  if (!superadminId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const ownerUserId =
    request.nextUrl.searchParams.get("ownerUserId")?.trim() || "";

  const format =
    (request.nextUrl.searchParams.get("format")?.trim().toLowerCase() ||
      "txt") as ExportFormat;

  if (!ownerUserId) {
    return NextResponse.json(
      { error: "ownerUserId wajib diisi." },
      { status: 400 }
    );
  }

  if (!["txt", "docx", "xlsx"].includes(format)) {
    return NextResponse.json(
      { error: "Format tidak didukung." },
      { status: 400 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Konfigurasi server belum lengkap." },
      { status: 500 }
    );
  }

  const db = createServiceClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: conversationsData, error: conversationsError } =
    await db
      .from("tanya_conversations")
      .select(
        "id,title,status,owner_user_id,owner_type,created_at,updated_at"
      )
      .eq("owner_user_id", ownerUserId)
      .order("created_at", { ascending: true });

  if (conversationsError) {
    return NextResponse.json(
      { error: conversationsError.message },
      { status: 500 }
    );
  }

  const conversations =
    (conversationsData ?? []) as ConversationRow[];

  if (conversations.length === 0) {
    return NextResponse.json(
      { error: "Percakapan tidak ditemukan." },
      { status: 404 }
    );
  }

  const conversationIds = conversations.map((item) => item.id);

  const { data: messagesData, error: messagesError } = await db
    .from("tanya_messages")
    .select(
      "id,conversation_id,role,content,edited_at,regenerated_from_id,created_at"
    )
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: true });

  if (messagesError) {
    return NextResponse.json(
      { error: messagesError.message },
      { status: 500 }
    );
  }

  const messages = (messagesData ?? []) as MessageRow[];
  const messageIds = messages.map((item) => item.id);

  let sources: SourceRow[] = [];

  if (messageIds.length > 0) {
    const { data: sourceData } = await db
      .from("tanya_sources")
      .select(
        "message_id,source_title,source_url,source_section"
      )
      .in("message_id", messageIds);

    sources = (sourceData ?? []) as SourceRow[];
  }

  let ownerName = "Pengguna";
  let ownerEmail = "";
  let ownerType = conversations[0]?.owner_type || "user";

  const { data: reader } = await db
    .from("reader_users")
    .select("name,email,user_id")
    .eq("user_id", ownerUserId)
    .maybeSingle();

  if (reader) {
    ownerName = reader.name || reader.email || "Pengguna";
    ownerEmail = reader.email || "";
  } else {
    const { data: admin } = await db
      .from("admin_users")
      .select("display_name,email,user_id,role")
      .eq("user_id", ownerUserId)
      .maybeSingle();

    if (admin) {
      ownerName =
        admin.display_name || admin.email || "Administrator";
      ownerEmail = admin.email || "";
      ownerType = admin.role || ownerType;
    }
  }

  const sourceMap = new Map<string, SourceRow[]>();

  for (const source of sources) {
    const current = sourceMap.get(source.message_id) ?? [];
    current.push(source);
    sourceMap.set(source.message_id, current);
  }

  const messageMap = new Map<string, MessageRow[]>();

  for (const message of messages) {
    const current =
      messageMap.get(message.conversation_id) ?? [];

    current.push(message);
    messageMap.set(message.conversation_id, current);
  }

  const filenameBase =
    `ruang-tanya-${safeFileName(ownerName)}-semua-percakapan`;

  if (format === "txt") {
    const lines: string[] = [];

    lines.push("MENJADI NOL");
    lines.push("RUANG TANYA - ARSIP SEMUA PERCAKAPAN");
    lines.push("");
    lines.push(`Pengguna: ${ownerName}`);
    lines.push(`Email: ${ownerEmail || "-"}`);
    lines.push(`Tipe akun: ${ownerType}`);
    lines.push(`Jumlah percakapan: ${conversations.length}`);
    lines.push(`Jumlah pesan: ${messages.length}`);
    lines.push(`Diekspor: ${dateText(new Date().toISOString())}`);
    lines.push("");
    lines.push("=".repeat(72));

    conversations.forEach((conversation, index) => {
      lines.push("");
      lines.push(
        `PERCAKAPAN ${String(index + 1).padStart(2, "0")}`
      );
      lines.push(conversation.title || "Tanpa judul");
      lines.push(`Status: ${conversation.status || "-"}`);
      lines.push(
        `Dibuat: ${dateText(conversation.created_at)}`
      );
      lines.push("-".repeat(72));

      const conversationMessages =
        messageMap.get(conversation.id) ?? [];

      for (const message of conversationMessages) {
        const role =
          message.role === "assistant"
            ? "RUANG TANYA AI"
            : ownerName.toUpperCase();

        const flags = [
          message.edited_at ? "Diedit" : "",
          message.regenerated_from_id ? "Retry" : "",
        ].filter(Boolean);

        lines.push("");
        lines.push(
          `${role} - ${dateText(message.created_at)}${
            flags.length ? ` - ${flags.join(", ")}` : ""
          }`
        );
        lines.push(message.content);

        const messageSources =
          sourceMap.get(message.id) ?? [];

        if (messageSources.length > 0) {
          lines.push("");
          lines.push("Bacaan terkait:");

          for (const source of messageSources) {
            lines.push(
              `- ${source.source_title}${
                source.source_url
                  ? ` (${source.source_url})`
                  : ""
              }`
            );
          }
        }
      }

      lines.push("");
      lines.push("=".repeat(72));
    });

    return new NextResponse(lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition":
          `attachment; filename="${filenameBase}.txt"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (format === "docx") {
    const children: Paragraph[] = [];

    children.push(
      new Paragraph({
        heading: HeadingLevel.TITLE,
        children: [new TextRun("Menjadi Nol - Ruang Tanya")],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "Arsip Semua Percakapan",
            bold: true,
          }),
        ],
      }),
      new Paragraph(`Pengguna: ${ownerName}`),
      new Paragraph(`Email: ${ownerEmail || "-"}`),
      new Paragraph(`Tipe akun: ${ownerType}`),
      new Paragraph(
        `Jumlah percakapan: ${conversations.length}`
      ),
      new Paragraph(`Jumlah pesan: ${messages.length}`),
      new Paragraph(
        `Diekspor: ${dateText(new Date().toISOString())}`
      )
    );

    conversations.forEach((conversation, index) => {
      children.push(
        new Paragraph({
          children:
            index === 0 ? [] : [new PageBreak()],
        }),
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [
            new TextRun(
              `Percakapan ${String(index + 1).padStart(
                2,
                "0"
              )} - ${conversation.title || "Tanpa judul"}`
            ),
          ],
        }),
        new Paragraph(
          `Status: ${conversation.status || "-"}`
        ),
        new Paragraph(
          `Dibuat: ${dateText(conversation.created_at)}`
        )
      );

      const conversationMessages =
        messageMap.get(conversation.id) ?? [];

      for (const message of conversationMessages) {
        const role =
          message.role === "assistant"
            ? "Ruang Tanya AI"
            : ownerName;

        const flags = [
          message.edited_at ? "Diedit" : "",
          message.regenerated_from_id ? "Retry" : "",
        ].filter(Boolean);

        children.push(
          new Paragraph({
            spacing: { before: 220, after: 70 },
            children: [
              new TextRun({
                text: `${role} - ${dateText(
                  message.created_at
                )}`,
                bold: true,
              }),
              ...(flags.length
                ? [
                    new TextRun({
                      text: ` - ${flags.join(", ")}`,
                      italics: true,
                    }),
                  ]
                : []),
            ],
          }),
          new Paragraph({
            children: [new TextRun(message.content)],
          })
        );

        const messageSources =
          sourceMap.get(message.id) ?? [];

        if (messageSources.length > 0) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: "Bacaan terkait:",
                  bold: true,
                }),
              ],
            })
          );

          for (const source of messageSources) {
            children.push(
              new Paragraph({
                bullet: { level: 0 },
                children: [
                  new TextRun(
                    `${source.source_title}${
                      source.source_url
                        ? ` - ${source.source_url}`
                        : ""
                    }`
                  ),
                ],
              })
            );
          }
        }
      }
    });

    const document = new Document({
      sections: [
        {
          properties: {},
          children,
        },
      ],
    });

    const buffer = await Packer.toBuffer(document);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition":
          `attachment; filename="${filenameBase}.docx"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Menjadi Nol";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Ruang Tanya");

  sheet.columns = [
    { header: "No", key: "no", width: 7 },
    {
      header: "No Percakapan",
      key: "conversationNo",
      width: 15,
    },
    { header: "Judul", key: "title", width: 35 },
    { header: "Status", key: "status", width: 14 },
    { header: "Waktu", key: "time", width: 24 },
    { header: "Pengirim", key: "sender", width: 22 },
    { header: "Pesan", key: "content", width: 80 },
    { header: "Edit", key: "edited", width: 10 },
    { header: "Retry", key: "retry", width: 10 },
    {
      header: "Bacaan Terkait",
      key: "sources",
      width: 55,
    },
  ];

  let rowNo = 1;

  conversations.forEach((conversation, conversationIndex) => {
    const conversationMessages =
      messageMap.get(conversation.id) ?? [];

    for (const message of conversationMessages) {
      const messageSources =
        sourceMap.get(message.id) ?? [];

      sheet.addRow({
        no: rowNo++,
        conversationNo: conversationIndex + 1,
        title: conversation.title || "Tanpa judul",
        status: conversation.status || "-",
        time: dateText(message.created_at),
        sender:
          message.role === "assistant"
            ? "Ruang Tanya AI"
            : ownerName,
        content: message.content,
        edited: message.edited_at ? "Ya" : "",
        retry: message.regenerated_from_id ? "Ya" : "",
        sources: messageSources
          .map((source) =>
            source.source_url
              ? `${source.source_title} - ${source.source_url}`
              : source.source_title
          )
          .join("\n"),
      });
    }
  });

  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = {
    from: "A1",
    to: "J1",
  };

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).height = 24;

  sheet.eachRow((row, rowNumber) => {
    row.alignment = {
      vertical: "top",
      wrapText: true,
    };

    if (rowNumber > 1) {
      row.height = 42;
    }
  });

  const info = workbook.addWorksheet("Informasi");

  info.addRows([
    ["MENJADI NOL - RUANG TANYA"],
    ["Arsip Semua Percakapan"],
    [],
    ["Pengguna", ownerName],
    ["Email", ownerEmail || "-"],
    ["Tipe akun", ownerType],
    ["Jumlah percakapan", conversations.length],
    ["Jumlah pesan", messages.length],
    ["Diekspor", dateText(new Date().toISOString())],
  ]);

  info.getColumn(1).width = 24;
  info.getColumn(2).width = 60;
  info.getRow(1).font = { bold: true, size: 16 };
  info.getRow(2).font = { bold: true };

  const excelBuffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(
    new Uint8Array(excelBuffer),
    {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          `attachment; filename="${filenameBase}.xlsx"`,
        "Cache-Control": "no-store",
      },
    }
  );
}