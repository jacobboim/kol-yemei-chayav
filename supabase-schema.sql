-- Run this in the Supabase SQL Editor (supabase.com → your project → SQL Editor)

create table if not exists progress (
  id            uuid        default gen_random_uuid() primary key,
  user_id       uuid        references auth.users not null,
  chelek_id     text        not null,           -- 'OC' | 'YD' | 'EH' | 'CM'
  current_siman integer     not null default 1,
  current_seif_pair integer not null default 1,
  completed     jsonb       not null default '{}', -- { "1": [1,2], "3": [1,2] }
  updated_at    timestamptz default now(),
  unique (user_id, chelek_id)
);

-- Row Level Security: users can only touch their own rows
alter table progress enable row level security;

create policy "Users manage own progress"
  on progress for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-bump updated_at on every write
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger progress_updated_at
  before update on progress
  for each row execute function update_updated_at();

-- User-level app preferences (layout, etc.)
create table if not exists user_settings (
  user_id      uuid primary key references auth.users,
  layout       text        not null default 'accordion',
  updated_at   timestamptz default now()
);

alter table user_settings enable row level security;

create policy "Users manage own settings"
  on user_settings for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger user_settings_updated_at
  before update on user_settings
  for each row execute function update_updated_at();

-- Migration: add theme / font columns (run once against an existing DB)
alter table user_settings
  add column if not exists color_theme  text    not null default 'ocean',
  add column if not exists dark_mode    boolean not null default false,
  add column if not exists hebrew_font  text    not null default 'frank-ruhl';
