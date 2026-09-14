import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";
import {
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
   *
   * HARUS PUBLIC.
   * Supaya setelah session dihapus,
   * request logout tidak dilempar ke:
   * /reader-login?next=/api/logout
   * ========================= */
  "/api/logout",

  /* =========================
   * AUTH CALLBACK
   *
   * Ini sekaligus mencakup:
   * /auth/recovery
   * /auth/writer-recovery
   * /auth/admin-recovery
   * /auth/superadmin-recovery
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
    /* =========================
     * ADMIN AREA
     * ========================= */
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||

    /* =========================
     * WRITER AREA
     * ========================= */
    pathname === "/writer" ||
    pathname.startsWith("/writer/") ||

    /* =========================
     * WRITER LOGIN + MFA
     * ========================= */
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/writer-login" ||
    pathname.startsWith("/writer-login/") ||

    /* =========================
     * ADMIN LOGIN + MFA
     * ========================= */
    pathname === "/admin-login" ||
    pathname.startsWith("/admin-login/") ||

    /* =========================
     * SUPERADMIN LOGIN + MFA
     * ========================= */
    pathname === "/superadmin-login" ||
    pathname.startsWith("/superadmin-login/")
  );
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  /*
   * Jalankan Supabase session refresh SATU KALI.
   * Sekaligus dapatkan user Supabase yang sedang login.
   */
  const {
    response: supabaseResponse,
    userId,
  } = await updateSession(request);

  /*
   * Route Staff/Admin/Writer/Superadmin
   * tetap diteruskan.
   *
   * Proteksi role masing-masing tetap
   * dilakukan oleh halaman/server auth mereka.
   */
  if (isStaffRoute(pathname)) {
    return supabaseResponse;
  }

  /*
   * Route PUBLIC:
   * - login/register
   * - forgot/reset password
   * - API recovery
   * - logout
   * - callback /auth
   *
   * Harus dapat dibuka tanpa session.
   */
  if (isPublicRoute(pathname)) {
    return supabaseResponse;
  }

  /*
   * ADA SESSION SUPABASE.
   *
   * Reader bukan satu-satunya yang boleh
   * membuka website.
   *
   * Writer/Admin/Superadmin yang sudah login
   * juga boleh membuka:
   * - Beranda
   * - Tentang
   * - Artikel
   * - Ruang Belajar
   * - dan halaman website lainnya.
   */
  if (userId) {
    return supabaseResponse;
  }

  /*
   * Tidak ada session Supabase.
   * Baru periksa akses Reader.
   */
  const readerAccess =
    request.cookies.get(
      READER_ACCESS_COOKIE
    )?.value;

  const verifiedReader =
    await verifyReaderAccessToken(
      readerAccess
    );

  if (verifiedReader) {
    return supabaseResponse;
  }

  /*
   * Bukan Staff dan bukan Reader
   * terverifikasi.
   */
  const loginUrl =
    request.nextUrl.clone();

  loginUrl.pathname =
    "/reader-login";

  /*
   * Simpan tujuan halaman hanya untuk
   * halaman website normal.
   *
   * API tidak perlu masuk query ?next=
   */
  if (
    pathname !== "/" &&
    !pathname.startsWith("/api/")
  ) {
    loginUrl.searchParams.set(
      "next",
      pathname
    );
  }

  return NextResponse.redirect(
    loginUrl
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};