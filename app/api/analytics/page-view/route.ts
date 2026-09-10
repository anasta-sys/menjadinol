import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MAX_PATH_LENGTH = 500;
const MAX_REFERRER_LENGTH = 1000;

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;

  const cleaned = value.trim().slice(0, maxLength);

  return cleaned || null;
}

function validSessionId(value: unknown) {
  if (typeof value !== "string") return null;

  const cleaned = value.trim();

  if (
    cleaned.length < 16 ||
    cleaned.length > 100 ||
    !/^[a-zA-Z0-9_-]+$/.test(cleaned)
  ) {
    return null;
  }

  return cleaned;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const sessionId = validSessionId(body?.sessionId);
    const path = cleanText(body?.path, MAX_PATH_LENGTH);
    const referrer = cleanText(body?.referrer, MAX_REFERRER_LENGTH);
    const deviceType = cleanText(body?.deviceType, 40);

    if (
      !sessionId ||
      !path ||
      !path.startsWith("/") ||
      path.startsWith("/admin") ||
      path.startsWith("/api/") ||
      path.startsWith("/login") ||
      path.startsWith("/reader-") ||
      path.startsWith("/auth/")
    ) {
      return NextResponse.json(
        { error: "Invalid page view." },
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRole) {
      console.error("Analytics server env missing.");

      return NextResponse.json(
        { error: "Analytics unavailable." },
        { status: 500 }
      );
    }

    const admin = createClient(url, serviceRole, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { error } = await admin
      .from("page_views")
      .insert({
        session_id: sessionId,
        path,
        referrer,
        device_type: deviceType ?? "unknown",
      });

    if (error) {
      console.error("Page view insert error:", error);

      return NextResponse.json(
        { error: "Page view not recorded." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Page view endpoint error:", error);

    return NextResponse.json(
      { error: "Page view not recorded." },
      { status: 500 }
    );
  }
}
