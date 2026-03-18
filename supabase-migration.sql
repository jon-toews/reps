-- Run this in your Supabase SQL editor to migrate from the old schema to the new one.
-- This preserves your existing sessions and sets data.

-- 1. Create enums
create type session_type_enum as enum ('push', 'pull', 'legs', 'other');
create type muscle_group_enum as enum (
  'upper_chest', 'lower_chest',
  'front_delt', 'side_delt', 'rear_delt',
  'upper_back', 'lats', 'lower_back',
  'biceps', 'triceps', 'forearms',
  'quads', 'hamstrings', 'glutes', 'calves',
  'abs', 'obliques',
  'neck', 'traps'
);

-- 2. Create programs table (new)
create table programs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users not null,
  name           text not null,
  session_type   session_type_enum not null,
  gym_tag        text,
  exercise_order uuid[] not null default '{}',
  created_at     timestamptz default now()
);
alter table programs enable row level security;
create policy "programs: own rows" on programs for all using (auth.uid() = user_id);

-- 3. Add new columns to exercises
alter table exercises
  add column if not exists muscle_group             muscle_group_enum,
  add column if not exists is_unilateral            boolean not null default false,
  add column if not exists is_equipment_dependent   boolean not null default false,
  add column if not exists default_weight_increment numeric not null default 2.5,
  add column if not exists default_starting_weight  numeric,
  add column if not exists notes                    text;

-- 4. Add new columns to sessions
alter table sessions
  add column if not exists session_type session_type_enum,
  add column if not exists gym_tag      text,
  add column if not exists program_id   uuid references programs,
  add column if not exists ended_at     timestamptz;

-- Copy existing completed_at → ended_at, then drop old columns
update sessions set ended_at = completed_at where completed_at is not null;
alter table sessions
  drop column if exists completed_at,
  drop column if exists name,
  drop column if exists template_id;

-- 5. Add new columns to sets
alter table sets
  add column if not exists reps_left  int,
  add column if not exists reps_right int,
  add column if not exists tags       text[] not null default '{}',
  add column if not exists is_sub     boolean not null default false;

-- Copy existing reps → reps_left, then drop old column
update sets set reps_left = reps where reps is not null;
alter table sets drop column if exists reps;
