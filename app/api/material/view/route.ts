import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import {
  READER_ACCESS_COOKIE,
  verifyReaderAccessToken,
} from "@/lib/reader-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "learning-materials";

// =========================================================
// NORMALISASI PATH
// =========================================================

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizePath(value: string) {
  let path = safeDecode(value || "").trim();

  path = path.replace(/^\/+/, "");

  if (path.startsWith(`${BUCKET}/`)) {
    path = path.slice(BUCKET.length + 1);
  }

  return path;
}

// =========================================================
// AMANKAN NAMA FILE
// =========================================================

function safeFilename(value: string) {
  return (
    value
      .replace(/[\r\n"]/g, "")
      .replace(/[<>:"/\\|?*]/g, "_")
      .trim() || "lampiran"
  );
}

// =========================================================
// GET /api/material/view?path=xxx
// =========================================================

export async function GET(request: NextRequest) {
  try {
    // =====================================================
    // 1. CEK LOGIN READER
    // =====================================================

    const cookieStore = await cookies();

    const accessToken =
      cookieStore.get(READER_ACCESS_COOKIE)?.value ?? "";

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "Akses ditolak.",
        },
        {
          status: 401,
        }
      );
    }

    const reader = await verifyReaderAccessToken(accessToken);

    if (!reader) {
      return NextResponse.json(
        {
          error: "Sesi pembaca tidak valid.",
        },
        {
          status: 401,
        }
      );
    }

    // =====================================================
    // 2. AMBIL PATH
    // =====================================================

    const rawPath =
      request.nextUrl.searchParams.get("path") ?? "";

    const requestedPath = normalizePath(rawPath);

    if (!requestedPath) {
      return NextResponse.json(
        {
          error: "Path file tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    // Cegah path traversal
    if (
      requestedPath.includes("..") ||
      requestedPath.startsWith("/") ||
      requestedPath.includes("\\")
    ) {
      return NextResponse.json(
        {
          error: "Path file tidak diizinkan.",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // 3. SUPABASE ADMIN
    //    SERVICE ROLE HANYA BERADA DI SERVER
    // =====================================================

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error(
        "Supabase server environment belum lengkap."
      );

      return NextResponse.json(
        {
          error: "Konfigurasi server tidak tersedia.",
        },
        {
          status: 500,
        }
      );
    }

    const admin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // =====================================================
    // 4. PASTIKAN FILE MEMANG MILIK CONTENT PUBLISHED
    // =====================================================

    const possiblePaths = [
      requestedPath,
      `${BUCKET}/${requestedPath}`,
    ];

    const {
      data: attachment,
      error: attachmentError,
    } = await admin
      .from("content_folder_entries")
      .select(
        `
          id,
          attachment_path,
          attachment_name,
          attachment_mime,
          attachment_size,
          status
        `
      )
      .in("attachment_path", possiblePaths)
      .eq("status", "published")
      .maybeSingle();

    if (attachmentError) {
      console.error(
        "Gagal memeriksa attachment:",
        attachmentError
      );

      return NextResponse.json(
        {
          error: "Lampiran tidak dapat diverifikasi.",
        },
        {
          status: 500,
        }
      );
    }

    if (!attachment) {
      return NextResponse.json(
        {
          error:
            "Lampiran tidak ditemukan atau belum dipublikasikan.",
        },
        {
          status: 404,
        }
      );
    }

    const storedPath = normalizePath(
      attachment.attachment_path ?? ""
    );

    if (storedPath !== requestedPath) {
      return NextResponse.json(
        {
          error: "Lampiran tidak valid.",
        },
        {
          status: 403,
        }
      );
    }

    // =====================================================
    // 5. MIME YANG BOLEH DITAMPILKAN
    // =====================================================

    const mime =
      attachment.attachment_mime ||
      "application/octet-stream";

    const allowedMimeTypes = new Set([
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/avif",

        "application/pdf",

        "video/mp4",
        "video/webm",
        "video/quicktime",
        "video/x-m4v",
        "audio/mpeg",
        "audio/wav",
        "text/plain",
        "text/html",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/msword",
        "application/vnd.ms-excel",
        "application/vnd.ms-powerpoint",
        "application/zip",
        "application/x-rar-compressed",
        "application/x-7z-compressed",]);

    if (!allowedMimeTypes.has(mime)) {
      return NextResponse.json(
        {
          error: "Jenis file tidak diizinkan.",
        },
        {
          status: 415,
        }
      );
    }

    // =====================================================
    // 6. DOWNLOAD FILE DI SERVER
    //
    //    PENTING:
    //    URL SUPABASE TIDAK PERNAH DIKIRIM KE CLIENT.
    // =====================================================

    const {
      data: fileBlob,
      error: downloadError,
    } = await admin.storage
      .from(BUCKET)
      .download(requestedPath);

    if (downloadError || !fileBlob) {
      console.error(
        "Gagal membaca file dari storage:",
        downloadError
      );

      return NextResponse.json(
        {
          error: "File tidak dapat dibuka.",
        },
        {
          status: 404,
        }
      );
    }

    const buffer = await fileBlob.arrayBuffer();

    const filename = safeFilename(
      attachment.attachment_name ||
        requestedPath.split("/").pop() ||
        "lampiran"
    );

    // =====================================================
    // 7. TAMPILKAN INLINE — BUKAN ATTACHMENT
    // =====================================================

    return new NextResponse(buffer, {
      status: 200,

      headers: {
        "Content-Type": mime,

        // Jangan Content-Disposition: attachment
        "Content-Disposition":
          `inline; filename="${filename}"`,

        // Jangan cache sebagai file publik
        "Cache-Control":
          "private, no-store, no-cache, must-revalidate, max-age=0",

        Pragma: "no-cache",

        Expires: "0",

        "X-Content-Type-Options": "nosniff",

        "Referrer-Policy": "same-origin",

        // Membatasi embedding ke website sendiri
        "Content-Security-Policy":
          "frame-ancestors 'self'",
      },
    });
  } catch (error) {
    console.error(
      "Material view error:",
      error
    );

    return NextResponse.json(
      {
        error: "Lampiran tidak dapat dibuka.",
      },
      {
        status: 500,
      }
    );
  }
}