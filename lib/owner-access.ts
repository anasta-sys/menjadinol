/*
 * =========================================================
 * OWNER ACCESS — MENJADI NOL
 * =========================================================
 *
 * Akses khusus pemilik utama.
 *
 * HANYA email di bawah yang boleh mendapatkan
 * akses lintas area:
 *
 * - Superadmin
 * - Admin
 * - Writer
 *
 * User lain tetap mengikuti role masing-masing.
 */

export const OWNER_EMAIL =
  "anaspuspita93@gmail.com";

export function isOwnerEmail(
  email?: string | null
): boolean {
  if (!email) {
    return false;
  }

  return (
    email.trim().toLowerCase() ===
    OWNER_EMAIL
  );
}