create extension if not exists pgcrypto;

create type public.approval_status as enum ('pending', 'approved', 'rejected');
create type public.org_role as enum ('university_admin', 'residence_admin');
create type public.challenge_status as enum ('draft', 'scheduled', 'active', 'finalizing', 'completed', 'cancelled');
create type public.reward_mode as enum ('fixed_all', 'weighted_guaranteed');

create table public.universities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status public.approval_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.residences (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities on delete cascade,
  name text not null,
  status public.approval_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (university_id, name)
);

create table public.floors (
  id uuid primary key default gen_random_uuid(),
  residence_id uuid not null references public.residences on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (residence_id, name)
);

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references auth.users,
  kind text not null check (kind in ('university', 'residence')),
  university_id uuid references public.universities,
  proposed_name text not null,
  evidence jsonb not null default '{}'::jsonb,
  status public.approval_status not null default 'pending',
  reviewed_by uuid references auth.users,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.organization_memberships (
  user_id uuid not null references auth.users on delete cascade,
  university_id uuid not null references public.universities on delete cascade,
  residence_id uuid references public.residences on delete cascade,
  role public.org_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, university_id, role)
);

create table public.student_memberships (
  user_id uuid primary key references auth.users on delete cascade,
  university_id uuid not null references public.universities,
  residence_id uuid not null references public.residences,
  floor_id uuid not null references public.floors,
  verified_at timestamptz not null default now()
);

create table public.join_codes (
  id uuid primary key default gen_random_uuid(),
  residence_id uuid not null references public.residences on delete cascade,
  code_hash text not null unique,
  expires_at timestamptz not null,
  max_uses integer not null check (max_uses > 0),
  uses integer not null default 0 check (uses >= 0),
  revoked_at timestamptz,
  created_by uuid not null references auth.users,
  created_at timestamptz not null default now()
);

create table public.challenge_modules (
  key text primary key,
  version integer not null check (version > 0),
  label text not null,
  supported_scopes text[] not null,
  enabled boolean not null default true
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities,
  residence_id uuid references public.residences,
  module_key text not null references public.challenge_modules,
  title text not null,
  subtitle text not null,
  scope text not null check (scope in ('individual', 'floor', 'residence', 'university')),
  configuration jsonb not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  roster_locks_at timestamptz not null,
  status public.challenge_status not null default 'draft',
  created_by uuid not null references auth.users,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (roster_locks_at between starts_at and ends_at)
);

create table public.challenge_rosters (
  challenge_id uuid not null references public.challenges on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  floor_id uuid references public.floors,
  eligible_for_reward boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

create table public.progress_snapshots (
  id bigint generated always as identity primary key,
  challenge_id uuid not null references public.challenges on delete cascade,
  scope_type text not null check (scope_type in ('floor', 'residence', 'university')),
  scope_id uuid not null,
  current_value numeric not null,
  target_value numeric not null check (target_value > 0),
  unit text not null,
  verified boolean not null default true,
  display_metrics jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now()
);
create index progress_latest_idx on public.progress_snapshots (challenge_id, scope_type, scope_id, recorded_at desc);

create table public.daily_commitments (
  challenge_id uuid not null references public.challenges on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  commitment_date date not null,
  created_at timestamptz not null default now(),
  primary key (challenge_id, user_id, commitment_date)
);

create table public.reward_campaigns (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null unique references public.challenges on delete cascade,
  university_id uuid not null references public.universities,
  mode public.reward_mode not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'allocated', 'cancelled')),
  allocated_at timestamptz,
  created_by uuid not null references auth.users,
  created_at timestamptz not null default now()
);

create table public.reward_items (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.reward_campaigns on delete cascade,
  title text not null,
  description text not null,
  display_value text not null,
  color text not null default '#73E6AF',
  weight integer not null check (weight >= 0 and weight <= 100),
  expires_at timestamptz
);

create schema if not exists private;
revoke all on schema private from anon, authenticated;

create table private.reward_inventory (
  id uuid primary key default gen_random_uuid(),
  reward_item_id uuid not null references public.reward_items on delete cascade,
  secret_code text not null,
  claimed_by uuid references auth.users,
  claimed_at timestamptz,
  redeemed_at timestamptz,
  unique (reward_item_id, secret_code)
);

create table public.reward_issuances (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.reward_campaigns,
  reward_item_id uuid not null references public.reward_items,
  user_id uuid not null references auth.users,
  inventory_id uuid not null unique references private.reward_inventory,
  issued_at timestamptz not null default now(),
  revealed_at timestamptz,
  unique (campaign_id, user_id)
);

create table public.inbox_events (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities,
  residence_id uuid references public.residences,
  challenge_id uuid references public.challenges,
  title text not null,
  body text not null,
  kind text not null,
  created_at timestamptz not null default now()
);

create table public.inbox_reads (
  event_id uuid not null references public.inbox_events on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  read_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table public.energy_meters (
  id uuid primary key default gen_random_uuid(),
  residence_id uuid not null references public.residences,
  floor_id uuid references public.floors,
  external_id text not null unique,
  active boolean not null default true
);

create table public.energy_readings (
  id bigint generated always as identity primary key,
  meter_id uuid not null references public.energy_meters,
  recorded_at timestamptz not null,
  interval_minutes integer not null check (interval_minutes > 0),
  total_kwh numeric not null check (total_kwh >= 0),
  ac_kwh numeric not null check (ac_kwh >= 0),
  occupancy_ratio numeric check (occupancy_ratio between 0 and 1),
  outdoor_temp_c numeric,
  idempotency_key text not null unique,
  source text not null default 'simulator'
);
create index energy_readings_meter_time_idx on public.energy_readings (meter_id, recorded_at desc);

create table public.energy_baseline_models (
  id uuid primary key default gen_random_uuid(),
  meter_id uuid not null references public.energy_meters,
  version integer not null,
  training_started_at timestamptz not null,
  training_ended_at timestamptz not null,
  coefficients jsonb not null,
  mean_absolute_error numeric not null,
  created_at timestamptz not null default now(),
  unique (meter_id, version)
);

create table public.energy_expected_intervals (
  challenge_id uuid not null references public.challenges on delete cascade,
  meter_id uuid not null references public.energy_meters,
  baseline_model_id uuid not null references public.energy_baseline_models,
  interval_at timestamptz not null,
  expected_ac_kwh numeric not null check (expected_ac_kwh >= 0),
  primary key (challenge_id, meter_id, interval_at)
);

insert into public.challenge_modules (key, version, label, supported_scopes)
values ('idle-ac', 1, 'Idle air-conditioning', array['floor', 'residence', 'university']);

create or replace function public.is_university_admin(target_university uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.organization_memberships
  where user_id = auth.uid() and university_id = target_university and role = 'university_admin'
) $$;

create or replace function public.is_residence_admin(target_residence uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.organization_memberships
  where user_id = auth.uid() and residence_id = target_residence and role in ('residence_admin', 'university_admin')
) $$;

create or replace function public.redeem_join_code(raw_code text, target_floor uuid)
returns public.student_memberships
language plpgsql security definer set search_path = public, extensions
as $$
declare selected_code public.join_codes; selected_floor public.floors; result public.student_memberships;
begin
  select * into selected_floor from public.floors where id = target_floor;
  if selected_floor is null then raise exception 'Unknown floor'; end if;
  select * into selected_code from public.join_codes
    where residence_id = selected_floor.residence_id
      and code_hash = encode(digest(upper(trim(raw_code)), 'sha256'), 'hex')
      and revoked_at is null and expires_at > now() and uses < max_uses
    for update;
  if selected_code is null then raise exception 'Invalid or expired join code'; end if;
  update public.join_codes set uses = uses + 1 where id = selected_code.id;
  insert into public.student_memberships (user_id, university_id, residence_id, floor_id)
  select auth.uid(), r.university_id, r.id, selected_floor.id
  from public.residences r where r.id = selected_floor.residence_id
  on conflict (user_id) do update set university_id = excluded.university_id,
    residence_id = excluded.residence_id, floor_id = excluded.floor_id, verified_at = now()
  returning * into result;
  return result;
end $$;

create or replace function public.get_my_wallet()
returns table (
  issuance_id uuid, title text, description text, display_value text,
  color text, secret_code text, expires_at timestamptz, revealed_at timestamptz, redeemed_at timestamptz
) language sql security definer set search_path = public, private
as $$
  select i.id, ri.title, ri.description, ri.display_value, ri.color, inv.secret_code,
    ri.expires_at, i.revealed_at, inv.redeemed_at
  from public.reward_issuances i
  join public.reward_items ri on ri.id = i.reward_item_id
  join private.reward_inventory inv on inv.id = i.inventory_id
  where i.user_id = auth.uid()
  order by i.issued_at desc
$$;

alter table public.universities enable row level security;
alter table public.residences enable row level security;
alter table public.floors enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_applications enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.student_memberships enable row level security;
alter table public.join_codes enable row level security;
alter table public.challenge_modules enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_rosters enable row level security;
alter table public.progress_snapshots enable row level security;
alter table public.daily_commitments enable row level security;
alter table public.reward_campaigns enable row level security;
alter table public.reward_items enable row level security;
alter table public.reward_issuances enable row level security;
alter table public.inbox_events enable row level security;
alter table public.inbox_reads enable row level security;
alter table public.energy_meters enable row level security;
alter table public.energy_readings enable row level security;
alter table public.energy_baseline_models enable row level security;
alter table public.energy_expected_intervals enable row level security;

create policy approved_universities_read on public.universities for select to authenticated using (status = 'approved' or public.is_university_admin(id));
create policy approved_residences_read on public.residences for select to authenticated using (status = 'approved' or public.is_university_admin(university_id));
create policy floors_read on public.floors for select to authenticated using (
  exists (select 1 from public.residences r where r.id = residence_id and r.status = 'approved')
);
create policy own_profile on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy own_application_read on public.organization_applications for select to authenticated using (
  applicant_id = auth.uid() or (university_id is not null and public.is_university_admin(university_id))
);
create policy own_application_insert on public.organization_applications for insert to authenticated with check (applicant_id = auth.uid());
create policy own_org_memberships on public.organization_memberships for select to authenticated using (user_id = auth.uid());
create policy own_student_membership on public.student_memberships for select to authenticated using (user_id = auth.uid());
create policy modules_read on public.challenge_modules for select to authenticated using (enabled);
create policy eligible_challenges_read on public.challenges for select to authenticated using (
  public.is_university_admin(university_id)
  or (residence_id is not null and public.is_residence_admin(residence_id))
  or exists (select 1 from public.student_memberships sm where sm.user_id = auth.uid() and sm.university_id = challenges.university_id and (challenges.residence_id is null or sm.residence_id = challenges.residence_id))
);
create policy own_roster_read on public.challenge_rosters for select to authenticated using (
  user_id = auth.uid() or exists (select 1 from public.challenges c where c.id = challenge_id and public.is_university_admin(c.university_id))
);
create policy eligible_progress_read on public.progress_snapshots for select to authenticated using (
  exists (select 1 from public.challenges c where c.id = challenge_id and (
    public.is_university_admin(c.university_id)
    or exists (select 1 from public.student_memberships sm where sm.user_id = auth.uid() and sm.university_id = c.university_id and (c.residence_id is null or sm.residence_id = c.residence_id))
  ))
);
create policy own_commitments_read on public.daily_commitments for select to authenticated using (user_id = auth.uid());
create policy own_commitments_insert on public.daily_commitments for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from public.challenge_rosters cr where cr.challenge_id = daily_commitments.challenge_id and cr.user_id = auth.uid())
);
create policy eligible_rewards_read on public.reward_campaigns for select to authenticated using (
  public.is_university_admin(university_id) or exists (select 1 from public.challenge_rosters cr where cr.challenge_id = reward_campaigns.challenge_id and cr.user_id = auth.uid())
);
create policy reward_items_read on public.reward_items for select to authenticated using (
  exists (select 1 from public.reward_campaigns rc where rc.id = campaign_id and (
    public.is_university_admin(rc.university_id) or exists (select 1 from public.challenge_rosters cr where cr.challenge_id = rc.challenge_id and cr.user_id = auth.uid())
  ))
);
create policy own_issuances_read on public.reward_issuances for select to authenticated using (user_id = auth.uid());
create policy inbox_scope_read on public.inbox_events for select to authenticated using (
  public.is_university_admin(university_id) or exists (select 1 from public.student_memberships sm where sm.user_id = auth.uid() and sm.university_id = inbox_events.university_id and (inbox_events.residence_id is null or sm.residence_id = inbox_events.residence_id))
);
create policy own_inbox_reads on public.inbox_reads for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant usage on schema public to authenticated;
grant select on public.universities, public.residences, public.floors, public.challenge_modules,
  public.challenges, public.challenge_rosters, public.progress_snapshots, public.reward_campaigns,
  public.reward_items, public.reward_issuances, public.inbox_events to authenticated;
grant select, update on public.profiles to authenticated;
grant insert, select on public.organization_applications to authenticated;
grant select on public.organization_memberships, public.student_memberships to authenticated;
grant select, insert on public.daily_commitments, public.inbox_reads to authenticated;
grant execute on function public.redeem_join_code(text, uuid) to authenticated;
grant execute on function public.get_my_wallet() to authenticated;
revoke all on public.join_codes, public.energy_meters, public.energy_readings,
  public.energy_baseline_models, public.energy_expected_intervals from anon, authenticated;
