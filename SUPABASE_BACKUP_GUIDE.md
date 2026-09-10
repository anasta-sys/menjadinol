# Backup Supabase Jalan Pulang

Konten utama Jalan Pulang berada di database Supabase, bukan di laptop/Vercel.

Sebelum perubahan besar atau secara berkala:
1. Buka Supabase Dashboard project Jalan Pulang.
2. Gunakan fitur backup/export yang tersedia pada plan/project kamu, atau gunakan Supabase CLI/`pg_dump` untuk backup database penuh.
3. Untuk backup konten sederhana, export CSV dari Table Editor untuk:
   - `content_folders`
   - `content_folder_entries`
   - `page_content`
   - `admin_users` (struktur/ID saja; jangan membagikan data sensitif)
4. Simpan backup di lokasi privat, jangan di repository GitHub publik.

Rekomendasi: lakukan backup sebelum migration, perubahan RLS, atau penghapusan konten dalam jumlah besar.
