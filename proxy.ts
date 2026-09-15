import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { updateSession } from "@/lib/supabase/proxy";
import {
  hashReaderSessionId,
  verifyReaderAccessToken,
  READER_ACCESS_COOKIE,
} from "@/lib/reader-access";

const PUBLIC_ROUTES = [
  /* =========================
   * READER
   * ========================= */
  "/reader-login",
  "/reader-register",
  "/reader-forgot-password",
  "/reader-reset-password",

  "/api/reader/send-otp",
  "/api/reader/complete-otp",
  "/api/reader/forgot-password",

  /* =========================
   * WRITER
   * ========================= */
  "/writer-register",
  "/writer-forgot-password",
  "/writer-reset-password",

  "/api/writer-register",
  "/api/writer/forgot-password",

  /* =========================
   * ADMIN
   * ========================= */
  "/admin-forgot-password",
  "/admin-reset-password",

  "/api/admin/forgot-password",

  /* =========================
   * SUPERADMIN
   * ========================= */
  "/superadmin-forgot-password",
  "/superadmin-reset-password",

  "/api/superadmin/forgot-password",

  /* =========================
   * LOGOUT
   * ========================= */
  "/api/logout",

  /* =========================
   * AUTH CALLBACK
   * ========================= */
  "/auth",
];

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`)
  );
}

function isStaffRoute(pathname: string) {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||

    pathname === "/writer" ||
    pathname.startsWith("/writer/") ||

    pathname === "/login" ||
    pathname.startsWith("/login/") ||

    pathname === "/writer-login" ||
    pathname.startsWith("/writer-login/") ||

    pathname === "/admin-login" ||
    pathname.startsWith("/admin-login/") ||

    pathname === "/superadmin-login" ||
    pathname.startsWith("/superadmin-login/")
  );
}

/* =========================================================
 * READER LOGIN REDIRECT
 *
 * URL selalu bersih:
 * /reader-login
 *
 * Tidak lagi membuat:
 * /reader-login?next=%2Ftentang
 * /reader-login?reason=session-replaced
 * ========================================================= */
function redirectToReaderLogin(
  request: NextRequest
) {
  const loginUrl =
    request.nextUrl.clone();

  loginUrl.pathname =
    "/reader-login";

  /*
   * Hapus seluruh query parameter.
   */
  loginUrl.search = "";

  const response =
    NextResponse.redirect(
      loginUrl
    );

  /*
   * Hapus reader access cookie lama.
   */
  response.cookies.delete(
    READER_ACCESS_COOKIE
  );

  return response;
}

/* =========================================================
 * SINGLE DEVICE READER SESSION
 * ========================================================= */
async function isCurrentReaderSession(
  userId: string,
  sessionId: string
) {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRole =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    console.error(
      "Reader session check env missing."
    );

    return false;
  }

  try {
    const endpoint =
      new URL(
        "/rest/v1/reader_active_sessions",
        url
      );

    endpoint.searchParams.set(
      "user_id",
      `eq.${userId}`
    );

    endpoint.searchParams.set(
      "select",
      "session_hash,expires_at"
    );

    endpoint.searchParams.set(
      "limit",
      "1"
    );

    const response =
      await fetch(
        endpoint.toString(),
        {
          method: "GET",
          headers: {
            apikey: serviceRole,
            Authorization:
              `Bearer ${serviceRole}`,
            Accept:
              "application/json",
          },
          cache: "no-store",
        }
      );

    if (!response.ok) {
      console.error(
        "Reader session DB check failed:",
        response.status
      );

      return false;
    }

    const rows =
      (await response.json()) as Array<{
        session_hash: string;
        expires_at: string;
      }>;

    const row = rows[0];

    if (!row) {
      return false;
    }

    /*
     * Session reader sudah kedaluwarsa.
     */
    if (
      new Date(
        row.expires_at
      ).getTime() <= Date.now()
    ) {
      return false;
    }

    const expectedHash =
      await hashReaderSessionId(
        sessionId
      );

    return (
      row.session_hash ===
      expectedHash
    );
  } catch (error) {
    console.error(
      "Reader session check error:",
      error
    );

    return false;
  }
}

/* =========================================================
 * STAFF SESSION
 *
 * Writer / Admin / Superadmin
 * harus:
 * - Supabase session valid
 * - AAL2 / MFA
 * - terdaftar di admin_users
 * ========================================================= */
async function isValidStaffSession(
  request: NextRequest
) {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const publishableKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const serviceRole =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !url ||
    !publishableKey ||
    !serviceRole
  ) {
    return false;
  }

  try {
    const supabase =
      createServerClient(
        url,
        publishableKey,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },

            setAll() {
              /*
               * Refresh cookie ditangani
               * updateSession().
               */
            },
          },
        }
      );

    const {
      data: claims,
      error: claimsError,
    } =
      await supabase.auth.getClaims();

    const userId =
      claims?.claims?.sub as
        | string
        | undefined;

    if (
      claimsError ||
      !claims ||
      !claims.claims ||
      !userId
    ) {
      return false;
    }

    /*
     * Staff website wajib MFA / AAL2.
     */
    if (
      claims.claims.aal !== "aal2"
    ) {
      return false;
    }

    /*
     * Cek membership admin_users.
     *
     * Writer / admin / superadmin
     * menggunakan tabel ini.
     */
    const endpoint =
      new URL(
        "/rest/v1/admin_users",
        url
      );

    endpoint.searchParams.set(
      "user_id",
      `eq.${userId}`
    );

    endpoint.searchParams.set(
      "select",
      "user_id"
    );

    endpoint.searchParams.set(
      "limit",
      "1"
    );

    const staffResponse =
      await fetch(
        endpoint.toString(),
        {
          method: "GET",
          headers: {
            apikey: serviceRole,
            Authorization:
              `Bearer ${serviceRole}`,
            Accept:
              "application/json",
          },
          cache: "no-store",
        }
      );

    if (!staffResponse.ok) {
      console.error(
        "Staff proxy check failed:",
        staffResponse.status
      );

      return false;
    }

    const rows =
      (await staffResponse.json()) as
        Array<{
          user_id: string;
        }>;

    return rows.length > 0;
  } catch (error) {
    console.error(
      "Staff proxy verification failed:",
      error
    );

    return false;
  }
}

/* =========================================================
 * MAIN PROXY
 * ========================================================= */
export async function proxy(
  request: NextRequest
) {
  const pathname =
    request.nextUrl.pathname;

  /*
   * Refresh Supabase session SATU kali.
   */
  const {
    response: supabaseResponse,
  } =
    await updateSession(request);

  /*
   * STAFF ROUTES
   *
   * Login / dashboard writer,
   * admin, dan superadmin tetap
   * memakai mekanisme auth/MFA
   * masing-masing.
   */
  if (isStaffRoute(pathname)) {
    return supabaseResponse;
  }

  /*
   * PUBLIC ROUTES
   */
  if (isPublicRoute(pathname)) {
    return supabaseResponse;
  }

  /*
   * STAFF VALID
   *
   * Writer/admin/superadmin yang
   * sudah AAL2 boleh membuka
   * halaman website biasa.
   */
  const validStaffSession =
    await isValidStaffSession(
      request
    );

  if (validStaffSession) {
    return supabaseResponse;
  }

  /* =======================================================
   * READER
   *
   * Reader wajib memiliki cookie
   * hasil OTP.
   * ======================================================= */
  const readerAccess =
    request.cookies.get(
      READER_ACCESS_COOKIE
    )?.value;

  const verifiedReader =
    await verifyReaderAccessToken(
      readerAccess
    );

  /*
   * Belum login / cookie invalid.
   */
  if (!verifiedReader) {
    return redirectToReaderLogin(
      request
    );
  }

  /* =======================================================
   * SINGLE DEVICE CHECK
   *
   * Session ID pada cookie harus
   * sama dengan session aktif DB.
   *
   * Login di device kedua akan
   * mengganti session_hash sehingga
   * device pertama otomatis invalid.
   * ======================================================= */
  const currentSession =
    await isCurrentReaderSession(
      verifiedReader.userId,
      verifiedReader.sessionId
    );

  if (!currentSession) {
    return redirectToReaderLogin(
      request
    );
  }

  /*
   * Reader valid + session device valid.
   */
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};