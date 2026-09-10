create extension if not exists pgcrypto;

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

alter table public.learning_collections enable row level security;
alter table public.learning_articles enable row level security;
revoke all on public.learning_collections from anon,authenticated;
revoke all on public.learning_articles from anon,authenticated;
grant select on public.learning_collections to anon,authenticated;
grant insert,update,delete on public.learning_collections to authenticated;
grant select on public.learning_articles to anon,authenticated;
grant insert,update,delete on public.learning_articles to authenticated;

drop policy if exists "public read published learning collections" on public.learning_collections;
create policy "public read published learning collections" on public.learning_collections for select to anon,authenticated using(is_published=true);
drop policy if exists "admin manage learning collections" on public.learning_collections;
create policy "admin manage learning collections" on public.learning_collections for all to authenticated using(public.is_admin() and (select auth.jwt()->>'aal')='aal2') with check(public.is_admin() and (select auth.jwt()->>'aal')='aal2');
drop policy if exists "public read published learning articles" on public.learning_articles;
create policy "public read published learning articles" on public.learning_articles for select to anon,authenticated using(status='published' and published_at is not null);
drop policy if exists "admin manage learning articles" on public.learning_articles;
create policy "admin manage learning articles" on public.learning_articles for all to authenticated using(public.is_admin() and (select auth.jwt()->>'aal')='aal2') with check(public.is_admin() and (select auth.jwt()->>'aal')='aal2');

insert into public.learning_collections(title,slug,description,sort_order) values
('Abu Marlo','abu-marlo','Catatan kajian, tauhid, kesadaran diri, dan perjalanan spiritual.',10),
('Wayan Mustika','wayan-mustika','Catatan tentang tujuan kelahiran, perjalanan jiwa, dan pemaknaan kehidupan.',20),
('Syukur Sejati','syukur-sejati','Ruang belajar tentang syukur, penerimaan, rasa cukup, dan kejernihan.',30),
('3 Fakir','3-fakir','Kumpulan catatan dan pembelajaran dari 3 Fakir.',40),
('Rest Are 89','rest-are-89','Catatan refleksi dan pembelajaran dari Rest Are 89.',50),
('Mindfulness','mindfulness','Belajar hadir penuh melalui kesadaran tubuh, pikiran, dan rasa.',60),
('Spiritual Journey','spiritual-journey','Catatan perjalanan kembali ke diri dan menemukan makna.',70),
('Kajian Al-Qur''an','kajian-al-quran','Catatan ayat, tauhid, tafsir ringkas, dan pelajaran kehidupan.',80),
('Tafsir bersama Kang IIP','tafsir-bersama-kang-iip','Catatan tafsir, pembacaan ayat, dan refleksi kehidupan bersama Kang IIP.',90)
on conflict(slug) do nothing;
