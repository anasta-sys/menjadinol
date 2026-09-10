-- Additive: tabel/kolom opsional untuk tulisan.
alter table public.content_folder_entries
add column if not exists table_data jsonb not null default '{}'::jsonb;

alter table public.content_folder_entries
drop constraint if exists content_folder_entries_table_data_check;

alter table public.content_folder_entries
add constraint content_folder_entries_table_data_check
check (
  jsonb_typeof(table_data) = 'object'
);

alter table public.content_folder_entries
drop constraint if exists content_folder_entries_content_check;

alter table public.content_folder_entries
add constraint content_folder_entries_content_check
check (
  char_length(trim(body)) >= 1
  or (
    jsonb_typeof(table_data) = 'object'
    and jsonb_array_length(coalesce(table_data->'headers','[]'::jsonb)) >= 1
  )
);
