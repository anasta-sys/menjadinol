alter table public.page_content
add column if not exists created_at timestamptz not null default now(),
add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_page_content_updated_at()
returns trigger
language plpgsql
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