import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function cleanText(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function getDeviceType(userAgent: string) {
  const ua = userAgent.toLowerCase();

  if (/ipad|tablet|kindle|silk/.test(ua)) return "tablet";
  if (/mobi|android|iphone|ipod/.test(ua)) return "mobile";
  return "desktop";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const sessionId = cleanText(body.session_id, 100);
    const path = cleanText(body.path, 500);
    const referrer = cleanText(body.referrer, 500) || null;

    if (!sessionId || !path || !path.startsWith("/")) {
      return NextResponse.json(
        { ok: false, error: "Invalid analytics payload" },
        { status: 400 }
      );
    }

    // Jangan hitung aktivitas admin sendiri.
    if (path.startsWith("/admin") || path.startsWith("/login")) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const supabase = await createClient();
    const userAgent = request.headers.get("user-agent") ?? "";

    const { error } = await supabase
      .from("page_views")
      .insert({
        session_id: sessionId,
        path,
        referrer,
        device_type: getDeviceType(userAgent),
      });

    if (error) {
      console.error("Analytics insert failed:", error.message);
      return NextResponse.json(
        { ok: false, error: "Analytics unavailable" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Analytics route failed:", error);

    return NextResponse.json(
      { ok: false, error: "Analytics unavailable" },
      { status: 500 }
    );
  }
}
