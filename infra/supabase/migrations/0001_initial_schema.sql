-- Lumio initial cloud metadata schema
-- PostgreSQL / Supabase

create extension if not exists "pgcrypto";

create table if not exists public.folders (
  folder_id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.books (
  book_id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  folder_id uuid references public.folders (folder_id) on delete set null,
  title text not null,
  author text,
  original_filename text not null,
  file_type text not null check (file_type in ('PDF', 'EPUB')),
  file_size_bytes bigint not null default 0,
  content_hash text not null,
  cover_ref text,
  drive_file_id text not null,
  drive_md5 text,
  sync_status text not null default 'SYNCED',
  cache_status text not null default 'NOT_CACHED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.progress (
  book_id uuid primary key references public.books (book_id) on delete cascade,
  user_id uuid not null,
  progress_type text not null check (progress_type in ('PDF', 'EPUB')),
  payload_json jsonb not null,
  version bigint not null,
  last_read_at timestamptz not null,
  device_id text,
  updated_at timestamptz not null default now()
);

create table if not exists public.sync_events (
  event_id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  device_id text not null,
  event_type text not null,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_folders_updated_at on public.folders;
create trigger trg_folders_updated_at
before update on public.folders
for each row
execute function public.set_updated_at();

drop trigger if exists trg_books_updated_at on public.books;
create trigger trg_books_updated_at
before update on public.books
for each row
execute function public.set_updated_at();

drop trigger if exists trg_progress_updated_at on public.progress;
create trigger trg_progress_updated_at
before update on public.progress
for each row
execute function public.set_updated_at();

create index if not exists idx_folders_user_updated_at
  on public.folders (user_id, updated_at desc);

create index if not exists idx_books_user_updated_at
  on public.books (user_id, updated_at desc);

create index if not exists idx_books_user_folder
  on public.books (user_id, folder_id);

create index if not exists idx_progress_user_last_read_at
  on public.progress (user_id, last_read_at desc);

create index if not exists idx_sync_events_user_created_at
  on public.sync_events (user_id, created_at desc);

alter table public.folders enable row level security;
alter table public.books enable row level security;
alter table public.progress enable row level security;
alter table public.sync_events enable row level security;

drop policy if exists "folders_select_own" on public.folders;
create policy "folders_select_own"
on public.folders
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "folders_insert_own" on public.folders;
create policy "folders_insert_own"
on public.folders
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "folders_update_own" on public.folders;
create policy "folders_update_own"
on public.folders
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "folders_delete_own" on public.folders;
create policy "folders_delete_own"
on public.folders
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "books_select_own" on public.books;
create policy "books_select_own"
on public.books
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "books_insert_own" on public.books;
create policy "books_insert_own"
on public.books
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "books_update_own" on public.books;
create policy "books_update_own"
on public.books
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "books_delete_own" on public.books;
create policy "books_delete_own"
on public.books
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "progress_select_own" on public.progress;
create policy "progress_select_own"
on public.progress
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "progress_insert_own" on public.progress;
create policy "progress_insert_own"
on public.progress
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "progress_update_own" on public.progress;
create policy "progress_update_own"
on public.progress
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "progress_delete_own" on public.progress;
create policy "progress_delete_own"
on public.progress
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "sync_events_select_own" on public.sync_events;
create policy "sync_events_select_own"
on public.sync_events
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "sync_events_insert_own" on public.sync_events;
create policy "sync_events_insert_own"
on public.sync_events
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
