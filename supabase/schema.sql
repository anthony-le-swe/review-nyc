create extension if not exists pgcrypto;

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null,
  start_year int not null check (start_year >= 1990),
  end_year int not null check (end_year >= start_year),
  sentiment text not null check (sentiment in ('positive', 'neutral', 'negative')),
  score int not null check (score between 1 and 5),
  proof text not null,
  proof_url text not null,
  review text not null,
  negative_evidence text,
  created_at timestamptz not null default now()
);

create table if not exists auth_reports (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('facebook', 'instagram')),
  display_name text,
  profile_url text not null,
  normalized_profile_url text not null,
  verdict text not null check (verdict in ('real', 'fake', 'unclear')),
  confidence int not null check (confidence between 1 and 5),
  reason text not null,
  reason_hash text generated always as (md5(reason)) stored,
  evidence_url text not null,
  upvotes int not null default 0,
  downvotes int not null default 0,
  created_at timestamptz not null default now(),
  created_day date generated always as (created_at::date) stored
);

alter table reviews enable row level security;
alter table auth_reports enable row level security;

-- Demo policy: ai cũng đọc/ghi để MVP chạy nhanh (cần siết lại khi production)
drop policy if exists "public can read reviews" on reviews;
create policy "public can read reviews" on reviews for select using (true);

drop policy if exists "public can insert reviews" on reviews;
create policy "public can insert reviews" on reviews for insert with check (true);

drop policy if exists "public can read auth reports" on auth_reports;
create policy "public can read auth reports" on auth_reports for select using (true);

drop policy if exists "public can insert auth reports" on auth_reports;
create policy "public can insert auth reports" on auth_reports for insert with check (true);

drop policy if exists "public can update auth reports" on auth_reports;
create policy "public can update auth reports" on auth_reports for update using (true) with check (true);


-- Backward-compatible migrations for existing deployments.
alter table if exists auth_reports
  add column if not exists reason_hash text generated always as (md5(reason)) stored;

alter table if exists auth_reports
  add column if not exists created_day date generated always as (created_at::date) stored;

-- Chặn báo cáo trùng quá dày: cùng profile + verdict + nội dung lý do trong cùng một ngày.
create unique index if not exists auth_reports_unique_daily_report
  on auth_reports (normalized_profile_url, verdict, reason_hash, created_day);
