import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  READER_ACCESS_COOKIE,
  READER_PASSWORD_COOKIE,
} from "@/lib/reader-access";

export async function POST() {
  try {
    const supabase = await createClient();

    await supabase.auth.signOut();

    const response = NextResponse.json({
      ok: true,
    });

    response.cookies.set({
      name: READER_ACCESS_COOKIE,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV ===
        "production",
      path: "/",
      maxAge: 0,
    });

    response.cookies.set({
      name: READER_PASSWORD_COOKIE,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV ===
        "production",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error(
      "Reader logout error:",
      error
    );

    return NextResponse.json(
      {
        error: "Logout gagal.",
      },
      {
        status: 500,
      }
    );
  }
}