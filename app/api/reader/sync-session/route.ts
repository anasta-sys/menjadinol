import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    return noStore(
      { error: "Session tidak dapat disimpan." },
      401
    );
  }

  if (sessionData.user?.id !== userData.user.id) {
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
