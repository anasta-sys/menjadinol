import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  MATERIAL_BUCKET,
  materialStoragePath,
} from "@/lib/material-attachments";

const MAX_SIZE = 12 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

function extensionFromMime(mime: string) {
  switch (mime) {
    case "application/pdf":
      return "pdf";
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    default:
      return null;
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();

    const body = await request.json();

    const folderId = String(body?.folderId ?? "").trim();
    const fileName = String(body?.fileName ?? "").trim().slice(0, 255);
    const mime = String(body?.mime ?? "").trim().toLowerCase();
    const size = Number(body?.size);

    if (!folderId || !fileName) {
      return NextResponse.json(
        { error: "Data materi tidak lengkap." },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(size) ||
      size <= 0 ||
      size > MAX_SIZE
    ) {
      return NextResponse.json(
        { error: "Ukuran materi maksimal 12 MB." },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME.has(mime)) {
      return NextResponse.json(
        { error: "Jenis file tidak diizinkan." },
        { status: 400 }
      );
    }

    const extension = extensionFromMime(mime);

    if (!extension) {
      return NextResponse.json(
        { error: "Ekstensi materi tidak valid." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Konfigurasi server belum lengkap." },
        { status: 500 }
      );
    }

    const adminDb = createServiceClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: folder, error: folderError } = await adminDb
      .from("content_folders")
      .select("id")
      .eq("id", folderId)
      .maybeSingle();

    if (folderError || !folder) {
      return NextResponse.json(
        { error: "Folder materi tidak ditemukan." },
        { status: 404 }
      );
    }

    const path = materialStoragePath(folderId, extension);

    const { data, error } = await adminDb.storage
      .from(MATERIAL_BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data) {
      console.error(
        "[material-upload] createSignedUploadUrl gagal:",
        error?.message
      );

      return NextResponse.json(
        { error: "Gagal menyiapkan upload materi." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      bucket: MATERIAL_BUCKET,
      path,
      token: data.token,
      fileName,
      mime,
      size,
    });
  } catch (error) {
    console.error("[material-upload] gagal:", error);

    return NextResponse.json(
      { error: "Akses upload materi ditolak." },
      { status: 401 }
    );
  }
}
