-- Tambahan kolom status baca untuk inbox Superadmin
alter table public.contact_messages
  add column if not exists is_read boolean not null default false;

-- IMPORTANT:
-- SELECT / UPDATE / DELETE harus dibatasi mengikuti mekanisme Superadmin
-- yang SUDAH digunakan project Menjadi Nol.
--
-- Jangan membuat policy "authenticated can read/update/delete" karena itu
-- akan membuat semua user login dapat membaca pesan kontak.
--
-- Setelah pola role Superadmin project dikonfirmasi, tambahkan policy khusus
-- role tersebut atau gunakan server-side service client setelah verifikasi
-- Superadmin.
