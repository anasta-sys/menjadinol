import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireSuperAdmin } from "@/lib/admin-auth";
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

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
  deleted_at: string | null;
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

async function loadMessages() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Konfigurasi Supabase belum lengkap.");
  }

  const db = createServiceClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await db
    .from("contact_messages")
    .select(
      "id,name,email,subject,message,is_read,created_at,deleted_at"
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []) as ContactMessage[];
}

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const format =
    request.nextUrl.searchParams.get("format")?.toLowerCase() ||
    "txt";

  if (!["txt", "docx", "xlsx"].includes(format)) {
    return NextResponse.json(
      { error: "Format tidak didukung." },
      { status: 400 }
    );
  }

  let messages: ContactMessage[];

  try {
    messages = await loadMessages();
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil pesan.",
      },
      { status: 500 }
    );
  }

  const exportedAt = formatDate(new Date().toISOString());
  const fileBase = "pesan-masuk-menjadi-nol";

  if (format === "txt") {
    const lines: string[] = [
      "MENJADI NOL",
      "ARSIP PESAN MASUK",
      "",
      `Jumlah pesan: ${messages.length}`,
      `Diekspor: ${exportedAt}`,
      "",
      "=".repeat(70),
    ];

    messages.forEach((item, index) => {
      lines.push("");
      lines.push(
        `PESAN ${String(index + 1).padStart(2, "0")}`
      );
      lines.push(`Nama: ${item.name}`);
      lines.push(`Email: ${item.email}`);
      lines.push(`Subjek: ${item.subject}`);
      lines.push(`Waktu: ${formatDate(item.created_at)}`);
      lines.push(
        `Status: ${item.is_read ? "Sudah Dibaca" : "Baru"}`
      );
      lines.push("");
      lines.push(item.message);
      lines.push("");
      lines.push("=".repeat(70));
    });

    return new NextResponse(lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition":
          `attachment; filename="${fileBase}.txt"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (format === "docx") {
    const children: Paragraph[] = [
      new Paragraph({
        heading: HeadingLevel.TITLE,
        children: [
          new TextRun("Menjadi Nol - Pesan Masuk"),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "Arsip Pesan dari Formulir Kontak",
            bold: true,
          }),
        ],
      }),
      new Paragraph(`Jumlah pesan: ${messages.length}`),
      new Paragraph(`Diekspor: ${exportedAt}`),
    ];

    messages.forEach((item, index) => {
      if (index > 0) {
        children.push(
          new Paragraph({
            children: [new PageBreak()],
          })
        );
      }

      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [
            new TextRun(
              `Pesan ${String(index + 1).padStart(
                2,
                "0"
              )} - ${item.subject}`
            ),
          ],
        }),
        new Paragraph(`Nama: ${item.name}`),
        new Paragraph(`Email: ${item.email}`),
        new Paragraph(
          `Waktu: ${formatDate(item.created_at)}`
        ),
        new Paragraph(
          `Status: ${
            item.is_read ? "Sudah Dibaca" : "Baru"
          }`
        ),
        new Paragraph({
          spacing: {
            before: 220,
            after: 100,
          },
          children: [
            new TextRun({
              text: "Isi Pesan",
              bold: true,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun(item.message),
          ],
        })
      );
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
          `attachment; filename="${fileBase}.docx"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Menjadi Nol";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Pesan Masuk");

  sheet.columns = [
    {
      header: "No",
      key: "no",
      width: 7,
    },
    {
      header: "Tanggal",
      key: "date",
      width: 24,
    },
    {
      header: "Nama",
      key: "name",
      width: 25,
    },
    {
      header: "Email",
      key: "email",
      width: 35,
    },
    {
      header: "Subjek",
      key: "subject",
      width: 32,
    },
    {
      header: "Pesan",
      key: "message",
      width: 80,
    },
    {
      header: "Status",
      key: "status",
      width: 18,
    },
  ];

  messages.forEach((item, index) => {
    sheet.addRow({
      no: index + 1,
      date: formatDate(item.created_at),
      name: item.name,
      email: item.email,
      subject: item.subject,
      message: item.message,
      status: item.is_read
        ? "Sudah Dibaca"
        : "Baru",
    });
  });

  sheet.views = [
    {
      state: "frozen",
      ySplit: 1,
    },
  ];

  sheet.autoFilter = {
    from: "A1",
    to: "G1",
  };

  sheet.getRow(1).font = {
    bold: true,
  };

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
    ["MENJADI NOL"],
    ["Arsip Pesan Masuk"],
    [],
    ["Jumlah pesan", messages.length],
    ["Diekspor", exportedAt],
  ]);

  info.getColumn(1).width = 25;
  info.getColumn(2).width = 45;

  info.getRow(1).font = {
    bold: true,
    size: 16,
  };

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(
    new Uint8Array(buffer),
    {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          `attachment; filename="${fileBase}.xlsx"`,
        "Cache-Control": "no-store",
      },
    }
  );
}