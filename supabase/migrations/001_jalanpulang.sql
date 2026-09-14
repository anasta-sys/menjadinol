create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check(char_length(title) between 1 and 180),
  slug text not null unique check(slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  excerpt text not null default '' check(char_length(excerpt) <= 420),
  body text not null check(char_length(body) between 1 and 50000),
  category text not null default 'Refleksi' check(char_length(category) <= 40),
  status text not null default 'draft' check(status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null check(action in ('INSERT','UPDATE','DELETE')),
  post_id uuid,
  occurred_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1
    from public.admin_users
    where user_id=(select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  new.updated_at=now();
  return new;
end;
$$;

drop trigger if exists trg_posts_updated_at on public.posts;
create trigger trg_posts_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

create or replace function public.audit_post_change()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  insert into public.audit_logs(actor_id,action,post_id)
  values((select auth.uid()),TG_OP,coalesce(new.id,old.id));
  return coalesce(new,old);
end;
$$;

revoke all on function public.audit_post_change() from public;

drop trigger if exists trg_posts_audit on public.posts;
create trigger trg_posts_audit
after insert or update or delete on public.posts
for each row execute function public.audit_post_change();

alter table public.admin_users enable row level security;
alter table public.posts enable row level security;
alter table public.audit_logs enable row level security;

revoke all on public.posts from anon, authenticated;
revoke all on public.admin_users from anon, authenticated;
revoke all on public.audit_logs from anon, authenticated;

grant select on public.posts to anon;
grant select,insert,update,delete on public.posts to authenticated;
grant select on public.admin_users to authenticated;
grant select on public.audit_logs to authenticated;

create policy "public read published"
on public.posts
for select
to anon
using(status='published' and published_at is not null);

create policy "admin read"
on public.posts
for select
to authenticated
using(public.is_admin());

create policy "admin insert"
on public.posts
for insert
to authenticated
with check(public.is_admin());

create policy "admin update"
on public.posts
for update
to authenticated
using(public.is_admin())
with check(public.is_admin());

create policy "admin delete"
on public.posts
for delete
to authenticated
using(public.is_admin());

create policy "mfa required"
on public.posts
as restrictive
for all
to authenticated
using((select auth.jwt()->>'aal')='aal2')
with check((select auth.jwt()->>'aal')='aal2');

create policy "self admin membership"
on public.admin_users
for select
to authenticated
using(user_id=(select auth.uid()));

create policy "admin read audit"
on public.audit_logs
for select
to authenticated
using(public.is_admin() and (select auth.jwt()->>'aal')='aal2');

insert into public.posts(
  title,slug,excerpt,body,category,status,published_at
)
values(
  'Menjadi nol bukan berarti menjadi kosong',
  'menjadi-nol-bukan-berarti-menjadi-kosong',
  'Menjadi nol adalah memberi diri kesempatan melihat kehidupan tanpa terlalu banyak kebisingan.',
  'Menjadi nol bukan menghapus siapa diri kita. Ia adalah memberi ruang untuk melihat lebih jernih.

Rasa boleh hadir tanpa menjadi identitas. Masa lalu boleh menjadi pelajaran tanpa menjadi penjara.

Kita tidak perlu selalu memiliki jawaban. Kadang cukup hadir, bernapas, dan memilih langkah berikutnya setelah batin lebih tenang.',
  'Makna',
  'published',
  now()
)
on conflict(slug) do nothing;

-- Setelah membuat admin manual:
-- insert into public.admin_users(user_id) values ('UUID-ADMIN');


-- ===== RUANG BELAJAR =====
create table if not exists public.learning_collections(
  id uuid primary key default gen_random_uuid(),
  title text not null check(char_length(title) between 1 and 120),
  slug text not null unique check(slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null default '' check(char_length(description)<=500),
  is_published boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_articles(
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.learning_collections(id) on delete cascade,
  title text not null check(char_length(title) between 1 and 180),
  slug text not null check(slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  excerpt text not null default '' check(char_length(excerpt)<=420),
  body text not null default '' check(char_length(body)<=50000),
  status text not null default 'draft' check(status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(collection_id,slug)
);

drop trigger if exists trg_learning_collections_updated_at on public.learning_collections;
create trigger trg_learning_collections_updated_at before update on public.learning_collections
for each row execute function public.set_updated_at();

drop trigger if exists trg_learning_articles_updated_at on public.learning_articles;
create trigger trg_learning_articles_updated_at before update on public.learning_articles
for each row execute function public.set_updated_at();

alter table public.learning_collections enable row level security;
alter table public.learning_articles enable row level security;

revoke all on public.learning_collections from anon,authenticated;
revoke all on public.learning_articles from anon,authenticated;

grant select on public.learning_collections to anon,authenticated;
grant insert,update,delete on public.learning_collections to authenticated;
grant select on public.learning_articles to anon,authenticated;
grant insert,update,delete on public.learning_articles to authenticated;

create policy "public read published learning collections"
on public.learning_collections for select to anon,authenticated
using(is_published=true);

create policy "admin manage learning collections"
on public.learning_collections for all to authenticated
using(public.is_admin() and (select auth.jwt()->>'aal')='aal2')
with check(public.is_admin() and (select auth.jwt()->>'aal')='aal2');

create policy "public read published learning articles"
on public.learning_articles for select to anon,authenticated
using(status='published' and published_at is not null);

create policy "admin manage learning articles"
on public.learning_articles for all to authenticated
using(public.is_admin() and (select auth.jwt()->>'aal')='aal2')
with check(public.is_admin() and (select auth.jwt()->>'aal')='aal2');

insert into public.learning_collections(title,slug,description,sort_order) values
('Abu Marlo','abu-marlo','Catatan kajian, tauhid, kesadaran diri, dan perjalanan spiritual.',10),
('Wayan Mustika','wayan-mustika','Catatan tentang tujuan kelahiran, perjalanan jiwa, dan pemaknaan kehidupan.',20),
('Syukur Sejati','syukur-sejati','Ruang belajar tentang syukur, penerimaan, rasa cukup, dan kejernihan.',30),
('3 Fakir','3-fakir','Kumpulan catatan dan pembelajaran dari 3 Fakir.',40),
('Rest Are 89','rest-are-89','Catatan refleksi dan pembelajaran dari Rest Are 89.',50),
('Mindfulness','mindfulness','Belajar hadir penuh melalui kesadaran tubuh, pikiran, dan rasa.',60),
('Spiritual Journey','spiritual-journey','Catatan perjalanan kembali ke diri dan menemukan makna.',70),
('Kajian Al-Qur''an','kajian-al-quran','Catatan ayat, tauhid, tafsir ringkas, dan pelajaran kehidupan.',80)
on conflict(slug) do nothing;
