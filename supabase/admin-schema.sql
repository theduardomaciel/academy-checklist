-- ============================================================================
-- Edge Academy — Admin support
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query),
-- AFTER schema.sql has been applied. Safe to re-run.
--
-- Adds:
--   * public.is_admin() helper
--   * public.profiles (one row per auth user, with an is_admin flag)
--   * RLS policies letting admins manage checklist templates/items,
--     view every session/log and read all profiles
--   * RPCs: list_users(), set_user_admin(uid, is_admin)
--
-- To promote the first admin (no one can do this from the app yet):
--   update public.profiles set is_admin = true where id = '<your-user-uuid>';
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Profiles table
--    Created first because public.is_admin() below reads from it.
-- ----------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ----------------------------------------------------------------------------
-- 2. is_admin() helper
--    Must exist BEFORE any policy below references it — Postgres validates
--    function references at policy/function creation time.
-- ----------------------------------------------------------------------------

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.is_admin
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Profile policies + auto-create trigger
-- ----------------------------------------------------------------------------

drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_admin_read_all" on public.profiles;
create policy "profiles_admin_read_all"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

-- Auto-create a profile whenever a new user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users that existed before this migration.
insert into public.profiles (id, full_name)
select u.id, coalesce(u.raw_user_meta_data ->> 'full_name', u.email)
from auth.users u
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 4. Admin write access to checklist templates/items + read access to all
--    sessions/logs (so admins can review everyone's history).
-- ----------------------------------------------------------------------------

drop policy if exists "templates_admin_all" on checklist_templates;
create policy "templates_admin_all"
  on checklist_templates for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "items_admin_all" on checklist_items;
create policy "items_admin_all"
  on checklist_items for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "sessions_admin_read_all" on closing_sessions;
create policy "sessions_admin_read_all"
  on closing_sessions for select
  to authenticated
  using (public.is_admin());

drop policy if exists "logs_admin_read_all" on closing_logs;
create policy "logs_admin_read_all"
  on closing_logs for select
  to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5. Admin RPCs (client cannot query auth.users directly)
-- ----------------------------------------------------------------------------

create or replace function public.list_users()
returns table (
  id uuid,
  email text,
  full_name text,
  is_admin boolean,
  created_at timestamptz
)
language sql
volatile
security definer set search_path = public
as $$
  select u.id, u.email,
         p.full_name, p.is_admin,
         u.created_at
  from auth.users u
  join public.profiles p on p.id = u.id
  order by p.is_admin desc, u.created_at desc;
$$;

revoke all on function public.list_users() from public;
grant execute on function public.list_users() to authenticated;

create or replace function public.set_user_admin(target_uid uuid, admin_flag boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  -- Never let the last admin demote themselves.
  if not admin_flag and target_uid = auth.uid() then
    if (select count(*) from public.profiles where is_admin) <= 1 then
      raise exception 'Não é possível remover o último administrador.';
    end if;
  end if;

  update public.profiles set is_admin = admin_flag where id = target_uid;
  if not found then
    raise exception 'Usuário não encontrado.';
  end if;
end;
$$;

revoke all on function public.set_user_admin(uuid, boolean) from public;
grant execute on function public.set_user_admin(uuid, boolean) to authenticated;
