-- ============================================================================
-- Edge Academy — Fechamento do Espaço
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query)
-- on a fresh project. Safe to re-run: everything uses IF NOT EXISTS / OR REPLACE.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tables
-- ----------------------------------------------------------------------------

create table if not exists checklist_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references checklist_templates(id) on delete cascade,
  order_index int not null,
  title text not null,
  location text,
  instructions text,
  requires_photo boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists checklist_items_template_idx on checklist_items(template_id, order_index);

create table if not exists closing_sessions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references checklist_templates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  constraint closing_sessions_profile_fkey foreign key (user_id) references public.profiles(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'cancelled')),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists closing_sessions_user_idx on closing_sessions(user_id, started_at desc);

create table if not exists closing_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references closing_sessions(id) on delete cascade,
  item_id uuid not null references checklist_items(id) on delete cascade,
  status text not null default 'done' check (status in ('done', 'skipped')),
  photo_path text, -- path inside the closing-photos storage bucket
  completed_at timestamptz not null default now(),
  unique (session_id, item_id)
);

create index if not exists closing_logs_session_idx on closing_logs(session_id);

-- ----------------------------------------------------------------------------
-- 2. Row Level Security
--    Every student can read the shared checklist templates/items, but can
--    only see and write their own sessions and logs.
-- ----------------------------------------------------------------------------

alter table checklist_templates enable row level security;
alter table checklist_items enable row level security;
alter table closing_sessions enable row level security;
alter table closing_logs enable row level security;

drop policy if exists "templates_read_all_authenticated" on checklist_templates;
create policy "templates_read_all_authenticated"
  on checklist_templates for select
  to authenticated
  using (true);

drop policy if exists "items_read_all_authenticated" on checklist_items;
create policy "items_read_all_authenticated"
  on checklist_items for select
  to authenticated
  using (true);

drop policy if exists "sessions_owner_select" on closing_sessions;
create policy "sessions_owner_select"
  on closing_sessions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "sessions_owner_insert" on closing_sessions;
create policy "sessions_owner_insert"
  on closing_sessions for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "sessions_owner_update" on closing_sessions;
create policy "sessions_owner_update"
  on closing_sessions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "logs_owner_select" on closing_logs;
create policy "logs_owner_select"
  on closing_logs for select
  to authenticated
  using (
    exists (
      select 1 from closing_sessions s
      where s.id = closing_logs.session_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "logs_owner_insert" on closing_logs;
create policy "logs_owner_insert"
  on closing_logs for insert
  to authenticated
  with check (
    exists (
      select 1 from closing_sessions s
      where s.id = closing_logs.session_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "logs_owner_update" on closing_logs;
create policy "logs_owner_update"
  on closing_logs for update
  to authenticated
  using (
    exists (
      select 1 from closing_sessions s
      where s.id = closing_logs.session_id and s.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 3. Storage bucket for closing photos (private — accessed via signed URLs)
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('closing-photos', 'closing-photos', false, 5242880) -- 5 MB hard cap per file
on conflict (id) do nothing;

drop policy if exists "closing_photos_owner_all" on storage.objects;
create policy "closing_photos_owner_all"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'closing-photos'
    and exists (
      select 1 from closing_sessions s
      where s.id::text = (storage.foldername(name))[1]
        and s.user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'closing-photos'
    and exists (
      select 1 from closing_sessions s
      where s.id::text = (storage.foldername(name))[1]
        and s.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 4. Retention: delete logs + photos older than 60 days, on a daily schedule.
--    This keeps the project comfortably under the 1 GB free-tier storage cap.
--    Requires the pg_cron and pg_net extensions (enable them under
--    Database > Extensions in the Supabase dashboard, then run this file).
-- ----------------------------------------------------------------------------

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Deletes DB rows for sessions older than the retention window. Storage
-- objects for those sessions are removed separately by the
-- `cleanup-old-photos` Edge Function (see supabase/functions/), which this
-- job triggers over HTTP so it can call the Storage API.
create or replace function trigger_photo_cleanup()
returns void
language sql
as $$
  select net.http_post(
    url := current_setting('app.settings.cleanup_function_url', true),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
$$;

-- After deploying the Edge Function (see README), set these two settings
-- with your project's actual values, then uncomment the schedule below:
--
-- alter database postgres set app.settings.cleanup_function_url =
--   'https://<project-ref>.supabase.co/functions/v1/cleanup-old-photos';
-- alter database postgres set app.settings.service_role_key = '<service-role-key>';
--
-- select cron.schedule(
--   'daily-photo-cleanup',
--   '0 4 * * *', -- 04:00 UTC every day
--   'select trigger_photo_cleanup();'
-- );

-- ----------------------------------------------------------------------------
-- 5. Example seed data — replace with your real facility checklist.
-- ----------------------------------------------------------------------------

do $$
declare
  tpl_id uuid;
begin
  if not exists (select 1 from checklist_templates where name = 'Fechamento do Laboratório') then
    insert into checklist_templates (name, description)
    values ('Fechamento do Laboratório', 'Checklist padrão para fechar o espaço ao final do expediente.')
    returning id into tpl_id;

    insert into checklist_items (template_id, order_index, title, instructions, requires_photo) values
      (tpl_id, 1, 'Ar-condicionado 1 (entrada)', 'Desligue no controle remoto e confirme o LED apagado.', true),
      (tpl_id, 2, 'Ar-condicionado 2 (sala de reunião)', 'Desligue no controle remoto e confirme o LED apagado.', true),
      (tpl_id, 3, 'Ar-condicionado 3 (fundos)', 'Desligue no controle remoto e confirme o LED apagado.', true),
      (tpl_id, 4, 'Luzes da sala principal', 'Apague todos os interruptores da sala principal.', true),
      (tpl_id, 5, 'Luzes do corredor', 'Apague o interruptor do corredor.', true),
      (tpl_id, 6, 'Computadores desligados', 'Confirme que os monitores e CPUs estão desligados.', true),
      (tpl_id, 7, 'Fechadura da porta principal', 'Tranque a porta e puxe para confirmar.', true);
  end if;
end $$;
