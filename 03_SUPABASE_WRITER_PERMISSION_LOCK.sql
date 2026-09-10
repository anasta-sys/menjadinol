-- KEMBALI KE NOL
-- FINAL WRITER PERMISSION LOCK
-- Jalankan SEKALI di Supabase SQL Editor SETELAH replace file aplikasi.
--
-- Tujuan:
-- writer     = tulis/edit tulisan SENDIRI, draft/review saja
-- admin      = kelola folder + review/publish, tanpa permanent delete
-- superadmin = semua + permanent delete
--
-- Penting: public.is_admin() diubah agar role writer TIDAK lagi dianggap admin.

begin;

-- 1) Pastikan fungsi "admin" hanya admin/superadmin.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = (select auth.uid())
      and au.role in ('admin','superadmin')
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Helper role saat ini.
create or replace function public.current_admin_role()
returns text
language sql
stable
security definer
set search_path=''
as $$
  select au.role
  from public.admin_users au
  where au.user_id = (select auth.uid())
  limit 1;
$$;

revoke all on function public.current_admin_role() from public;
grant execute on function public.current_admin_role() to authenticated;

-- 2) CONTENT FOLDERS
alter table public.content_folders enable row level security;

drop policy if exists "admin manage content folders" on public.content_folders;
drop policy if exists "admin insert content folders" on public.content_folders;
drop policy if exists "admin update content folders" on public.content_folders;
drop policy if exists "superadmin delete content folders" on public.content_folders;

create policy "admin insert content folders"
on public.content_folders
for insert
to authenticated
with check (
  public.current_admin_role() in ('admin','superadmin')
  and (select auth.jwt()->>'aal') = 'aal2'
);

create policy "admin update content folders"
on public.content_folders
for update
to authenticated
using (
  public.current_admin_role() in ('admin','superadmin')
  and (select auth.jwt()->>'aal') = 'aal2'
)
with check (
  public.current_admin_role() in ('admin','superadmin')
  and (select auth.jwt()->>'aal') = 'aal2'
);

create policy "superadmin delete content folders"
on public.content_folders
for delete
to authenticated
using (
  public.current_admin_role() = 'superadmin'
  and (select auth.jwt()->>'aal') = 'aal2'
);

-- 3) CONTENT ENTRIES
alter table public.content_folder_entries enable row level security;

drop policy if exists "admin manage folder entries" on public.content_folder_entries;
drop policy if exists "writer insert own entries" on public.content_folder_entries;
drop policy if exists "writer update own entries" on public.content_folder_entries;
drop policy if exists "admin insert entries" on public.content_folder_entries;
drop policy if exists "admin update entries" on public.content_folder_entries;
drop policy if exists "superadmin delete entries" on public.content_folder_entries;
drop policy if exists "staff read folder entries" on public.content_folder_entries;

-- Writer melihat tulisan sendiri (termasuk draft/review).
-- Admin/Superadmin melihat semua untuk review.
create policy "staff read folder entries"
on public.content_folder_entries
for select
to authenticated
using (
  (
    public.current_admin_role() = 'writer'
    and author_id = (select auth.uid())
    and (select auth.jwt()->>'aal') = 'aal2'
  )
  or
  (
    public.current_admin_role() in ('admin','superadmin')
    and (select auth.jwt()->>'aal') = 'aal2'
  )
);

create policy "writer insert own entries"
on public.content_folder_entries
for insert
to authenticated
with check (
  public.current_admin_role() = 'writer'
  and (select auth.jwt()->>'aal') = 'aal2'
  and author_id = (select auth.uid())
  and updated_by = (select auth.uid())
  and status in ('draft','review')
  and published_at is null
);

create policy "writer update own entries"
on public.content_folder_entries
for update
to authenticated
using (
  public.current_admin_role() = 'writer'
  and (select auth.jwt()->>'aal') = 'aal2'
  and author_id = (select auth.uid())
)
with check (
  public.current_admin_role() = 'writer'
  and (select auth.jwt()->>'aal') = 'aal2'
  and author_id = (select auth.uid())
  and updated_by = (select auth.uid())
  and status in ('draft','review')
  and published_at is null
);

create policy "admin insert entries"
on public.content_folder_entries
for insert
to authenticated
with check (
  public.current_admin_role() in ('admin','superadmin')
  and (select auth.jwt()->>'aal') = 'aal2'
);

create policy "admin update entries"
on public.content_folder_entries
for update
to authenticated
using (
  public.current_admin_role() in ('admin','superadmin')
  and (select auth.jwt()->>'aal') = 'aal2'
)
with check (
  public.current_admin_role() in ('admin','superadmin')
  and (select auth.jwt()->>'aal') = 'aal2'
);

create policy "superadmin delete entries"
on public.content_folder_entries
for delete
to authenticated
using (
  public.current_admin_role() = 'superadmin'
  and (select auth.jwt()->>'aal') = 'aal2'
);

-- 4) STORAGE learning-materials
-- Writer boleh upload, tetapi update/delete hanya object miliknya sendiri.
drop policy if exists "aal2 admins upload learning materials" on storage.objects;
drop policy if exists "aal2 admins update learning materials" on storage.objects;
drop policy if exists "aal2 admins delete learning materials" on storage.objects;

create policy "aal2 staff upload learning materials"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'learning-materials'
  and public.current_admin_role() in ('writer','admin','superadmin')
  and (select auth.jwt()->>'aal') = 'aal2'
);

create policy "aal2 staff update learning materials"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'learning-materials'
  and (select auth.jwt()->>'aal') = 'aal2'
  and (
    public.current_admin_role() in ('admin','superadmin')
    or (
      public.current_admin_role() = 'writer'
      and owner_id = (select auth.uid())
    )
  )
)
with check (
  bucket_id = 'learning-materials'
  and (select auth.jwt()->>'aal') = 'aal2'
  and (
    public.current_admin_role() in ('admin','superadmin')
    or (
      public.current_admin_role() = 'writer'
      and owner_id = (select auth.uid())
    )
  )
);

create policy "aal2 staff delete learning materials"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'learning-materials'
  and (select auth.jwt()->>'aal') = 'aal2'
  and (
    public.current_admin_role() = 'superadmin'
    or (
      public.current_admin_role() = 'writer'
      and owner_id = (select auth.uid())
    )
  )
);

commit;

-- Verifikasi saja:
select user_id, role, display_name
from public.admin_users
order by role, display_name;
