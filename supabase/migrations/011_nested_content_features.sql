-- 011_nested_content_features.sql
-- Nested fitur untuk Menjadi Nol

begin;

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
      'ruang-jeda',
      'kontak'
    )
  );

alter table public.content_folders
  add column if not exists parent_id uuid
  references public.content_folders(id)
  on delete cascade;

create index if not exists idx_content_folders_parent_id
  on public.content_folders(parent_id);

create index if not exists idx_content_folders_section_parent
  on public.content_folders(section, parent_id);

create or replace function public.validate_content_folder_parent()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_section text;
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'Fitur tidak dapat menjadi induk dirinya sendiri.';
  end if;

  select section
  into parent_section
  from public.content_folders
  where id = new.parent_id;

  if parent_section is null then
    raise exception 'Fitur induk tidak ditemukan.';
  end if;

  if parent_section <> new.section then
    raise exception 'Fitur dan subfitur harus berada pada bagian yang sama.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_content_folder_parent
  on public.content_folders;

create trigger trg_validate_content_folder_parent
before insert or update of parent_id, section
on public.content_folders
for each row
execute function public.validate_content_folder_parent();

commit;