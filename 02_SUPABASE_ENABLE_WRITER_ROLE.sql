-- KEMBALI KE NOL
-- Tambahkan role "writer" TANPA mengubah data role yang sudah ada.
-- Jalankan SEKALI di Supabase SQL Editor.

do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.admin_users'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format(
      'alter table public.admin_users drop constraint %I',
      c.conname
    );
  end loop;
end $$;

alter table public.admin_users
  add constraint admin_users_role_check
  check (role in ('writer', 'admin', 'superadmin'));

-- Hanya verifikasi. Tidak mengubah baris apa pun.
select role, count(*) as jumlah
from public.admin_users
group by role
order by role;
