-- Ensure table exists
create extension if not exists "pgcrypto";

create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 40),
  rating     int  not null check (rating between 1 and 5),
  comment    text not null check (char_length(comment) <= 500),
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

-- Reset policies
drop policy if exists "Public read"   on public.reviews;
drop policy if exists "Public insert" on public.reviews;

-- Allow anyone to READ
create policy "Public read"
on public.reviews
for select
using (true);

-- Allow anyone to INSERT
create policy "Public insert"
on public.reviews
for insert
with check (true);
