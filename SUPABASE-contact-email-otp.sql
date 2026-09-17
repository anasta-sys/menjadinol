create table if not exists public.contact_email_otps (
 id uuid primary key default gen_random_uuid(), email text not null, otp_hash text not null,
 expires_at timestamptz not null, attempts integer not null default 0 check(attempts between 0 and 5),
 name text not null, subject text not null, message text not null, created_at timestamptz not null default now()
);
create index if not exists contact_email_otps_email_created_idx on public.contact_email_otps(email,created_at desc);
alter table public.contact_email_otps enable row level security;
revoke all on table public.contact_email_otps from anon, authenticated;
grant usage on schema public to service_role;
grant select,insert,update,delete on table public.contact_email_otps to service_role;
grant insert,select,update,delete on table public.contact_messages to service_role;
