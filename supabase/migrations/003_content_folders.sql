-- Folder tambahan untuk Tentang, Artikel, Layanan, dan Kontak.
-- Additive: tidak mengubah tabel/fungsi lama.

create table if not exists public.content_folders(
  id uuid primary key default gen_random_uuid(),
  section text not null check(section in ('tentang','artikel','layanan','kontak')),
  title text not null check(char_length(title) between 1 and 120),
  slug text not null check(slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null default '' check(char_length(description)<=500),
  is_published boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(section,slug)
);

create table if not exists public.content_folder_entries(
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.content_folders(id) on delete cascade,
  title text not null check(char_length(title) between 1 and 180),
  slug text not null check(slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  excerpt text not null default '' check(char_length(excerpt)<=420),
  body text not null check(char_length(body) between 1 and 50000),
  status text not null default 'draft' check(status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(folder_id,slug)
);

drop trigger if exists trg_content_folders_updated_at on public.content_folders;
create trigger trg_content_folders_updated_at before update on public.content_folders
for each row execute function public.set_updated_at();

drop trigger if exists trg_content_folder_entries_updated_at on public.content_folder_entries;
create trigger trg_content_folder_entries_updated_at before update on public.content_folder_entries
for each row execute function public.set_updated_at();

alter table public.content_folders enable row level security;
alter table public.content_folder_entries enable row level security;

revoke all on public.content_folders from anon,authenticated;
revoke all on public.content_folder_entries from anon,authenticated;

grant select on public.content_folders to anon,authenticated;
grant insert,update,delete on public.content_folders to authenticated;
grant select on public.content_folder_entries to anon,authenticated;
grant insert,update,delete on public.content_folder_entries to authenticated;

drop policy if exists "public read content folders" on public.content_folders;
create policy "public read content folders"
on public.content_folders for select to anon,authenticated
using(is_published=true);

drop policy if exists "admin manage content folders" on public.content_folders;
create policy "admin manage content folders"
on public.content_folders for all to authenticated
using(public.is_admin() and (select auth.jwt()->>'aal')='aal2')
with check(public.is_admin() and (select auth.jwt()->>'aal')='aal2');

drop policy if exists "public read folder entries" on public.content_folder_entries;
create policy "public read folder entries"
on public.content_folder_entries for select to anon,authenticated
using(status='published' and published_at is not null);

drop policy if exists "admin manage folder entries" on public.content_folder_entries;
create policy "admin manage folder entries"
on public.content_folder_entries for all to authenticated
using(public.is_admin() and (select auth.jwt()->>'aal')='aal2')
with check(public.is_admin() and (select auth.jwt()->>'aal')='aal2');
