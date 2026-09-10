import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  READER_ACCESS_COOKIE,
  verifyReaderAccessToken,
} from "@/lib/reader-access";

const BUCKET = "learning-materials";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

function normalizePath(value: unknown) {
  let path = String(value ?? "").trim();

  if (!path || path.length > 500) return "";

  path = path.split("?")[0].split("#")[0];

  try {
    const url = new URL(path);
    path = decodeURIComponent(url.pathname);
  } catch {
    // sudah berupa storage path biasa
  }

  path = decodeURIComponent(path)
    .replace(/^\/+/, "")
    .replace(/^learning-materials\//, "");

  // cegah path traversal
  if (
    path.includes("..") ||
    path.includes("\\") ||
    path.startsWith("/")
  ) {
    return "";
  }

  return path;
}

export async function POST(request: NextRequest) {
  try {
    /*
     * 1. WAJIB sudah login reader + OTP.
     */
    const accessToken =
      request.cookies.get(READER_ACCESS_COOKIE)?.value;

    const reader =
      await verifyReaderAccessToken(accessToken);

    if (!reader) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    /*
     * 2. Ambil input.
     */
    const body = await request.json().catch(() => null);
    const path = normalizePath(body?.path);

    if (!path) {
      return NextResponse.json(
        { error: "Path lampiran tidak valid." },
        { status: 400 }
      );
    }

    /*
     * 3. Service role HANYA hidup di server.
     */
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRole =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRole) {
      console.error(
        "Secure material env belum lengkap."
      );

      return NextResponse.json(
        { error: "Konfigurasi server belum lengkap." },
        { status: 500 }
      );
    }

    const admin = createClient(
      supabaseUrl,
      serviceRole,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    /*
     * 4. Jangan percaya path dari browser.
     * Pastikan path tersebut benar-benar tercatat
     * sebagai attachment konten.
     */
    const {
      data: attachment,
      error: attachmentError,
    } = await admin
      .from("content_folder_entries")
      .select(
        `
          id,
          attachment_path,
          attachment_mime,
          status
        `
      )
      .eq("attachment_path", path)
      .eq("status", "published")
      .maybeSingle();

    if (
      attachmentError ||
      !attachment ||
      attachment.attachment_path !== path
    ) {
      return NextResponse.json(
        { error: "Lampiran tidak ditemukan." },
        { status: 404 }
      );
    }

    if (
      attachment.attachment_mime &&
      !ALLOWED_MIME.has(
        attachment.attachment_mime
      )
    ) {
      return NextResponse.json(
        { error: "Jenis lampiran tidak diizinkan." },
        { status: 415 }
      );
    }

    /*
     * 5. Signed URL pendek.
     * Tidak perlu 1 jam.
     * 10 menit cukup untuk viewer.
     */
    const {
      data,
      error,
    } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 10);

    if (error || !data?.signedUrl) {
      console.error(
        "createSignedUrl:",
        error?.message
      );

      return NextResponse.json(
        { error: "Lampiran tidak dapat dibuka." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        url: data.signedUrl,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "private, no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error(
      "secure material error:",
      error
    );

    return NextResponse.json(
      { error: "Lampiran tidak dapat dibuka." },
      { status: 500 }
    );
  }
}