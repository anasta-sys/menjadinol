-- KEMBALI KE NOL
-- Permohonan akses Penulis / Admin
-- Jalankan SEKALI di Supabase SQL Editor.

create table if not exists public.writer_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  display_name text not null,
  requested_access text not null
    check (requested_access in ('writer', 'admin')),
  reason text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid null references auth.users(id) on delete set null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists writer_applications_user_id_key
  on public.writer_applications(user_id);

create unique index if not exists writer_applications_email_lower_key
  on public.writer_applications(lower(email));

alter table public.writer_applications enable row level security;

-- Tidak ada policy publik.
-- Registrasi dan review dilakukan lewat server menggunakan service role.

comment on table public.writer_applications is
  'Permohonan akses Penulis/Admin. Superadmin tidak dapat diminta dari form publik.';
