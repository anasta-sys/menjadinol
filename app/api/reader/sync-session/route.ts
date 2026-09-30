import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logSystemError } from "@/lib/system-monitoring/logger";

export const dynamic = "force-dynamic";

function noStore(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return noStore(
          { error: "Origin tidak diizinkan." },
          403
        );
      }
    } catch {
      return noStore(
        { error: "Origin tidak valid." },
        403
      );
    }
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return noStore(
      { error: "Request tidak valid." },
      400
    );
  }

  const payload = body as {
    access_token?: unknown;
    refresh_token?: unknown;
  };

  const accessToken =
    typeof payload.access_token === "string"
      ? payload.access_token
      : "";

  const refreshToken =
    typeof payload.refresh_token === "string"
      ? payload.refresh_token
      : "";

  if (!accessToken || !refreshToken) {
    return noStore(
      { error: "Token session tidak lengkap." },
      400
    );
  }

  const supabase = await createClient();

  const {
    data: userData,
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !userData.user) {
    await logSystemError({
      severity: "warning",
      module: "reader",
      action: "sync-session-user-invalid",
      errorCode:
        userError?.code ||
        "READER_SYNC_SESSION_USER_INVALID",
      technicalMessage:
        userError?.message ||
        "Browser session tidak menghasilkan user yang valid.",
      userMessage: "Session browser tidak valid.",
      userId: null,
      userEmail: null,
      userType: "reader",
      requestPath: "/api/reader/sync-session",
    });

    return noStore(
      { error: "Session browser tidak valid." },
      401
    );
  }

  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (sessionError || !sessionData.session) {
    await logSystemError({
      severity: "error",
      module: "reader",
      action: "sync-session-set-session",
      errorCode:
        sessionError?.code ||
        "READER_SYNC_SESSION_SET_SESSION_FAILED",
      technicalMessage:
        sessionError?.message ||
        "Session Supabase tidak tersedia setelah setSession.",
      userMessage: "Session tidak dapat disimpan.",
      userId: userData.user.id,
      userEmail: userData.user.email ?? null,
      userType: "reader",
      requestPath: "/api/reader/sync-session",
    });

    return noStore(
      { error: "Session tidak dapat disimpan." },
      401
    );
  }

  if (sessionData.user?.id !== userData.user.id) {
    await logSystemError({
      severity: "critical",
      module: "reader",
      action: "sync-session-identity-mismatch",
      errorCode: "READER_SYNC_SESSION_IDENTITY_MISMATCH",
      technicalMessage:
        "User ID setelah setSession tidak sama dengan user yang telah diverifikasi.",
      userMessage: "Identitas session tidak sesuai.",
      userId: userData.user.id,
      userEmail: userData.user.email ?? null,
      userType: "reader",
      requestPath: "/api/reader/sync-session",
    });

    await supabase.auth.signOut();

    return noStore(
      { error: "Identitas session tidak sesuai." },
      401
    );
  }

  return noStore({
    ok: true,
    user_id: userData.user.id,
  });
}
