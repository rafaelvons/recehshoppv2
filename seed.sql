-- ============================================================
-- RecehShopp — Supabase Schema
-- Jalankan ini di Supabase SQL Editor (satu kali)
-- ============================================================

-- 1. Profiles (synced with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Profiles: anyone authenticated can read"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Profiles: users can update own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

-- Trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Barang
create table if not exists public.barang (
  id bigint generated always as identity primary key,
  id_item bigint unique,
  nama_game text not null,
  nama_tipe text default '',
  server_name text,
  grup_name text,
  nama_item text not null,
  stok integer default 0,
  metode_pengiriman integer default 0,
  min_pesanan integer default 1,
  harga_asli integer not null,
  harga_jual integer not null,
  updated_at timestamptz default now()
);

alter table public.barang enable row level security;

create policy "Barang: allow read"
  on public.barang for select
  to anon, authenticated
  using (true);

create policy "Barang: allow update"
  on public.barang for update
  to anon, authenticated
  using (true);

create policy "Barang: allow insert"
  on public.barang for insert
  to anon, authenticated
  with check (true);

create index if not exists idx_barang_game on public.barang(nama_game);
create index if not exists idx_barang_item on public.barang(id_item);

-- 3. Log Kerja
create table if not exists public.log_kerja (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  barang_id bigint not null references public.barang(id) on delete cascade,
  deskripsi text not null,
  qty integer not null default 1,
  harga_satuan integer not null,
  total integer not null,
  created_at timestamptz default now()
);

alter table public.log_kerja enable row level security;

create policy "Log: authenticated can read all"
  on public.log_kerja for select
  to authenticated
  using (true);

create policy "Log: authenticated can insert own"
  on public.log_kerja for insert
  to anon, authenticated
  with check (true);

create policy "Log: users can delete own"
  on public.log_kerja for delete
  to authenticated
  using (user_id = auth.uid());

create index if not exists idx_log_user on public.log_kerja(user_id);
create index if not exists idx_log_tanggal on public.log_kerja(created_at);
