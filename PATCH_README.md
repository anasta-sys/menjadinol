# PATCH LOGIN + MFA + ADMIN CONTENT

File/folder yang ditambahkan/diganti:

app/
  login/
    page.tsx                 <- login + MFA baru
  admin/
    page.tsx                 <- validasi JWT AAL2 + whitelist admin
    AdminClient.tsx          <- tab Artikel/Tentang/Layanan/Kontak
    actions.ts               <- server actions aman
  tentang/
    page.tsx
  layanan/
    page.tsx
  artikel/
    page.tsx
    [slug]/
      page.tsx
  kontak/
    page.tsx

supabase/
  migrations/
    002_admin_site_pages.sql

## Cara pasang

1. Backup folder C:\jalanpulang.
2. Copy folder `app` dari patch ini ke C:\jalanpulang\app dan merge/replace file yang sama.
3. Copy `002_admin_site_pages.sql` ke:
   C:\jalanpulang\supabase\migrations\
4. Jalankan SQL `002_admin_site_pages.sql` di Supabase SQL Editor.
5. Pastikan migration lama yang membuat `admin_users`, `posts`, `public.is_admin()` sudah pernah dijalankan.
6. Stop dev server: Ctrl+C
7. Hapus cache Next:
   rmdir /s /q .next
8. Jalankan:
   npm run dev
9. Buka:
   http://localhost:3000/login

## Login flow baru

email/password -> MFA challenge/enroll -> verify -> refreshSession()
-> browser menulis cookie AAL2 -> request baru ke /admin
-> server membaca claim `aal2` langsung dari JWT
-> cek `admin_users`
-> dashboard.

## Dashboard admin

Setelah login tersedia tab:
- Artikel
- Tentang
- Layanan
- Kontak

Artikel disimpan di `posts`.
Tentang/Layanan/Kontak disimpan di `site_pages`.

Security tetap:
- publishable key saja di browser
- RLS
- whitelist admin
- MFA AAL2
- server-side authorization
- tidak ada service_role key di browser
