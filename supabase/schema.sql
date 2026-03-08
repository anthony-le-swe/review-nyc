create extension if not exists pgcrypto;

create table if not exists relationship_claims (
  id uuid primary key default gen_random_uuid(),
  claim_code text not null unique,
  claimer_handle text not null,
  partner_handle text not null,
  relationship_key text not null,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  proof_url text,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

create table if not exists community_flags (
  id uuid primary key default gen_random_uuid(),
  target_handle text not null,
  category text not null check (category in ('taken-claim', 'ghosting', 'scam-risk')),
  detail text not null,
  evidence_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists relationship_claims (
  id uuid primary key default gen_random_uuid(),
  claimer_user_id text not null,
  claimed_partner_contact_hash text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected', 'expired')),
  verification_token_hash text not null,
  review_payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table reviews enable row level security;
alter table auth_reports enable row level security;
alter table relationship_claims enable row level security;

-- Demo policy: ai cũng đọc/ghi để MVP chạy nhanh (cần siết lại khi production)
drop policy if exists "public can read reviews" on reviews;
create policy "public can read reviews" on reviews for select using (true);

drop policy if exists "public can insert reviews" on reviews;
create policy "public can insert reviews" on reviews for insert with check (true);

drop policy if exists "public can read auth reports" on auth_reports;
create policy "public can read auth reports" on auth_reports for select using (true);

alter table relationship_claims enable row level security;
alter table community_flags enable row level security;

drop policy if exists "public can read claims" on relationship_claims;
create policy "public can read claims" on relationship_claims for select using (true);

drop policy if exists "public can read relationship claims" on relationship_claims;
create policy "public can read relationship claims" on relationship_claims for select using (true);

drop policy if exists "public can insert relationship claims" on relationship_claims;
create policy "public can insert relationship claims" on relationship_claims for insert with check (true);

drop policy if exists "public can update relationship claims" on relationship_claims;
create policy "public can update relationship claims" on relationship_claims for update using (true) with check (true);


drop policy if exists "public can update claims" on relationship_claims;
create policy "public can update claims" on relationship_claims for update using (true) with check (true);

drop policy if exists "public can read flags" on community_flags;
create policy "public can read flags" on community_flags for select using (true);

-- Chặn báo cáo trùng quá dày: cùng profile + verdict + nội dung lý do trong cùng một ngày.
create unique index if not exists auth_reports_unique_daily_report
  on auth_reports (normalized_profile_url, verdict, reason_hash, created_day);

create index if not exists relationship_claims_pending_expires_idx
  on relationship_claims (status, expires_at);
