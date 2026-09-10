# JalanPulang.com 

Tidak ada `index.html`. Ini Next.js App Router.

## Yang diperbaiki
- Homepage dibuat proporsional mengikuti UI Accept.
- Simbol lotus dipisahkan dari wordmark.
- Tulisan besar `Jalan Pulang` sekarang HTML dengan font-weight 400:
  lebih tipis tanpa merusak bentuk lotus.
- Bagian kanan memakai visual asli dari UI Accept.
- Empat ikon bawah memakai SVG line-art.
- Logo Jalan Pulang dipasang sebagai favicon / icon tab browser.
- Tombol `masuk` membuka `/login`.
- `/login` lengkap: email + password + MFA/TOTP.
- `/admin` hanya bisa dibuka setelah authenticated + AAL2 + terdaftar di `admin_users`.

## Local
1. Copy `.env.example` menjadi `.env.local`
2. Isi URL dan Publishable Key Supabase
3. `npm install`
4. `npm run dev`
5. buka:
   - http://localhost:3000
   - http://localhost:3000/login

## Supabase setup
Jalankan:
`supabase/migrations/001_jalanpulang.sql`

Lalu:
1. Authentication > Users > buat admin manual.
2. Nonaktifkan public sign-up.
3. Ambil UUID admin.
4. Jalankan:
   `insert into public.admin_users(user_id) values ('UUID-ADMIN');`
5. Buka `/login`.
6. Login email/password.
7. Enroll TOTP MFA.
8. Setelah MFA berhasil, otomatis masuk `/admin`.

## Security
- Next.js App Router
- Supabase SSR
- RLS
- least-privilege grants
- admin whitelist
- MFA/AAL2 restrictive policy
- audit log untuk perubahan artikel
- CSP
- HSTS
- anti-clickjacking
- X-Content-Type-Options nosniff
- no third-party trackers
- no service_role key di browser
- `/login` dan `/admin` noindex

## Tambahan versi ini
Header sekarang menampilkan:
- tanggal Indonesia
- jam real-time WIB
- update setiap 1 detik
- tanpa API eksternal
- tanpa token/key tambahan

## Fix DateTime Visibility
Tanggal dan jam sekarang ditempatkan di sisi kanan header,
tepat di sebelah tombol masuk, agar selalu terlihat pada desktop.

## DateTime final visibility fix
Tanggal dan jam WIB sekarang berada di strip khusus tepat di bawah navbar.
Posisi ini tidak bergantung pada lebar kolom menu sehingga tidak bisa terpotong.

## Critical fix: Next.js hydration + CSP
Versi sebelumnya memakai static `script-src 'self'`, sehingga inline bootstrap
script Next.js diblokir. Akibatnya Client Components tidak hydrate dan jam
berhenti pada placeholder.

Versi ini memakai CSP nonce per request:
- nonce unik setiap request
- `strict-dynamic`
- `unsafe-eval` hanya ketika `next dev`
- production tidak memakai `unsafe-eval`
- Supabase session cookie tetap diproses oleh proxy

Kalender/jam:
- real-time WIB setiap detik
- klik badge membuka kalender bulan berjalan
- hari ini ditandai
- tanpa API waktu pihak ketiga
