import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  READER_ACCESS_COOKIE,
  verifyReaderAccessToken,
  hashReaderSessionId,
} from "@/lib/reader-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "content-pdf-private";

function makeAdminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SERVER_CONFIG_MISSING");
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function validPdfPath(path: string) {
  return /^pdf\/[A-Za-z0-9_-]+\/[A-Za-z0-9._-]+\.pdf$/i.test(path);
}

export async function GET(request: NextRequest) {
  try {
    const path = (request.nextUrl.searchParams.get("path") || "").trim();
    if (!validPdfPath(path)) {
      return NextResponse.json({ error: "Path PDF tidak valid." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Silakan login." }, { status: 401 });
    }

    const adminDb = makeAdminDb();

    // Admin/writer yang sedang login boleh melihat PDF untuk preview/editor.
    const { data: adminUser } = await adminDb
      .from("admin_users")
      .select("user_id,role")
      .eq("user_id", user.id)
      .maybeSingle();

    let allowed = Boolean(
      adminUser &&
      ["writer", "admin", "superadmin"].includes(String(adminUser.role))
    );

    if (allowed) {
      const { data: claims } = await supabase.auth.getClaims();
      allowed = claims?.claims?.aal === "aal2";
    }

    // Selain admin/writer, wajib lolos reader_access + active session.
    if (!allowed) {
      const token = request.cookies.get(READER_ACCESS_COOKIE)?.value;
      const access = await verifyReaderAccessToken(token);

      if (!access || access.userId !== user.id) {
        return NextResponse.json({ error: "Sesi pembaca tidak valid." }, { status: 401 });
      }

      const { data: reader } = await adminDb
        .from("reader_users")
        .select("user_id,is_active,status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!reader || !reader.is_active || reader.status === "blocked") {
        return NextResponse.json({ error: "Akun pembaca tidak aktif." }, { status: 403 });
      }

      const sessionHash = await hashReaderSessionId(access.sessionId);

      const { data: activeSession } = await adminDb
        .from("reader_active_sessions")
        .select("session_hash,expires_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (
        !activeSession ||
        activeSession.session_hash !== sessionHash ||
        !activeSession.expires_at ||
        new Date(activeSession.expires_at).getTime() <= Date.now()
      ) {
        return NextResponse.json({ error: "Sesi pembaca sudah berakhir." }, { status: 401 });
      }

      allowed = true;
    }

    if (!allowed) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const { data, error } = await adminDb.storage.from(BUCKET).download(path);
    if (error || !data) {
      console.error("Private PDF download failed:", error);
      return NextResponse.json({ error: "PDF tidak ditemukan." }, { status: 404 });
    }

    return new NextResponse(await data.arrayBuffer(), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store, max-age=0",
        "Pragma": "no-cache",
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch (error) {
    console.error("Secure content PDF:", error);
    return NextResponse.json({ error: "PDF tidak dapat dibuka." }, { status: 500 });
  }
}
