# Menjadi Nol v2 — Final Merge

Base project: source aktual `menjadinol` yang diunggah 10 Sep 2026.

Dipertahankan dari project asli:
- reader login/register/forgot/reset + OTP
- writer login/register/dashboard
- admin login/dashboard + MFA/AAL2
- superadmin login/dashboard + activation/recovery
- Folder Manager / section folders
- content editor, table data, rich text
- analytics dashboard
- secure material attachments + signed URL flow
- Supabase migrations lama dan writer permission SQL
- seluruh API routes dan proxy/auth guard yang sudah ada

Perubahan branding:
- Homepage diganti menjadi UI `Menjadi Nol`
- simbol `/public/menjadi-nol-symbol.png`
- tagline `Perjalanan pulang dalam diri`
- CSS homepage memakai namespace `mn-*` agar tidak menimpa CSS dashboard/login lama.

Keamanan:
- `.env.local` sengaja TIDAK dimasukkan ke paket final.
- `.next` dan `node_modules` sengaja TIDAK dimasukkan; generate ulang lokal.

Instalasi lokal:
1. Backup `C:\menjadinol-v2`.
2. Extract isi ZIP final ke `C:\menjadinol-v2`.
3. Pertahankan/restore `.env.local` milik project lama.
4. Jalankan `npm install`.
5. Jalankan `npm run build`.
6. Jika sukses, `npm run dev`.

Jangan menjalankan ulang migration lama secara membabi-buta pada database produksi. Terapkan hanya migration yang belum pernah dijalankan dan backup Supabase terlebih dahulu.
