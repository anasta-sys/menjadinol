-- Additive update untuk folder semua bagian Jalan Pulang.
-- Tidak menghapus tabel/data lama.

alter table public.content_folders
  drop constraint if exists content_folders_section_check;

alter table public.content_folders
  add constraint content_folders_section_check
  check (
    section in (
      'tentang',
      'artikel',
      'layanan',
      'ruang-belajar',
      'sinopsis',
      'kontak'
    )
  );
