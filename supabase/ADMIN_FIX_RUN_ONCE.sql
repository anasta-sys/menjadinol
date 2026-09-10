-- JALANKAN SEKALI DI SUPABASE SQL EDITOR.
-- Ini memperbaiki kasus: password benar -> MFA benar -> /admin -> kembali ke /login
-- apabila akun Auth sudah belum dimasukkan ke whitelist public.admin_users.
--
-- 1) Ganti EMAIL_ADMIN_DI_SINI dengan email akun yang dipakai login.
-- 2) Run.
-- 3) Query terakhir harus menghasilkan satu baris.

insert into public.admin_users(user_id)
select id
from auth.users
where email = 'EMAIL_ADMIN_DI_SINI'
on conflict(user_id) do nothing;

select au.id, au.email, ad.user_id as admin_whitelist
from auth.users au
left join public.admin_users ad on ad.user_id = au.id
where au.email = 'EMAIL_ADMIN_DI_SINI';
