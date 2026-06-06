-- ============================================================
-- SEO Platform — Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- Sites (one row per website)
create table public.sites (
  id          uuid primary key default gen_random_uuid(),
  domain      text unique not null,
  name        text not null,
  db          text not null default 'be',   -- SEMrush database code
  wp_url      text,                          -- WordPress REST API base URL
  wp_user     text,                          -- WordPress username
  wp_app_pass text,                          -- WordPress application password
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Monthly SEO metrics (from SEMrush domain_rank_history)
create table public.metrics_monthly (
  id                 uuid primary key default gen_random_uuid(),
  site_id            uuid not null references public.sites(id) on delete cascade,
  month              date not null,          -- always first of month: 2026-05-01
  semrush_rank       integer,
  organic_keywords   integer,
  organic_traffic    integer,
  organic_cost       integer,               -- traffic value in €
  adwords_keywords   integer,
  adwords_traffic    integer,
  adwords_cost       integer,
  synced_at          timestamptz not null default now(),
  unique(site_id, month)
);

-- Current keyword rankings (refreshed on every sync)
create table public.keywords_current (
  id             uuid primary key default gen_random_uuid(),
  site_id        uuid not null references public.sites(id) on delete cascade,
  keyword        text not null,
  position       integer,
  prev_position  integer,
  search_volume  integer,
  cpc            numeric(10,2),
  traffic_pct    numeric(8,4),
  url            text,
  synced_at      timestamptz not null default now(),
  unique(site_id, keyword)
);

-- SEO change requests + approval workflow
create table public.seo_changes (
  id           uuid primary key default gen_random_uuid(),
  site_id      uuid not null references public.sites(id) on delete cascade,
  page_url     text not null,
  field        text not null,              -- 'meta_title' | 'meta_description' | 'focus_keyword'
  old_value    text,
  new_value    text not null,
  reason       text,
  status       text not null default 'pending',  -- pending | approved | rejected | applied
  created_by   text,
  reviewed_by  text,
  reviewed_at  timestamptz,
  applied_at   timestamptz,
  created_at   timestamptz not null default now()
);

-- ── Row Level Security ────────────────────────────────────────

alter table public.sites            enable row level security;
alter table public.metrics_monthly  enable row level security;
alter table public.keywords_current enable row level security;
alter table public.seo_changes      enable row level security;

-- Authenticated users can read all data
create policy "read_authenticated" on public.sites
  for select to authenticated using (true);

create policy "read_authenticated" on public.metrics_monthly
  for select to authenticated using (true);

create policy "read_authenticated" on public.keywords_current
  for select to authenticated using (true);

create policy "read_authenticated" on public.seo_changes
  for select to authenticated using (true);

-- Authenticated users can manage change requests
create policy "insert_authenticated" on public.seo_changes
  for insert to authenticated with check (true);

create policy "update_authenticated" on public.seo_changes
  for update to authenticated using (true);

-- service_role (sync script) bypasses RLS automatically

-- ── Seed: add your sites here ─────────────────────────────────

insert into public.sites (domain, name, db)
values
  ('hypotheekwinkel.be', 'Hypotheekwinkel', 'be');

-- Add more sites later:
-- insert into public.sites (domain, name, db) values ('site2.be', 'Site 2', 'be');
