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

create index if not exists relationship_claims_key_idx on relationship_claims (relationship_key);
create index if not exists relationship_claims_status_idx on relationship_claims (status);
create index if not exists community_flags_target_idx on community_flags (target_handle);

alter table relationship_claims enable row level security;
alter table community_flags enable row level security;

drop policy if exists "public can read claims" on relationship_claims;
create policy "public can read claims" on relationship_claims for select using (true);

drop policy if exists "public can insert claims" on relationship_claims;
create policy "public can insert claims" on relationship_claims for insert with check (true);

drop policy if exists "public can update claims" on relationship_claims;
create policy "public can update claims" on relationship_claims for update using (true) with check (true);

drop policy if exists "public can read flags" on community_flags;
create policy "public can read flags" on community_flags for select using (true);

drop policy if exists "public can insert flags" on community_flags;
create policy "public can insert flags" on community_flags for insert with check (true);
