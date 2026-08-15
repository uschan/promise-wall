-- WishCollective — initial schema (Auth + multi-emoji reactions + moderation)
-- Versioned migration; runs via `supabase db push` or `supabase start`.

begin;

-- 1) Promises (content; owned by a user) ----------------------
create table if not exists public.promises (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.promises
  add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.promises
  add column if not exists created_at timestamptz not null default now();

-- backfill created_at from the promise's original createdAt (data blob)
update public.promises
set created_at = to_timestamp((data->>'createdAt')::bigint / 1000.0)
where data ? 'createdAt' and (data->>'createdAt') ~ '^[0-9]+$';

-- 2) Profiles (display name per user) -------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  created_at timestamptz not null default now()
);
alter table public.profiles
  add column if not exists is_admin boolean not null default false;
alter table public.profiles
  add column if not exists banned boolean not null default false;

-- helpers -----------------------------------------------------
create or replace function public.is_banned()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select banned from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.promise_count_today()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.promises
  where user_id = auth.uid()
    and created_at > now() - interval '1 day';
$$;

-- settings table is referenced by promise_limit(); create it before the function
create table if not exists public.settings (
  key text primary key,
  value jsonb not null
);

create or replace function public.promise_limit()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select (value::text)::int from public.settings where key = 'promise_rate_limit'), 1);
$$;

-- 3) Reactions / saves / reflections / reports ----------------
create table if not exists public.reactions (
  promise_id text not null references public.promises(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  created_at timestamptz not null default now(),
  primary key (promise_id, user_id, type)
);

create table if not exists public.saves (
  promise_id text not null references public.promises(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (promise_id, user_id)
);

create table if not exists public.reflections (
  id uuid primary key default gen_random_uuid(),
  promise_id text not null references public.promises(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author text not null default '',
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  promise_id text not null,
  text text not null default '',
  author text not null default '',
  created_at timestamptz not null default now()
);
alter table public.reports
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- migrate legacy single-heart `supports` table into `reactions`
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'supports') then
    insert into public.reactions (promise_id, user_id, type, created_at)
      select promise_id, user_id, 'heart', created_at from public.supports
      on conflict (promise_id, user_id, type) do nothing;
    drop table public.supports;
  end if;
end $$;

drop table if exists public.profile;

-- 4) Row Level Security ---------------------------------------
alter table public.promises enable row level security;
alter table public.profiles enable row level security;
alter table public.reactions enable row level security;
alter table public.saves enable row level security;
alter table public.reflections enable row level security;
alter table public.reports enable row level security;

drop policy if exists "pw_read_promises" on public.promises;
create policy "pw_read_promises" on public.promises for select using (true);
drop policy if exists "pw_insert_promises" on public.promises;
create policy "pw_insert_promises" on public.promises for insert with check (
  auth.uid() = user_id
  and not public.is_banned()
  and (public.is_admin() or public.promise_count_today() < public.promise_limit())
);
drop policy if exists "pw_update_promises" on public.promises;
create policy "pw_update_promises" on public.promises for update using (auth.uid() = user_id and not public.is_banned()) with check (auth.uid() = user_id and not public.is_banned());
drop policy if exists "pw_delete_promises" on public.promises;
create policy "pw_delete_promises" on public.promises for delete using (auth.uid() = user_id and not public.is_banned());
drop policy if exists "pw_delete_promises_admin" on public.promises;
create policy "pw_delete_promises_admin" on public.promises for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin)
);

drop policy if exists "pw_read_profiles" on public.profiles;
create policy "pw_read_profiles" on public.profiles for select using (true);
drop policy if exists "pw_insert_profiles" on public.profiles;
create policy "pw_insert_profiles" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "pw_update_profiles" on public.profiles;
create policy "pw_update_profiles" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "pw_update_profiles_admin" on public.profiles;
create policy "pw_update_profiles_admin" on public.profiles for update using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin)
);

drop policy if exists "pw_read_reactions" on public.reactions;
create policy "pw_read_reactions" on public.reactions for select using (true);
drop policy if exists "pw_insert_reactions" on public.reactions;
create policy "pw_insert_reactions" on public.reactions for insert with check (auth.uid() = user_id and not public.is_banned());
drop policy if exists "pw_delete_reactions" on public.reactions;
create policy "pw_delete_reactions" on public.reactions for delete using (auth.uid() = user_id and not public.is_banned());

drop policy if exists "pw_read_saves" on public.saves;
create policy "pw_read_saves" on public.saves for select using (true);
drop policy if exists "pw_insert_saves" on public.saves;
create policy "pw_insert_saves" on public.saves for insert with check (auth.uid() = user_id and not public.is_banned());
drop policy if exists "pw_delete_saves" on public.saves;
create policy "pw_delete_saves" on public.saves for delete using (auth.uid() = user_id and not public.is_banned());

drop policy if exists "pw_read_reflections" on public.reflections;
create policy "pw_read_reflections" on public.reflections for select using (true);
drop policy if exists "pw_insert_reflections" on public.reflections;
create policy "pw_insert_reflections" on public.reflections for insert with check (auth.uid() = user_id and not public.is_banned());

drop policy if exists "pw_insert_reports" on public.reports;
create policy "pw_insert_reports" on public.reports for insert with check (auth.uid() = user_id and not public.is_banned());
drop policy if exists "pw_read_reports_admin" on public.reports;
create policy "pw_read_reports_admin" on public.reports for select using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin)
);
drop policy if exists "pw_delete_reports_admin" on public.reports;
create policy "pw_delete_reports_admin" on public.reports for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin)
);

-- 5) Settings (admin-managed content) -------------------------
alter table public.settings enable row level security;
drop policy if exists "pw_read_settings" on public.settings;
create policy "pw_read_settings" on public.settings for select using (true);
drop policy if exists "pw_write_settings_admin" on public.settings;
create policy "pw_write_settings_admin" on public.settings for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin)
);

-- 6) Grants ---------------------------------------------------
grant select, insert, update, delete on public.promises to anon, authenticated;
grant select, insert, update, delete on public.profiles to anon, authenticated;
grant select, insert, update, delete on public.reactions to anon, authenticated;
grant select, insert, update, delete on public.saves to anon, authenticated;
grant select, insert, update, delete on public.reflections to anon, authenticated;
grant select, insert, delete on public.reports to authenticated;
grant select, insert on public.reports to anon;
grant select on public.settings to anon, authenticated;
grant insert, update, delete on public.settings to authenticated;

-- 7) Realtime publication -------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'promises') then
    alter publication supabase_realtime add table public.promises;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reactions') then
    alter publication supabase_realtime add table public.reactions;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'saves') then
    alter publication supabase_realtime add table public.saves;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reflections') then
    alter publication supabase_realtime add table public.reflections;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'settings') then
    alter publication supabase_realtime add table public.settings;
  end if;
end $$;

commit;
