-- ============================================================
-- Shulchan Aruch text tables
-- Run in Supabase SQL Editor AFTER supabase-schema.sql
-- ============================================================

-- Siman-level metadata (needed for navigation — seifCount per siman)
create table if not exists simanim (
  chelek_id   text not null,   -- 'OC' | 'YD' | 'EH' | 'CM'
  siman       int  not null,
  seif_count  int  not null,
  primary key (chelek_id, siman)
);

-- All text: one row per source (SA or commentary) per seif
-- source_id = 'sa' for Shulchan Aruch, or commentary id ('bg', 'mb', etc.)
create table if not exists seif_texts (
  chelek_id     text not null,
  siman         int  not null,
  seif          int  not null,
  source_id     text not null,   -- 'sa' | 'bg' | 'mb' | 'taz' | etc.
  source_name   text,
  source_hebrew text,
  he            text,
  en            text,
  ref           text,
  primary key (chelek_id, siman, seif, source_id)
);

-- Index for the primary query pattern: fetch all sources for N seifim in a siman
create index if not exists seif_texts_siman_seif
  on seif_texts (chelek_id, siman, seif);

-- ── Row Level Security ─────────────────────────────────────
alter table simanim   enable row level security;
alter table seif_texts enable row level security;

-- Public read — no login required to read text
create policy "Public read simanim"
  on simanim for select using (true);

create policy "Public read seif_texts"
  on seif_texts for select using (true);
