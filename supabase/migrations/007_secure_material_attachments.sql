-- Secure PDF/JPG/PNG attachments for folder entries.
-- Files live in a PRIVATE Supabase Storage bucket and are served publicly
-- only through short-lived signed URLs generated on the server.

alter table public.content_folder_entries
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime text,
  add column if not exists attachment_size bigint;

alter table public.content_folder_entries
  drop constraint if exists content_folder_entries_attachment_mime_check;

alter table public.content_folder_entries
  add constraint content_folder_entries_attachment_mime_check
  check (
    attachment_mime is null
    or attachment_mime in ('application/pdf','image/jpeg','image/png')
  );

alter table public.content_folder_entries
  drop constraint if exists content_folder_entries_attachment_size_check;

alter table public.content_folder_entries
  add constraint content_folder_entries_attachment_size_check
  check (
    attachment_size is null
    or (attachment_size > 0 and attachment_size <= 12582912)
  );

-- Replace the older content check so an entry may contain text, a table,
-- or a secure attachment.
alter table public.content_folder_entries
  drop constraint if exists content_folder_entries_content_check;

alter table public.content_folder_entries
  add constraint content_folder_entries_content_check
  check (
    char_length(trim(coalesce(body,''))) >= 1
    or (
      jsonb_typeof(table_data) = 'object'
      and jsonb_array_length(coalesce(table_data->'headers','[]'::jsonb)) >= 1
    )
    or attachment_path is not null
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'learning-materials',
  'learning-materials',
  false,
  12582912,
  array['application/pdf','image/jpeg','image/png']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No public SELECT policy is created. The bucket stays private.
-- Only authenticated AAL2 admins may upload/update/delete objects.
drop policy if exists "aal2 admins upload learning materials" on storage.objects;
create policy "aal2 admins upload learning materials"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'learning-materials'
  and public.is_admin()
  and (select auth.jwt()->>'aal') = 'aal2'
);

drop policy if exists "aal2 admins update learning materials" on storage.objects;
create policy "aal2 admins update learning materials"
on storage.objects for update to authenticated
using (
  bucket_id = 'learning-materials'
  and public.is_admin()
  and (select auth.jwt()->>'aal') = 'aal2'
)
with check (
  bucket_id = 'learning-materials'
  and public.is_admin()
  and (select auth.jwt()->>'aal') = 'aal2'
);

drop policy if exists "aal2 admins delete learning materials" on storage.objects;
create policy "aal2 admins delete learning materials"
on storage.objects for delete to authenticated
using (
  bucket_id = 'learning-materials'
  and public.is_admin()
  and (select auth.jwt()->>'aal') = 'aal2'
);
