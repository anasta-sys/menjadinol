# Jalan Pulang — Checklist Production

## 1. Supabase
- Pastikan tabel aktif: `admin_users`, `content_folders`, `content_folder_entries`, `page_content`.
- Pastikan `content_folder_entries` memiliki `table_data`, `status`, `created_at`, `updated_at`, `published_at`.
- Pastikan RLS aktif dan public hanya dapat membaca konten published sesuai policy project.
- Supabase Auth: admin tetap memakai MFA/TOTP dan whitelist `admin_users`.
- Tidak perlu membuat tabel `posts`; versi production ini memakai sistem folder + entry.

## 2. GitHub
- Jangan commit `.env.local`.
- Project final sengaja tidak menyertakan `.env.local`, `.next`, `node_modules`, atau `.vercel`.
- Commit `.env.example` sebagai panduan saja.

## 3. Vercel Environment Variables
Tambahkan di Project Settings > Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL=https://jalanpulang.com`

Gunakan nilai yang sama untuk Production; Preview dapat memakai URL preview bila diperlukan.

## 4. Supabase Auth URL
Di Supabase > Authentication > URL Configuration:
- Site URL: `https://jalanpulang.com`
- Tambahkan redirect URL production bila alur Auth membutuhkannya.
- Simpan localhost hanya untuk development lokal.

## 5. Domain
- Tambahkan `jalanpulang.com` di Vercel > Settings > Domains.
- Ikuti record DNS yang diberikan Vercel di registrar domain.
- Setelah DNS aktif, cek HTTPS sudah valid.

## 6. Setelah Deploy
Tes:
- `/`, `/tentang`, `/perjalanan`, `/ruang-belajar`, `/sinopsis`, `/artikel`, `/kontak`
- `/login` -> password -> MFA -> `/admin`
- tambah/edit/hapus folder
- tambah/edit/hapus tulisan
- rich text Bold/Miring/Coret/alignment
- tabel/kolom opsional
- draft tidak tampak saat logout/incognito
- `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`
- link WhatsApp/Telegram menampilkan OG preview
- URL salah menampilkan halaman 404 Jalan Pulang

## 7. URL Ruang Belajar
Canonical structure yang dipakai UI:
`/ruang-belajar/tema/<slug>`

Route lama `/ruang-belajar/folder/<slug>` tetap redirect supaya bookmark lama tidak putus.
