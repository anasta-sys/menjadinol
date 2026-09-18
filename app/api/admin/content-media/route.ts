import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function extensionFor(
  type: string,
  kind: "image" | "pdf"
) {
  if (kind === "pdf") return "pdf";
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "";
}

export async function POST(request: Request) {
  try {
    const session = await requireAdminSession();

    const formData = await request.formData();
    const file = formData.get("file");
    const kind = formData.get("kind");

    if (
      !(file instanceof File) ||
      (kind !== "image" && kind !== "pdf")
    ) {
      return NextResponse.json(
        { error: "File tidak valid." },
        { status: 400 }
      );
    }

    const typeAllowed =
      kind === "image"
        ? IMAGE_TYPES.has(file.type)
        : file.type === "application/pdf";

    if (!typeAllowed) {
      return NextResponse.json(
        { error: "Format file tidak diizinkan." },
        { status: 415 }
      );
    }

    const maxSize =
      kind === "image"
        ? 8 * 1024 * 1024
        : 20 * 1024 * 1024;

    if (file.size <= 0 || file.size > maxSize) {
      return NextResponse.json(
        { error: "Ukuran file melebihi batas." },
        { status: 413 }
      );
    }

    const extension = extensionFor(
      file.type,
      kind
    );

    if (!extension) {
      return NextResponse.json(
        { error: "Ekstensi file tidak valid." },
        { status: 415 }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

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

    const path =
      `${kind}/${session.userId}/` +
      `${crypto.randomUUID()}.${extension}`;

    const bytes =
      new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } =
      await adminDb.storage
        .from("content-media")
        .upload(path, bytes, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        });

    if (uploadError) {
      console.error(
        "Content media upload failed:",
        uploadError
      );

      return NextResponse.json(
        { error: "Upload file gagal." },
        { status: 500 }
      );
    }

    const { data } =
      adminDb.storage
        .from("content-media")
        .getPublicUrl(path);

    return NextResponse.json({
      ok: true,
      url: data.publicUrl,
      path,
      kind,
    });
  } catch (error) {
    console.error(
      "Content media access failed:",
      error
    );

    return NextResponse.json(
      { error: "Akses admin tidak valid atau sesi MFA berakhir." },
      { status: 401 }
    );
  }
}
