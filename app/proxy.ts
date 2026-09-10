import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";
import {
  verifyReaderAccessToken,
  READER_ACCESS_COOKIE,
} from "@/lib/reader-access";

const PUBLIC_ROUTES = [
  "/reader-login",
  "/reader-register",
  "/writer-register",
  "/api/writer-register",
  "/reader-forgot-password",
  "/reader-reset-password",

  "/api/reader/send-otp",
  "/api/reader/complete-otp",
  "/api/reader/forgot-password",

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
    // ADMIN AREA
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||

    // WRITER AREA
    pathname === "/writer" ||
    pathname.startsWith("/writer/") ||

    // WRITER LOGIN
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/writer-login" ||
    pathname.startsWith("/writer-login/") ||

    // ADMIN LOGIN
    pathname === "/admin-login" ||
    pathname.startsWith("/admin-login/") ||

    // SUPERADMIN LOGIN + MFA
    pathname === "/superadmin-login" ||
    pathname.startsWith("/superadmin-login/")
  );
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  /*
   * 1. Route login / dashboard staff tetap menggunakan
   *    sistem autentikasi Supabase.
   */
  if (isStaffRoute(pathname)) {
    return updateSession(request);
  }

  /*
   * 2. Route publik untuk proses login / register.
   */
  if (isPublicRoute(pathname)) {
    return updateSession(request);
  }

  /*
   * 3. PENTING:
   *    Sebelum meminta cookie Reader, cek apakah browser
   *    mempunyai session Supabase.
   *
   *    Writer, Admin, dan Superadmin menggunakan Supabase Auth.
   *    Jika session Supabase valid, mereka boleh membuka
   *    Beranda, Tentang, Perjalanan, Ruang Belajar, Artikel,
   *    dan halaman website lainnya tanpa login sebagai Reader.
   */
  const supabaseResponse = await updateSession(request);

  /*
   * updateSession dapat memperbarui cookie Supabase.
   *
   * Kita cek keberadaan cookie auth Supabase dari request.
   * Cookie Supabase biasanya menggunakan nama:
   * sb-<project-ref>-auth-token
   * dan pada SSR dapat terpecah menjadi beberapa chunk.
   */
  const hasSupabaseAuthCookie =
    request.cookies
      .getAll()
      .some(
        (cookie) =>
          cookie.name.startsWith("sb-") &&
          cookie.name.includes("-auth-token")
      );

  if (hasSupabaseAuthCookie) {
    return supabaseResponse;
  }

  /*
   * 4. Kalau bukan staff yang sedang login,
   *    baru periksa akses Reader + OTP.
   */
  const readerAccess =
    request.cookies.get(READER_ACCESS_COOKIE)?.value;

  const verifiedReader =
    await verifyReaderAccessToken(readerAccess);

  if (verifiedReader) {
    return supabaseResponse;
  }

  /*
   * 5. Tidak punya session staff DAN tidak punya
   *    akses Reader → Reader Login.
   */
  const loginUrl = request.nextUrl.clone();

  loginUrl.pathname = "/reader-login";

  if (pathname !== "/") {
    loginUrl.searchParams.set("next", pathname);
  }

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};