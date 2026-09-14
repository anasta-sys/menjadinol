create table if not exists public.site_pages(
  slug text primary key check(slug in ('tentang','layanan','kontak')),
  eyebrow text not null default '',
  title text not null check(char_length(title) between 1 and 180),
  lead text not null default '' check(char_length(lead) <= 800),
  body text not null check(char_length(body) between 1 and 20000),
  updated_at timestamptz not null default now()
);

alter table public.site_pages enable row level security;

revoke all on public.site_pages from anon,authenticated;
grant select on public.site_pages to anon;
grant select,update on public.site_pages to authenticated;

create policy "public read site pages"
on public.site_pages
for select
to anon
using(true);

create policy "admin read site pages"
on public.site_pages
for select
to authenticated
using(public.is_admin());

create policy "admin update site pages"
on public.site_pages
for update
to authenticated
using(public.is_admin())
with check(public.is_admin());

create policy "mfa required site pages"
on public.site_pages
as restrictive
for all
to authenticated
using((select auth.jwt()->>'aal')='aal2')
with check((select auth.jwt()->>'aal')='aal2');

create or replace function public.touch_site_page()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_site_pages_updated_at on public.site_pages;
create trigger trg_site_pages_updated_at
before update on public.site_pages
for each row execute function public.touch_site_page();

insert into public.site_pages(slug,eyebrow,title,lead,body)
values
(
  'tentang',
  'tentang jalan pulang',
  'Setiap orang punya jalannya sendiri.',
  'Jalan Pulang adalah ruang refleksi untuk memahami rasa, perjalanan hidup, penerimaan, makna, dan kesadaran.',
  '“Menjadi nol” bukan berarti kehilangan diri. Ia adalah ajakan untuk berhenti sejenak dari kebisingan agar kita dapat melihat kehidupan dengan lebih jernih.'
),
(
  'layanan',
  'layanan',
  'Ruang untuk memulai perjalanan.',
  'Pilih ruang yang paling sesuai dengan apa yang sedang dibutuhkan hari ini.',
  'Pulang ke Diri — refleksi dan pengenalan diri.

Tumbuh Sadar — mindfulness dan kesadaran sehari-hari.

Temukan Arah — makna, nilai, dan arah hidup.

Hidup Utuh — penerimaan dan integrasi diri.'
),
(
  'kontak',
  'kontak',
  'Terima kasih sudah singgah.',
  'Jalan Pulang menjaga ruang ini tetap sederhana dan privacy-first.',
  'Untuk keamanan, jangan menampilkan email login admin di halaman publik. Gunakan alamat email kontak yang terpisah apabila nanti ingin menambahkan kontak publik.'
)
on conflict(slug) do nothing;
