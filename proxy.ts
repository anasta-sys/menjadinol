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
    // ADMIN
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||

    // WRITER
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

    // SUPERADMIN LOGIN
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
   * Route Staff/Admin/Writer/Superadmin tetap diteruskan.
   * Proteksi role masing-masing tetap dilakukan
   * oleh halaman/server auth mereka.
   */
  if (isStaffRoute(pathname)) {
    return supabaseResponse;
  }

  /*
   * Route login/register tetap dapat dibuka.
   */
  if (isPublicRoute(pathname)) {
    return supabaseResponse;
  }

  /*
   * ADA SESSION SUPABASE.
   *
   * Reader bukan satu-satunya yang boleh membuka website.
   * Writer/Admin/Superadmin yang sudah login juga boleh
   * membuka Beranda, Tentang, Artikel, Ruang Belajar, dll.
   */
  if (userId) {
    return supabaseResponse;
  }

  /*
   * Tidak ada session Supabase.
   * Baru periksa akses Reader.
   */
  const readerAccess =
    request.cookies.get(READER_ACCESS_COOKIE)?.value;

  const verifiedReader =
    await verifyReaderAccessToken(readerAccess);

  if (verifiedReader) {
    return supabaseResponse;
  }

  /*
   * Bukan Staff dan bukan Reader terverifikasi.
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