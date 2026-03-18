-- Run this in your Supabase SQL editor

-- Enums
create type muscle_group_enum as enum (
  'upper_chest', 'lower_chest',
  'front_delt', 'side_delt', 'rear_delt',
  'upper_back', 'lats', 'lower_back',
  'biceps', 'triceps', 'forearms',
  'quads', 'hamstrings', 'glutes', 'calves',
  'abs', 'obliques',
  'neck', 'traps'
);

-- Programs (named exercise templates)
create table programs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users not null,
  name           text not null,
  exercise_order uuid[] not null default '{}',
  created_at     timestamptz default now()
);

-- User exercises
create table exercises (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid references auth.users not null,
  name                     text not null,
  muscle_group             muscle_group_enum,
  is_unilateral            boolean not null default false,
  is_equipment_dependent   boolean not null default false,
  default_weight_increment numeric not null default 2.5,
  default_starting_weight  numeric,
  notes                    text,
  created_at               timestamptz default now()
);

-- Workout sessions
create table sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users not null,
  name         text,
  gym_tag      text,
  program_id   uuid references programs,
  started_at   timestamptz default now(),
  ended_at     timestamptz
);

-- Individual sets
create table sets (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references sessions not null,
  exercise_id uuid references exercises not null,
  user_id     uuid references auth.users not null,
  order_index int not null,
  weight      numeric,
  reps_left   int,
  reps_right  int,
  tags        text[] not null default '{}',
  is_sub      boolean not null default false,
  rir         smallint,
  notes       text,
  created_at  timestamptz default now()
);

-- Row Level Security
alter table programs  enable row level security;
alter table exercises enable row level security;
alter table sessions  enable row level security;
alter table sets      enable row level security;

create policy "programs: own rows"  on programs  for all using (auth.uid() = user_id);
create policy "exercises: own rows" on exercises for all using (auth.uid() = user_id);
create policy "sessions: own rows"  on sessions  for all using (auth.uid() = user_id);
create policy "sets: own rows"      on sets      for all using (auth.uid() = user_id);
