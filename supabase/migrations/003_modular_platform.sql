alter table public.challenge_modules
  add column if not exists description text not null default '',
  add column if not exists icon text not null default '♣',
  add column if not exists category text not null default 'consumption'
    check (category in ('energy', 'water', 'waste', 'food', 'transport', 'consumption'));

update public.challenge_modules
set description = 'Reduce cooling when shared spaces are empty.', icon = '❄', category = 'energy', supported_scopes = array['residence','university']
where key = 'idle-ac';

create table public.user_habit_preferences (
  user_id uuid not null references auth.users on delete cascade,
  module_key text not null references public.challenge_modules on delete cascade,
  enabled boolean not null default true,
  notifications_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, module_key)
);

create table public.challenge_metric_points (
  id bigint generated always as identity primary key,
  challenge_id uuid not null references public.challenges on delete cascade,
  scope_type text not null check (scope_type in ('floor', 'residence', 'university')),
  scope_id uuid not null,
  metric_key text not null,
  label text not null,
  value numeric not null,
  comparison_value numeric,
  recorded_at timestamptz not null default now(),
  unique (challenge_id, scope_type, scope_id, metric_key, recorded_at)
);
create index challenge_metric_points_lookup_idx on public.challenge_metric_points
  (challenge_id, scope_type, scope_id, metric_key, recorded_at);

alter table public.reward_campaigns
  add column if not exists enrollment_capacity integer check (enrollment_capacity > 0),
  add column if not exists redemption_starts_at timestamptz,
  add column if not exists redemption_ends_at timestamptz;

create table public.reward_redeemer_scopes (
  user_id uuid not null references auth.users on delete cascade,
  university_id uuid not null references public.universities on delete cascade,
  residence_id uuid references public.residences on delete cascade,
  label text not null,
  active boolean not null default true,
  primary key (user_id, university_id)
);

create table private.reward_redemption_tokens (
  id uuid primary key default gen_random_uuid(),
  issuance_id uuid not null references public.reward_issuances on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  issuance_id uuid not null unique references public.reward_issuances,
  redeemer_id uuid not null references auth.users,
  redeemed_at timestamptz not null default now()
);

alter table public.user_habit_preferences enable row level security;
alter table public.challenge_metric_points enable row level security;
alter table public.reward_redeemer_scopes enable row level security;
alter table public.reward_redemptions enable row level security;

create policy own_habit_preferences on public.user_habit_preferences
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy eligible_metric_points on public.challenge_metric_points
  for select to authenticated using (
    exists (select 1 from public.challenges c where c.id = challenge_id and (
      public.is_university_admin(c.university_id)
      or exists (select 1 from public.challenge_rosters cr where cr.challenge_id = c.id and cr.user_id = (select auth.uid()))
    ))
  );

create policy own_redeemer_scope on public.reward_redeemer_scopes
  for select to authenticated using (user_id = (select auth.uid()) or public.is_university_admin(university_id));

create policy redemption_parties_read on public.reward_redemptions
  for select to authenticated using (
    redeemer_id = (select auth.uid()) or exists (
      select 1 from public.reward_issuances i where i.id = issuance_id and i.user_id = (select auth.uid())
    )
  );

grant select, insert, update on public.user_habit_preferences to authenticated;
grant select on public.challenge_metric_points, public.reward_redeemer_scopes, public.reward_redemptions to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.set_my_habit_preferences(module_keys text[])
returns void language plpgsql security definer set search_path = public
as $$
begin
  insert into public.user_habit_preferences (user_id, module_key, enabled, notifications_enabled)
  select auth.uid(), m.key, m.key = any(module_keys), m.key = any(module_keys)
  from public.challenge_modules m where m.enabled
  on conflict (user_id, module_key) do update
  set enabled = excluded.enabled, notifications_enabled = excluded.notifications_enabled, updated_at = now();

  update public.profiles set onboarding_complete = true, updated_at = now() where id = auth.uid();
end
$$;
grant execute on function public.set_my_habit_preferences(text[]) to authenticated;

create or replace function public.join_challenge(target_challenge uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare selected public.challenges; campaign public.reward_campaigns; member public.student_memberships; joined_count integer;
begin
  select * into selected from public.challenges where id = target_challenge for update;
  if selected is null or selected.status not in ('scheduled', 'active') then raise exception 'Challenge is not open'; end if;
  if now() >= selected.roster_locks_at then raise exception 'The roster is locked'; end if;
  select * into member from public.student_memberships where user_id = auth.uid();
  if member is null or member.university_id <> selected.university_id
     or (selected.residence_id is not null and member.residence_id <> selected.residence_id)
  then raise exception 'This challenge is not available to your team'; end if;
  if not exists (select 1 from public.user_habit_preferences where user_id = auth.uid() and module_key = selected.module_key and enabled)
  then raise exception 'Enable this habit before joining'; end if;

  select * into campaign from public.reward_campaigns where challenge_id = target_challenge and status = 'published';
  if campaign is not null and campaign.enrollment_capacity is not null then
    select count(*) into joined_count from public.challenge_rosters where challenge_id = target_challenge and eligible_for_reward;
    if joined_count >= campaign.enrollment_capacity then raise exception 'This challenge is full'; end if;
  end if;

  insert into public.challenge_rosters (challenge_id, user_id, floor_id)
  values (target_challenge, auth.uid(), member.floor_id) on conflict do nothing;
end
$$;
grant execute on function public.join_challenge(uuid) to authenticated;

create or replace function public.get_challenge_participation(target_challenge uuid)
returns table (checked_count bigint, roster_count bigint)
language sql security definer set search_path = public
as $$
  select
    count(*) filter (where dc.user_id is not null) as checked_count,
    count(*) as roster_count
  from public.challenge_rosters cr
  left join public.daily_commitments dc on dc.challenge_id = cr.challenge_id
    and dc.user_id = cr.user_id and dc.commitment_date = current_date
  where cr.challenge_id = target_challenge
    and exists (select 1 from public.challenge_rosters mine where mine.challenge_id = target_challenge and mine.user_id = auth.uid())
$$;
grant execute on function public.get_challenge_participation(uuid) to authenticated;

create or replace function public.get_challenge_league(target_challenge uuid)
returns table (scope_id uuid, scope_label text, score numeric, participant_count bigint, commitment_count bigint)
language sql security definer set search_path = public
as $$
  select ps.scope_id as scope_id, f.name as scope_label,
    coalesce((ps.display_metrics ->> 'saved_percent')::numeric, 0) as score,
    count(distinct cr.user_id) as participant_count,
    count(distinct dc.user_id) as commitment_count
  from public.progress_snapshots ps
  join public.floors f on f.id = ps.scope_id
  join public.challenge_rosters cr on cr.challenge_id = ps.challenge_id and cr.floor_id = ps.scope_id
  left join public.daily_commitments dc on dc.challenge_id = cr.challenge_id and dc.user_id = cr.user_id and dc.commitment_date = current_date
  where ps.challenge_id = target_challenge and ps.scope_type = 'floor'
    and exists (select 1 from public.challenge_rosters mine where mine.challenge_id = target_challenge and mine.user_id = auth.uid())
    and ps.recorded_at = (select max(latest.recorded_at) from public.progress_snapshots latest where latest.challenge_id = ps.challenge_id and latest.scope_id = ps.scope_id)
  group by ps.scope_id, f.name, ps.display_metrics
  having count(distinct cr.user_id) >= 5
  order by score desc
$$;
grant execute on function public.get_challenge_league(uuid) to authenticated;

drop function public.get_my_wallet();

create or replace function public.get_my_wallet()
returns table (
  issuance_id uuid, reward_item_id uuid, challenge_title text, title text, description text,
  display_value text, color text, expires_at timestamptz, revealed_at timestamptz, redeemed_at timestamptz
) language sql security definer set search_path = public, private
as $$
  select i.id, case when i.revealed_at is not null then ri.id end, c.title,
    case when i.revealed_at is not null then ri.title else 'Reward ready' end,
    case when i.revealed_at is not null then ri.description else 'Reveal to see what you unlocked.' end,
    case when i.revealed_at is not null then ri.display_value else '?' end,
    case when i.revealed_at is not null then ri.color else '#F7F5ED' end,
    ri.expires_at, i.revealed_at, inv.redeemed_at
  from public.reward_issuances i
  join public.reward_items ri on ri.id = i.reward_item_id
  join public.reward_campaigns rc on rc.id = i.campaign_id
  join public.challenges c on c.id = rc.challenge_id
  join private.reward_inventory inv on inv.id = i.inventory_id
  where i.user_id = auth.uid()
  order by i.issued_at desc
$$;

create or replace function private.consume_redemption_token(raw_token text, acting_user uuid)
returns text language plpgsql security definer set search_path = public, private, extensions
as $$
declare selected private.reward_redemption_tokens; issuance public.reward_issuances; campaign public.reward_campaigns;
begin
  select * into selected from private.reward_redemption_tokens
  where token_hash = encode(digest(raw_token, 'sha256'), 'hex')
  for update;
  if selected is null or selected.consumed_at is not null or selected.expires_at <= now() then raise exception 'This redemption code is invalid or expired'; end if;
  select * into issuance from public.reward_issuances where id = selected.issuance_id;
  select * into campaign from public.reward_campaigns where id = issuance.campaign_id;
  if not exists (select 1 from public.reward_redeemer_scopes s where s.user_id = acting_user and s.university_id = campaign.university_id and s.active)
     and not public.is_university_admin(campaign.university_id)
  then raise exception 'Not authorized to redeem this reward'; end if;
  if campaign.redemption_starts_at is not null and now() < campaign.redemption_starts_at then raise exception 'Redemption has not started'; end if;
  if campaign.redemption_ends_at is not null and now() > campaign.redemption_ends_at then raise exception 'This reward has expired'; end if;

  update private.reward_redemption_tokens set consumed_at = now() where id = selected.id;
  update private.reward_inventory set redeemed_at = now() where id = issuance.inventory_id and redeemed_at is null;
  if not found then raise exception 'This reward was already redeemed'; end if;
  insert into public.reward_redemptions (issuance_id, redeemer_id) values (issuance.id, acting_user);
  return 'Reward redeemed';
end
$$;

create policy university_admin_challenge_write on public.challenges for all to authenticated
  using (public.is_university_admin(university_id)) with check (public.is_university_admin(university_id));
create policy university_admin_campaign_write on public.reward_campaigns for all to authenticated
  using (public.is_university_admin(university_id)) with check (public.is_university_admin(university_id));
create policy university_admin_reward_item_write on public.reward_items for all to authenticated
  using (exists (select 1 from public.reward_campaigns rc where rc.id = campaign_id and public.is_university_admin(rc.university_id)))
  with check (exists (select 1 from public.reward_campaigns rc where rc.id = campaign_id and public.is_university_admin(rc.university_id)));

grant insert, update, delete on public.challenges, public.reward_campaigns, public.reward_items to authenticated;
