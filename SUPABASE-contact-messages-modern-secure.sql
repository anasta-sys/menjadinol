-- Aman dijalankan ulang
alter table public.contact_messages
  add column if not exists is_read boolean not null default false;

-- Jangan GRANT SELECT/UPDATE/DELETE ke authenticated.
-- Modul ini membaca/mengubah data via service role HANYA setelah
-- login + MFA AAL2 + admin_users.role = 'superadmin'.
