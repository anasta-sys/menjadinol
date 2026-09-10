-- ============================================================
-- Jalan Pulang: editable intro halaman utama
-- Tentang | Perjalanan | Ruang Belajar | Sinopsis | Artikel | Kontak
-- ============================================================

create table if not exists public.page_content (
  page_key text primary key,
  eyebrow text not null default '',
  title text not null,
  description text not null default '',
  updated_at timestamptz not null default now(),

  constraint page_content_page_key_check
    check (
      page_key in (
        'tentang',
        'perjalanan',
        'ruang-belajar',
        'sinopsis',
        'artikel',
        'kontak'
      )
    ),

  constraint page_content_eyebrow_check
    check (char_length(eyebrow) <= 60),

  constraint page_content_title_check
    check (
      char_length(title) >= 1
      and char_length(title) <= 240
    ),

  constraint page_content_description_check
    check (char_length(description) <= 2000)
);

create or replace function public.set_page_content_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_page_content_updated_at
on public.page_content;

create trigger trg_page_content_updated_at
before update on public.page_content
for each row
execute function public.set_page_content_updated_at();

alter table public.page_content enable row level security;

drop policy if exists "page_content_public_read"
on public.page_content;

create policy "page_content_public_read"
on public.page_content
for select
to anon, authenticated
using (true);

drop policy if exists "page_content_admin_insert"
on public.page_content;

create policy "page_content_admin_insert"
on public.page_content
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
  )
);

drop policy if exists "page_content_admin_update"
on public.page_content;

create policy "page_content_admin_update"
on public.page_content
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
  )
);

-- Nilai awal sesuai UI yang sekarang.
insert into public.page_content (
  page_key,
  eyebrow,
  title,
  description
)
values
  (
    'tentang',
    'tentang',
    'Setiap orang punya jalannya sendiri.',
    'Jalan Pulang adalah ruang refleksi untuk memahami rasa, kesadaran, penerimaan, makna, dan perjalanan hidup.'
  ),
  (
    'perjalanan',
    'perjalanan',
    'Setiap perjalanan membawa kita lebih dekat pada kesadaran.',
    'Ruang untuk menyusuri pengalaman, refleksi, dan proses kehidupan. Bukan tentang seberapa jauh kita berjalan, tetapi tentang apa yang kita sadari sepanjang perjalanan.'
  ),
  (
    'ruang-belajar',
    'ruang belajar',
    'Belajar melalui perjalanan.',
    'Kumpulan kajian, refleksi, dan pembelajaran yang dapat dibuka satu per satu sesuai perjalanan yang sedang ingin dipahami.'
  ),
  (
    'sinopsis',
    'sinopsis',
    'Cerita yang singgah, makna yang dibawa pulang.',
    'Catatan tentang buku, film, dokumenter, dan tontonan yang meninggalkan makna, dilihat melalui perjalanan Jalan Pulang.'
  ),
  (
    'artikel',
    'artikel',
    'Catatan sepanjang jalan.',
    ''
  ),
  (
    'kontak',
    'kontak',
    'Terima kasih sudah singgah.',
    'Untuk keamanan dan privasi, website ini tidak menggunakan form publik atau pelacak pihak ketiga.'
  )
on conflict (page_key) do nothing;
