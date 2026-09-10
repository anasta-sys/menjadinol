import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient as createServiceClient,
} from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

import {
  READER_ACCESS_COOKIE,
  READER_PASSWORD_COOKIE,
} from "@/lib/reader-access";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest
) {
  const supabase =
    await createClient();

  /*
   * Role dicek sebelum server signOut.
   */
  const {
    data: claimsResult,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsResult?.claims?.sub as
      | string
      | undefined;

  let isStaff = false;

  if (userId) {
    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRole =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (url && serviceRole) {
      try {
        const adminDb =
          createServiceClient(
            url,
            serviceRole,
            {
              auth: {
                persistSession: false,
                autoRefreshToken: false,
              },
            }
          );

        const {
          data: staff,
        } =
          await adminDb
            .from("admin_users")
            .select("role")
            .eq("user_id", userId)
            .in(
              "role",
              [
                "writer",
                "admin",
                "superadmin",
              ]
            )
            .maybeSingle();

        isStaff = Boolean(staff);
      } catch (error) {
        console.error(
          "Logout role check warning:",
          error
        );

        isStaff =
          claimsResult?.claims?.aal ===
          "aal2";
      }
    } else {
      isStaff =
        claimsResult?.claims?.aal ===
        "aal2";
    }
  }

  /*
   * Server-side signOut juga dijalankan.
   */
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error(
      "Server logout warning:",
      error
    );
  }

  /*
   * /login = LOGIN ADMIN + PENULIS.
   * /reader-login = LOGIN PEMBACA.
   */
  const destination =
    new URL(
      isStaff
        ? "/login"
        : "/reader-login",
      request.url
    );

  const response =
    NextResponse.redirect(
      destination,
      303
    );

  response.cookies.delete(
    READER_ACCESS_COOKIE
  );

  response.cookies.delete(
    READER_PASSWORD_COOKIE
  );

  response.headers.set(
    "Cache-Control",
    "no-store"
  );

  return response;
}
