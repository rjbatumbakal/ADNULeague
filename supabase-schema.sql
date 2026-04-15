create extension if not exists pgcrypto;

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.announcement_activity_logs (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid references public.announcements (id) on delete cascade,
  action text not null check (action in ('created', 'updated', 'deleted')),
  actor_id uuid,
  actor_email text,
  title_snapshot text,
  content_snapshot text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  sport text not null,
  day integer not null check (day between 1 and 5),
  time text not null,
  venue text not null
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  acronym text not null
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null
);

create table if not exists public.event_results (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  department_id uuid not null references public.departments (id) on delete cascade,
  rank integer not null check (rank between 1 and 8),
  points_awarded integer not null,
  admin_email text not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.brackets (
  id uuid primary key default gen_random_uuid(),
  sport text not null,
  round text not null,
  team_a text not null,
  team_b text not null,
  score_a integer not null default 0 check (score_a >= 0),
  score_b integer not null default 0 check (score_b >= 0)
);

create table if not exists public.directory (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  contact text not null,
  department text not null
);

create table if not exists public.guidelines (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  file_url text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.featured_matchup (
  id integer primary key default 1 check (id = 1),
  day_label text not null,
  time_label text not null,
  venue text not null,
  home_team_name text not null,
  home_team_description text not null,
  away_team_name text not null,
  away_team_description text not null,
  event_label text not null,
  note_label text not null,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_email text
);

create table if not exists public.schedule_activity_logs (
  id uuid primary key default gen_random_uuid(),
  schedule_table text not null,
  schedule_entry_id text not null,
  day integer not null,
  action text not null check (action in ('created', 'updated', 'deleted')),
  actor_id uuid,
  actor_email text,
  category_snapshot text,
  event_snapshot text,
  teams_involved_snapshot text,
  time_snapshot text,
  venue_snapshot text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.schedule_activity_logs
  alter column schedule_entry_id type text using schedule_entry_id::text;

create table if not exists public.featured_matchup_logs (
  id uuid primary key default gen_random_uuid(),
  actor_email text,
  home_team_name text,
  away_team_name text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.featured_matchup_entries (
  id uuid primary key default gen_random_uuid(),
  day_label text not null,
  timing_label text not null,
  sport_label text not null,
  category_label text not null,
  bracket_label text,
  game_label text,
  venue text not null,
  home_team_name text not null,
  away_team_name text not null,
  is_featured boolean not null default false,
  selected_match_ids uuid[] not null default '{}',
  selected_matches jsonb not null default '[]'::jsonb,
  is_published boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by_email text,
  updated_by_email text
);

create table if not exists public.featured_matchup_activity_logs (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references public.featured_matchup_entries (id) on delete set null,
  action text not null check (action in ('created', 'updated', 'deleted')),
  actor_id uuid,
  actor_email text,
  day_label_snapshot text,
  timing_label_snapshot text,
  sport_label_snapshot text,
  category_label_snapshot text,
  venue_snapshot text,
  home_team_name_snapshot text,
  away_team_name_snapshot text,
  created_at timestamptz not null default timezone('utc', now())
);

-- Compatibility: store multi-match arrays in JSONB for carousel payloads.
alter table if exists public.featured_matchup_entries
  add column if not exists included_matches jsonb not null default '[]'::jsonb;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'featured_matchups'
      and column_name = 'included_matches'
      and data_type <> 'jsonb'
  ) then
    alter table public.featured_matchups
      alter column included_matches type jsonb
      using case
        when included_matches is null then '[]'::jsonb
        else jsonb_build_array(included_matches)
      end;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'featured_matchups'
  ) then
    alter table public.featured_matchups
      add column if not exists included_matches jsonb not null default '[]'::jsonb;
  end if;
end $$;

create index if not exists announcements_created_at_idx on public.announcements (created_at desc);
create index if not exists announcement_activity_logs_announcement_idx on public.announcement_activity_logs (announcement_id, created_at desc);
create index if not exists schedules_day_time_idx on public.schedules (day asc, time asc);
create unique index if not exists departments_name_unique_idx on public.departments (name);
create unique index if not exists departments_acronym_unique_idx on public.departments (acronym);
create index if not exists events_category_name_idx on public.events (category asc, name asc);
create unique index if not exists events_category_name_unique_idx on public.events (category, name);
create index if not exists event_results_event_rank_idx on public.event_results (event_id asc, rank asc);
create index if not exists event_results_department_points_idx on public.event_results (department_id asc, points_awarded desc);
create unique index if not exists event_results_event_department_unique_idx on public.event_results (event_id, department_id);
create index if not exists brackets_sport_round_idx on public.brackets (sport asc, round asc);
create index if not exists directory_department_name_idx on public.directory (department asc, name asc);
create index if not exists featured_matchup_updated_at_idx on public.featured_matchup (updated_at desc);
create index if not exists schedule_activity_logs_schedule_idx on public.schedule_activity_logs (schedule_table, schedule_entry_id, created_at desc);
create index if not exists featured_matchup_logs_created_at_idx on public.featured_matchup_logs (created_at desc);
create index if not exists featured_matchup_entries_published_order_idx on public.featured_matchup_entries (is_published desc, display_order asc, created_at desc);
create index if not exists featured_matchup_activity_logs_entry_idx on public.featured_matchup_activity_logs (entry_id, created_at desc);

alter table public.announcements enable row level security;
alter table if exists public.announcement_activity_logs enable row level security;
alter table public.schedules enable row level security;
alter table public.departments enable row level security;
alter table public.events enable row level security;
alter table public.event_results enable row level security;
alter table public.brackets enable row level security;
alter table public.directory enable row level security;
alter table public.guidelines enable row level security;
alter table public.featured_matchup enable row level security;
alter table if exists public.featured_matchup_entries enable row level security;
alter table if exists public.featured_matchup_activity_logs enable row level security;

drop policy if exists "Public read announcements" on public.announcements;
drop policy if exists "Public read schedules" on public.schedules;
drop policy if exists "Public read departments" on public.departments;
drop policy if exists "Public read events" on public.events;
drop policy if exists "Public read event_results" on public.event_results;
drop policy if exists "Public read brackets" on public.brackets;
drop policy if exists "Public read directory" on public.directory;
drop policy if exists "Public read guidelines" on public.guidelines;
drop policy if exists "Public read featured_matchup" on public.featured_matchup;
drop policy if exists "Public read featured matchup entries" on public.featured_matchup_entries;

drop policy if exists "Authenticated manage announcements" on public.announcements;
drop policy if exists "Admin read announcement activity logs" on public.announcement_activity_logs;
drop policy if exists "Admin manage announcement activity logs" on public.announcement_activity_logs;
drop policy if exists "Authenticated manage schedules" on public.schedules;
drop policy if exists "Authenticated manage departments" on public.departments;
drop policy if exists "Authenticated manage events" on public.events;
drop policy if exists "Authenticated manage event_results" on public.event_results;
drop policy if exists "Authenticated manage brackets" on public.brackets;
drop policy if exists "Authenticated manage directory" on public.directory;
drop policy if exists "Authenticated manage guidelines" on public.guidelines;
drop policy if exists "Authenticated manage featured_matchup" on public.featured_matchup;
drop policy if exists "Admin manage featured matchup entries" on public.featured_matchup_entries;
drop policy if exists "Admin read featured matchup activity logs" on public.featured_matchup_activity_logs;
drop policy if exists "Admin manage featured matchup activity logs" on public.featured_matchup_activity_logs;

create policy "Public read announcements" on public.announcements for select using (true);
create policy "Public read schedules" on public.schedules for select using (true);
create policy "Public read departments" on public.departments for select using (true);
create policy "Public read events" on public.events for select using (true);
create policy "Public read event_results" on public.event_results for select using (true);
create policy "Public read brackets" on public.brackets for select using (true);
create policy "Public read directory" on public.directory for select using (true);
create policy "Public read guidelines" on public.guidelines for select using (true);
create policy "Public read featured_matchup" on public.featured_matchup for select using (true);
create policy "Public read featured matchup entries" on public.featured_matchup_entries for select using (is_published = true);

create policy "Authenticated manage announcements" on public.announcements for all to authenticated using (true) with check (true);
create policy "Admin read announcement activity logs" on public.announcement_activity_logs for select to authenticated using (((auth.jwt() ->> 'email'::text) = any (array['johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text])));
create policy "Admin manage announcement activity logs" on public.announcement_activity_logs for all to authenticated using (((auth.jwt() ->> 'email'::text) = any (array['johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text]))) with check (((auth.jwt() ->> 'email'::text) = any (array['johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text])));
create policy "Authenticated manage schedules" on public.schedules for all to authenticated using (((auth.jwt() ->> 'email'::text) = any (array['fvaliente@gbox.adnu.edu.ph'::text, 'adumali@gbox.adnu.edu.ph'::text, 'yapacao@gbox.adnu.edu.ph'::text, 'fcaballero@gbox.adnu.edu.ph'::text, 'jgalapate@gbox.adnu.edu.ph'::text, 'jsevero@gbox.adnu.edu.ph'::text, 'grayala@gbox.adnu.edu.ph'::text, 'acatangui@gbox.adnu.edu.ph'::text, 'malicmoan@gbox.adnu.edu.ph'::text, 'rcid@gbox.adnu.edu.ph'::text, 'sabernal@gbox.adnu.edu.ph'::text, 'gatalbo@gbox.adnu.edu.ph'::text, 'jedevera@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text, 'johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text]))) with check (((auth.jwt() ->> 'email'::text) = any (array['fvaliente@gbox.adnu.edu.ph'::text, 'adumali@gbox.adnu.edu.ph'::text, 'yapacao@gbox.adnu.edu.ph'::text, 'fcaballero@gbox.adnu.edu.ph'::text, 'jgalapate@gbox.adnu.edu.ph'::text, 'jsevero@gbox.adnu.edu.ph'::text, 'grayala@gbox.adnu.edu.ph'::text, 'acatangui@gbox.adnu.edu.ph'::text, 'malicmoan@gbox.adnu.edu.ph'::text, 'rcid@gbox.adnu.edu.ph'::text, 'sabernal@gbox.adnu.edu.ph'::text, 'gatalbo@gbox.adnu.edu.ph'::text, 'jedevera@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text, 'johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text])));
create policy "Authenticated manage departments" on public.departments for all to authenticated using (((auth.jwt() ->> 'email'::text) = any (array['fvaliente@gbox.adnu.edu.ph'::text, 'adumali@gbox.adnu.edu.ph'::text, 'yapacao@gbox.adnu.edu.ph'::text, 'fcaballero@gbox.adnu.edu.ph'::text, 'jgalapate@gbox.adnu.edu.ph'::text, 'jsevero@gbox.adnu.edu.ph'::text, 'grayala@gbox.adnu.edu.ph'::text, 'acatangui@gbox.adnu.edu.ph'::text, 'malicmoan@gbox.adnu.edu.ph'::text, 'rcid@gbox.adnu.edu.ph'::text, 'sabernal@gbox.adnu.edu.ph'::text, 'gatalbo@gbox.adnu.edu.ph'::text, 'jedevera@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text, 'johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text]))) with check (((auth.jwt() ->> 'email'::text) = any (array['fvaliente@gbox.adnu.edu.ph'::text, 'adumali@gbox.adnu.edu.ph'::text, 'yapacao@gbox.adnu.edu.ph'::text, 'fcaballero@gbox.adnu.edu.ph'::text, 'jgalapate@gbox.adnu.edu.ph'::text, 'jsevero@gbox.adnu.edu.ph'::text, 'grayala@gbox.adnu.edu.ph'::text, 'acatangui@gbox.adnu.edu.ph'::text, 'malicmoan@gbox.adnu.edu.ph'::text, 'rcid@gbox.adnu.edu.ph'::text, 'sabernal@gbox.adnu.edu.ph'::text, 'gatalbo@gbox.adnu.edu.ph'::text, 'jedevera@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text, 'johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text])));
create policy "Authenticated manage events" on public.events for all to authenticated using (((auth.jwt() ->> 'email'::text) = any (array['fvaliente@gbox.adnu.edu.ph'::text, 'adumali@gbox.adnu.edu.ph'::text, 'yapacao@gbox.adnu.edu.ph'::text, 'fcaballero@gbox.adnu.edu.ph'::text, 'jgalapate@gbox.adnu.edu.ph'::text, 'jsevero@gbox.adnu.edu.ph'::text, 'grayala@gbox.adnu.edu.ph'::text, 'acatangui@gbox.adnu.edu.ph'::text, 'malicmoan@gbox.adnu.edu.ph'::text, 'rcid@gbox.adnu.edu.ph'::text, 'sabernal@gbox.adnu.edu.ph'::text, 'gatalbo@gbox.adnu.edu.ph'::text, 'jedevera@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text, 'johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text]))) with check (((auth.jwt() ->> 'email'::text) = any (array['fvaliente@gbox.adnu.edu.ph'::text, 'adumali@gbox.adnu.edu.ph'::text, 'yapacao@gbox.adnu.edu.ph'::text, 'fcaballero@gbox.adnu.edu.ph'::text, 'jgalapate@gbox.adnu.edu.ph'::text, 'jsevero@gbox.adnu.edu.ph'::text, 'grayala@gbox.adnu.edu.ph'::text, 'acatangui@gbox.adnu.edu.ph'::text, 'malicmoan@gbox.adnu.edu.ph'::text, 'rcid@gbox.adnu.edu.ph'::text, 'sabernal@gbox.adnu.edu.ph'::text, 'gatalbo@gbox.adnu.edu.ph'::text, 'jedevera@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text, 'johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text])));
create policy "Authenticated manage event_results" on public.event_results for all to authenticated using (((auth.jwt() ->> 'email'::text) = any (array['fvaliente@gbox.adnu.edu.ph'::text, 'adumali@gbox.adnu.edu.ph'::text, 'yapacao@gbox.adnu.edu.ph'::text, 'fcaballero@gbox.adnu.edu.ph'::text, 'jgalapate@gbox.adnu.edu.ph'::text, 'jsevero@gbox.adnu.edu.ph'::text, 'grayala@gbox.adnu.edu.ph'::text, 'acatangui@gbox.adnu.edu.ph'::text, 'malicmoan@gbox.adnu.edu.ph'::text, 'rcid@gbox.adnu.edu.ph'::text, 'sabernal@gbox.adnu.edu.ph'::text, 'gatalbo@gbox.adnu.edu.ph'::text, 'jedevera@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text, 'johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text]))) with check (((auth.jwt() ->> 'email'::text) = any (array['fvaliente@gbox.adnu.edu.ph'::text, 'adumali@gbox.adnu.edu.ph'::text, 'yapacao@gbox.adnu.edu.ph'::text, 'fcaballero@gbox.adnu.edu.ph'::text, 'jgalapate@gbox.adnu.edu.ph'::text, 'jsevero@gbox.adnu.edu.ph'::text, 'grayala@gbox.adnu.edu.ph'::text, 'acatangui@gbox.adnu.edu.ph'::text, 'malicmoan@gbox.adnu.edu.ph'::text, 'rcid@gbox.adnu.edu.ph'::text, 'sabernal@gbox.adnu.edu.ph'::text, 'gatalbo@gbox.adnu.edu.ph'::text, 'jedevera@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text, 'johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text])));
create policy "Authenticated manage brackets" on public.brackets for all to authenticated using (true) with check (true);
create policy "Authenticated manage directory" on public.directory for all to authenticated using (true) with check (true);
create policy "Authenticated manage guidelines" on public.guidelines for all to authenticated using (true) with check (true);
create policy "Authenticated manage featured_matchup" on public.featured_matchup for all to authenticated using (((auth.jwt() ->> 'email'::text) = any (array['johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text, 'fvaliente@gbox.adnu.edu.ph'::text, 'adumali@gbox.adnu.edu.ph'::text, 'yapacao@gbox.adnu.edu.ph'::text, 'fcaballero@gbox.adnu.edu.ph'::text, 'jgalapate@gbox.adnu.edu.ph'::text, 'jsevero@gbox.adnu.edu.ph'::text, 'grayala@gbox.adnu.edu.ph'::text, 'acatangui@gbox.adnu.edu.ph'::text, 'malicmoan@gbox.adnu.edu.ph'::text, 'mmbaluyo@gbox.adnu.edu.ph'::text]))) with check (((auth.jwt() ->> 'email'::text) = any (array['johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text, 'fvaliente@gbox.adnu.edu.ph'::text, 'adumali@gbox.adnu.edu.ph'::text, 'yapacao@gbox.adnu.edu.ph'::text, 'fcaballero@gbox.adnu.edu.ph'::text, 'jgalapate@gbox.adnu.edu.ph'::text, 'jsevero@gbox.adnu.edu.ph'::text, 'grayala@gbox.adnu.edu.ph'::text, 'acatangui@gbox.adnu.edu.ph'::text, 'malicmoan@gbox.adnu.edu.ph'::text, 'mmbaluyo@gbox.adnu.edu.ph'::text])));
create policy "Admin manage featured matchup entries" on public.featured_matchup_entries for all to authenticated using (((auth.jwt() ->> 'email'::text) = any (array['johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text, 'fvaliente@gbox.adnu.edu.ph'::text, 'adumali@gbox.adnu.edu.ph'::text, 'yapacao@gbox.adnu.edu.ph'::text, 'fcaballero@gbox.adnu.edu.ph'::text, 'jgalapate@gbox.adnu.edu.ph'::text, 'jsevero@gbox.adnu.edu.ph'::text, 'grayala@gbox.adnu.edu.ph'::text, 'acatangui@gbox.adnu.edu.ph'::text, 'malicmoan@gbox.adnu.edu.ph'::text, 'mmbaluyo@gbox.adnu.edu.ph'::text]))) with check (((auth.jwt() ->> 'email'::text) = any (array['johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text, 'fvaliente@gbox.adnu.edu.ph'::text, 'adumali@gbox.adnu.edu.ph'::text, 'yapacao@gbox.adnu.edu.ph'::text, 'fcaballero@gbox.adnu.edu.ph'::text, 'jgalapate@gbox.adnu.edu.ph'::text, 'jsevero@gbox.adnu.edu.ph'::text, 'grayala@gbox.adnu.edu.ph'::text, 'acatangui@gbox.adnu.edu.ph'::text, 'malicmoan@gbox.adnu.edu.ph'::text, 'mmbaluyo@gbox.adnu.edu.ph'::text])));
create policy "Admin read featured matchup activity logs" on public.featured_matchup_activity_logs for select to authenticated using (((auth.jwt() ->> 'email'::text) = any (array['johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text, 'fvaliente@gbox.adnu.edu.ph'::text, 'adumali@gbox.adnu.edu.ph'::text, 'yapacao@gbox.adnu.edu.ph'::text, 'fcaballero@gbox.adnu.edu.ph'::text, 'jgalapate@gbox.adnu.edu.ph'::text, 'jsevero@gbox.adnu.edu.ph'::text, 'grayala@gbox.adnu.edu.ph'::text, 'acatangui@gbox.adnu.edu.ph'::text, 'malicmoan@gbox.adnu.edu.ph'::text, 'mmbaluyo@gbox.adnu.edu.ph'::text])));
create policy "Admin manage featured matchup activity logs" on public.featured_matchup_activity_logs for all to authenticated using (((auth.jwt() ->> 'email'::text) = any (array['johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text, 'fvaliente@gbox.adnu.edu.ph'::text, 'adumali@gbox.adnu.edu.ph'::text, 'yapacao@gbox.adnu.edu.ph'::text, 'fcaballero@gbox.adnu.edu.ph'::text, 'jgalapate@gbox.adnu.edu.ph'::text, 'jsevero@gbox.adnu.edu.ph'::text, 'grayala@gbox.adnu.edu.ph'::text, 'acatangui@gbox.adnu.edu.ph'::text, 'malicmoan@gbox.adnu.edu.ph'::text, 'mmbaluyo@gbox.adnu.edu.ph'::text]))) with check (((auth.jwt() ->> 'email'::text) = any (array['johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text, 'fvaliente@gbox.adnu.edu.ph'::text, 'adumali@gbox.adnu.edu.ph'::text, 'yapacao@gbox.adnu.edu.ph'::text, 'fcaballero@gbox.adnu.edu.ph'::text, 'jgalapate@gbox.adnu.edu.ph'::text, 'jsevero@gbox.adnu.edu.ph'::text, 'grayala@gbox.adnu.edu.ph'::text, 'acatangui@gbox.adnu.edu.ph'::text, 'malicmoan@gbox.adnu.edu.ph'::text, 'mmbaluyo@gbox.adnu.edu.ph'::text])));
alter table if exists public.schedule_day_1 enable row level security;
alter table if exists public.schedule_day_2 enable row level security;
alter table if exists public.schedule_day_3 enable row level security;
alter table if exists public.schedule_day_4 enable row level security;
alter table if exists public.schedule_day_5 enable row level security;
alter table if exists public.schedule_activity_logs enable row level security;
alter table if exists public.featured_matchup_logs enable row level security;

drop policy if exists "Public read schedule_day_1" on public.schedule_day_1;
drop policy if exists "Public read schedule_day_2" on public.schedule_day_2;
drop policy if exists "Public read schedule_day_3" on public.schedule_day_3;
drop policy if exists "Public read schedule_day_4" on public.schedule_day_4;
drop policy if exists "Public read schedule_day_5" on public.schedule_day_5;
drop policy if exists "Admin manage schedule_day_1" on public.schedule_day_1;
drop policy if exists "Admin manage schedule_day_2" on public.schedule_day_2;
drop policy if exists "Admin manage schedule_day_3" on public.schedule_day_3;
drop policy if exists "Admin manage schedule_day_4" on public.schedule_day_4;
drop policy if exists "Admin manage schedule_day_5" on public.schedule_day_5;
drop policy if exists "Admin read schedule activity logs" on public.schedule_activity_logs;
drop policy if exists "Admin manage schedule activity logs" on public.schedule_activity_logs;
drop policy if exists "Admin read featured matchup logs" on public.featured_matchup_logs;
drop policy if exists "Admin manage featured matchup logs" on public.featured_matchup_logs;

create policy "Public read schedule_day_1" on public.schedule_day_1 for select using (true);
create policy "Public read schedule_day_2" on public.schedule_day_2 for select using (true);
create policy "Public read schedule_day_3" on public.schedule_day_3 for select using (true);
create policy "Public read schedule_day_4" on public.schedule_day_4 for select using (true);
create policy "Public read schedule_day_5" on public.schedule_day_5 for select using (true);
create policy "Admin manage schedule_day_1" on public.schedule_day_1 for all to authenticated using (((auth.jwt() ->> 'email'::text) = any (array['fvaliente@gbox.adnu.edu.ph'::text, 'adumali@gbox.adnu.edu.ph'::text, 'yapacao@gbox.adnu.edu.ph'::text, 'fcaballero@gbox.adnu.edu.ph'::text, 'jgalapate@gbox.adnu.edu.ph'::text, 'jsevero@gbox.adnu.edu.ph'::text, 'grayala@gbox.adnu.edu.ph'::text, 'acatangui@gbox.adnu.edu.ph'::text, 'malicmoan@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text, 'johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text]))) with check (((auth.jwt() ->> 'email'::text) = any (array['fvaliente@gbox.adnu.edu.ph'::text, 'adumali@gbox.adnu.edu.ph'::text, 'yapacao@gbox.adnu.edu.ph'::text, 'fcaballero@gbox.adnu.edu.ph'::text, 'jgalapate@gbox.adnu.edu.ph'::text, 'jsevero@gbox.adnu.edu.ph'::text, 'grayala@gbox.adnu.edu.ph'::text, 'acatangui@gbox.adnu.edu.ph'::text, 'malicmoan@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text, 'johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text])));
create policy "Admin manage schedule_day_2" on public.schedule_day_2 for all to authenticated using (((auth.jwt() ->> 'email'::text) = any (array['fvaliente@gbox.adnu.edu.ph'::text, 'adumali@gbox.adnu.edu.ph'::text, 'yapacao@gbox.adnu.edu.ph'::text, 'fcaballero@gbox.adnu.edu.ph'::text, 'jgalapate@gbox.adnu.edu.ph'::text, 'jsevero@gbox.adnu.edu.ph'::text, 'grayala@gbox.adnu.edu.ph'::text, 'acatangui@gbox.adnu.edu.ph'::text, 'malicmoan@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text, 'johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text]))) with check (((auth.jwt() ->> 'email'::text) = any (array['fvaliente@gbox.adnu.edu.ph'::text, 'adumali@gbox.adnu.edu.ph'::text, 'yapacao@gbox.adnu.edu.ph'::text, 'fcaballero@gbox.adnu.edu.ph'::text, 'jgalapate@gbox.adnu.edu.ph'::text, 'jsevero@gbox.adnu.edu.ph'::text, 'grayala@gbox.adnu.edu.ph'::text, 'acatangui@gbox.adnu.edu.ph'::text, 'malicmoan@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text, 'johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text])));
create policy "Admin manage schedule_day_3" on public.schedule_day_3 for all to authenticated using (((auth.jwt() ->> 'email'::text) = any (array['fvaliente@gbox.adnu.edu.ph'::text, 'adumali@gbox.adnu.edu.ph'::text, 'yapacao@gbox.adnu.edu.ph'::text, 'fcaballero@gbox.adnu.edu.ph'::text, 'jgalapate@gbox.adnu.edu.ph'::text, 'jsevero@gbox.adnu.edu.ph'::text, 'grayala@gbox.adnu.edu.ph'::text, 'acatangui@gbox.adnu.edu.ph'::text, 'malicmoan@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text, 'johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text]))) with check (((auth.jwt() ->> 'email'::text) = any (array['fvaliente@gbox.adnu.edu.ph'::text, 'adumali@gbox.adnu.edu.ph'::text, 'yapacao@gbox.adnu.edu.ph'::text, 'fcaballero@gbox.adnu.edu.ph'::text, 'jgalapate@gbox.adnu.edu.ph'::text, 'jsevero@gbox.adnu.edu.ph'::text, 'grayala@gbox.adnu.edu.ph'::text, 'acatangui@gbox.adnu.edu.ph'::text, 'malicmoan@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text, 'johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text])));
create policy "Admin manage schedule_day_4" on public.schedule_day_4 for all to authenticated using (((auth.jwt() ->> 'email'::text) = any (array['fvaliente@gbox.adnu.edu.ph'::text, 'adumali@gbox.adnu.edu.ph'::text, 'yapacao@gbox.adnu.edu.ph'::text, 'fcaballero@gbox.adnu.edu.ph'::text, 'jgalapate@gbox.adnu.edu.ph'::text, 'jsevero@gbox.adnu.edu.ph'::text, 'grayala@gbox.adnu.edu.ph'::text, 'acatangui@gbox.adnu.edu.ph'::text, 'malicmoan@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text, 'johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text]))) with check (((auth.jwt() ->> 'email'::text) = any (array['fvaliente@gbox.adnu.edu.ph'::text, 'adumali@gbox.adnu.edu.ph'::text, 'yapacao@gbox.adnu.edu.ph'::text, 'fcaballero@gbox.adnu.edu.ph'::text, 'jgalapate@gbox.adnu.edu.ph'::text, 'jsevero@gbox.adnu.edu.ph'::text, 'grayala@gbox.adnu.edu.ph'::text, 'acatangui@gbox.adnu.edu.ph'::text, 'malicmoan@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text, 'johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text])));
create policy "Admin manage schedule_day_5" on public.schedule_day_5 for all to authenticated using (((auth.jwt() ->> 'email'::text) = any (array['fvaliente@gbox.adnu.edu.ph'::text, 'adumali@gbox.adnu.edu.ph'::text, 'yapacao@gbox.adnu.edu.ph'::text, 'fcaballero@gbox.adnu.edu.ph'::text, 'jgalapate@gbox.adnu.edu.ph'::text, 'jsevero@gbox.adnu.edu.ph'::text, 'grayala@gbox.adnu.edu.ph'::text, 'acatangui@gbox.adnu.edu.ph'::text, 'malicmoan@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text, 'johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text]))) with check (((auth.jwt() ->> 'email'::text) = any (array['fvaliente@gbox.adnu.edu.ph'::text, 'adumali@gbox.adnu.edu.ph'::text, 'yapacao@gbox.adnu.edu.ph'::text, 'fcaballero@gbox.adnu.edu.ph'::text, 'jgalapate@gbox.adnu.edu.ph'::text, 'jsevero@gbox.adnu.edu.ph'::text, 'grayala@gbox.adnu.edu.ph'::text, 'acatangui@gbox.adnu.edu.ph'::text, 'malicmoan@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text, 'johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text])));
create policy "Admin read schedule activity logs" on public.schedule_activity_logs for select to authenticated using (((auth.jwt() ->> 'email'::text) = any (array['fvaliente@gbox.adnu.edu.ph'::text, 'adumali@gbox.adnu.edu.ph'::text, 'yapacao@gbox.adnu.edu.ph'::text, 'fcaballero@gbox.adnu.edu.ph'::text, 'jgalapate@gbox.adnu.edu.ph'::text, 'jsevero@gbox.adnu.edu.ph'::text, 'grayala@gbox.adnu.edu.ph'::text, 'acatangui@gbox.adnu.edu.ph'::text, 'malicmoan@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text, 'johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text])));
create policy "Admin manage schedule activity logs" on public.schedule_activity_logs for all to authenticated using (((auth.jwt() ->> 'email'::text) = any (array['fvaliente@gbox.adnu.edu.ph'::text, 'adumali@gbox.adnu.edu.ph'::text, 'yapacao@gbox.adnu.edu.ph'::text, 'fcaballero@gbox.adnu.edu.ph'::text, 'jgalapate@gbox.adnu.edu.ph'::text, 'jsevero@gbox.adnu.edu.ph'::text, 'grayala@gbox.adnu.edu.ph'::text, 'acatangui@gbox.adnu.edu.ph'::text, 'malicmoan@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text, 'johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text]))) with check (((auth.jwt() ->> 'email'::text) = any (array['fvaliente@gbox.adnu.edu.ph'::text, 'adumali@gbox.adnu.edu.ph'::text, 'yapacao@gbox.adnu.edu.ph'::text, 'fcaballero@gbox.adnu.edu.ph'::text, 'jgalapate@gbox.adnu.edu.ph'::text, 'jsevero@gbox.adnu.edu.ph'::text, 'grayala@gbox.adnu.edu.ph'::text, 'acatangui@gbox.adnu.edu.ph'::text, 'malicmoan@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text, 'johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text])));
create policy "Admin read featured matchup logs" on public.featured_matchup_logs for select to authenticated using (((auth.jwt() ->> 'email'::text) = any (array['johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text])));
create policy "Admin manage featured matchup logs" on public.featured_matchup_logs for all to authenticated using (((auth.jwt() ->> 'email'::text) = any (array['johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text]))) with check (((auth.jwt() ->> 'email'::text) = any (array['johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text])));

alter table if exists public.forum_submissions enable row level security;

drop policy if exists "Public create forum submissions" on public.forum_submissions;
drop policy if exists "Public read published forum replies" on public.forum_submissions;
drop policy if exists "Admin manage forum submissions" on public.forum_submissions;

create policy "Public create forum submissions" on public.forum_submissions for insert to public with check (true);
create policy "Public read published forum replies" on public.forum_submissions for select using ((admin_reply is not null) and (coalesce(is_spam, false) = false) and (coalesce(status, 'new') <> 'archived'));
create policy "Admin manage forum submissions" on public.forum_submissions for all to authenticated using (((auth.jwt() ->> 'email'::text) = any (array['cebron@gbox.adnu.edu.ph'::text, 'eaclemente@gbox.adnu.edu.ph'::text, 'johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text]))) with check (((auth.jwt() ->> 'email'::text) = any (array['cebron@gbox.adnu.edu.ph'::text, 'eaclemente@gbox.adnu.edu.ph'::text, 'johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text])));

create table if not exists public.now_happening_posts (
  id uuid primary key default gen_random_uuid(),
  caption text not null,
  image_path text not null,
  image_url text not null,
  is_published boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by_email text,
  updated_by_email text
);

create table if not exists public.now_happening_activity_logs (
  id uuid primary key default gen_random_uuid(),
  post_id uuid,
  action text not null check (action in ('created', 'updated', 'deleted')),
  actor_id uuid,
  actor_email text,
  caption_snapshot text,
  image_path_snapshot text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists now_happening_posts_published_order_idx on public.now_happening_posts (is_published desc, display_order asc, created_at desc);
create index if not exists now_happening_activity_logs_post_idx on public.now_happening_activity_logs (post_id, created_at desc);

alter table public.now_happening_posts enable row level security;
alter table public.now_happening_activity_logs enable row level security;

drop policy if exists "Public read now happening posts" on public.now_happening_posts;
drop policy if exists "Admin manage now happening posts" on public.now_happening_posts;
drop policy if exists "Admin read now happening activity logs" on public.now_happening_activity_logs;
drop policy if exists "Admin manage now happening activity logs" on public.now_happening_activity_logs;

create policy "Public read now happening posts" on public.now_happening_posts for select using (is_published = true);
create policy "Admin manage now happening posts" on public.now_happening_posts for all to authenticated using (((auth.jwt() ->> 'email'::text) = any (array['johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text, 'mmbaluyo@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text]))) with check (((auth.jwt() ->> 'email'::text) = any (array['johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text, 'mmbaluyo@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text])));
create policy "Admin read now happening activity logs" on public.now_happening_activity_logs for select to authenticated using (((auth.jwt() ->> 'email'::text) = any (array['johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text])));
create policy "Admin manage now happening activity logs" on public.now_happening_activity_logs for all to authenticated using (((auth.jwt() ->> 'email'::text) = any (array['johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text]))) with check (((auth.jwt() ->> 'email'::text) = any (array['johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text])));

insert into storage.buckets (id, name, public)
values ('now-happening', 'now-happening', true)
on conflict (id) do nothing;

drop policy if exists "Public read now happening images" on storage.objects;
drop policy if exists "Admin upload now happening images" on storage.objects;
drop policy if exists "Admin update now happening images" on storage.objects;
drop policy if exists "Admin delete now happening images" on storage.objects;

create policy "Public read now happening images" on storage.objects for select using (bucket_id = 'now-happening');
create policy "Admin upload now happening images" on storage.objects for insert to authenticated with check ((bucket_id = 'now-happening') and ((auth.jwt() ->> 'email'::text) = any (array['johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text, 'mmbaluyo@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text])));
create policy "Admin update now happening images" on storage.objects for update to authenticated using ((bucket_id = 'now-happening') and ((auth.jwt() ->> 'email'::text) = any (array['johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text, 'mmbaluyo@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text]))) with check ((bucket_id = 'now-happening') and ((auth.jwt() ->> 'email'::text) = any (array['johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text, 'mmbaluyo@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text])));
create policy "Admin delete now happening images" on storage.objects for delete to authenticated using ((bucket_id = 'now-happening') and ((auth.jwt() ->> 'email'::text) = any (array['johmendoza@gbox.adnu.edu.ph'::text, 'mbayrante@gbox.adnu.edu.ph'::text, 'gavelasco@gbox.adnu.edu.ph'::text, 'ambulaon@gbox.adnu.edu.ph'::text, 'mmbaluyo@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text])));

insert into storage.buckets (id, name, public)
values ('adnl-guidelines', 'adnl-guidelines', true)
on conflict (id) do nothing;

drop policy if exists "Public read guidelines files" on storage.objects;

create policy "Public read guidelines files" on storage.objects for select using (bucket_id = 'adnl-guidelines');

create table if not exists public.app_settings (
  id integer primary key default 1 check (id = 1),
  blackout_mode text not null default 'none' check (blackout_mode in ('none', 'top3', 'top5', 'all')),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.app_settings
  add column if not exists is_breakdown_visible boolean not null default false;

alter table if exists public.app_settings
  add column if not exists is_forums_visible boolean not null default true;

insert into public.app_settings (id, blackout_mode)
values (1, 'none')
on conflict (id) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists "Public read app settings" on public.app_settings;
drop policy if exists "Admin manage app settings" on public.app_settings;

create policy "Public read app settings" on public.app_settings for select using (true);
create policy "Admin manage app settings" on public.app_settings for all to authenticated using (true) with check (true);

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'matches'
  ) then
    alter table public.matches enable row level security;

    drop policy if exists "Public read matches" on public.matches;
    drop policy if exists "Authenticated manage matches" on public.matches;

    create policy "Public read matches" on public.matches for select using (true);
    create policy "Authenticated manage matches" on public.matches for all to authenticated using (((auth.jwt() ->> 'email'::text) = any (array['fvaliente@gbox.adnu.edu.ph'::text, 'adumali@gbox.adnu.edu.ph'::text, 'yapacao@gbox.adnu.edu.ph'::text, 'fcaballero@gbox.adnu.edu.ph'::text, 'jsevero@gbox.adnu.edu.ph'::text, 'malicmoan@gbox.adnu.edu.ph'::text, 'rcid@gbox.adnu.edu.ph'::text, 'sabernal@gbox.adnu.edu.ph'::text, 'gatalbo@gbox.adnu.edu.ph'::text, 'jedevera@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text, 'johmendoza@gbox.adnu.edu.ph'::text]))) with check (((auth.jwt() ->> 'email'::text) = any (array['fvaliente@gbox.adnu.edu.ph'::text, 'adumali@gbox.adnu.edu.ph'::text, 'yapacao@gbox.adnu.edu.ph'::text, 'fcaballero@gbox.adnu.edu.ph'::text, 'jsevero@gbox.adnu.edu.ph'::text, 'malicmoan@gbox.adnu.edu.ph'::text, 'rcid@gbox.adnu.edu.ph'::text, 'sabernal@gbox.adnu.edu.ph'::text, 'gatalbo@gbox.adnu.edu.ph'::text, 'jedevera@gbox.adnu.edu.ph'::text, 'mabagasbas@gbox.adnu.edu.ph'::text, 'jfmendoza@gbox.adnu.edu.ph'::text, 'jmreantazo@gbox.adnu.edu.ph'::text, 'bcobilla@gbox.adnu.edu.ph'::text, 'johmendoza@gbox.adnu.edu.ph'::text])));
  end if;
end $$;
