-- Additive only: tidak menghapus data/policy lama.
alter table public.admin_users
  add column if not exists role text,
  add column if not exists display_name text;

update public.admin_users set role = 'super_admin' where role is null;

alter table public.admin_users alter column role set default 'author';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='admin_users_role_check'
      and conrelid='public.admin_users'::regclass
  ) then
    alter table public.admin_users
      add constraint admin_users_role_check
      check (role in ('super_admin','author'));
  end if;
end $$;

alter table public.posts
  add column if not exists author_id uuid references auth.users(id) on delete set null,
  add column if not exists author_name text;

alter table public.content_folder_entries
  add column if not exists author_id uuid references auth.users(id) on delete set null,
  add column if not exists author_name text;

create index if not exists posts_author_id_idx on public.posts(author_id);
create index if not exists content_folder_entries_author_id_idx
  on public.content_folder_entries(author_id);
