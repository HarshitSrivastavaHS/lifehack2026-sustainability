-- Game progression, achievements, action logging, reward market, and analytics.
alter table public.profiles
  add column if not exists leaderboard_opt_in boolean not null default false,
  add column if not exists archived_at timestamptz;

alter table public.challenges
  add column if not exists challenge_kind text not null default 'community'
    check (challenge_kind in ('personal','daily','weekly','community','competitive')),
  add column if not exists cadence text not null default 'event'
    check (cadence in ('daily','weekly','event')),
  add column if not exists difficulty text not null default 'medium'
    check (difficulty in ('easy','medium','hard','epic')),
  add column if not exists xp_reward integer not null default 250 check (xp_reward >= 0),
  add column if not exists point_reward integer not null default 100 check (point_reward >= 0),
  add column if not exists featured boolean not null default false;

create table public.game_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  university_id uuid not null references public.universities on delete cascade,
  event_type text not null check (event_type in ('action','challenge_join','challenge_complete','achievement','reward_claim','admin_adjustment')),
  source_type text not null,
  source_id text not null,
  xp_delta integer not null default 0,
  points_delta integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  unique (user_id, event_type, source_type, source_id)
);
create index game_events_user_time_idx on public.game_events (user_id, occurred_at desc);
create index game_events_university_time_idx on public.game_events (university_id, occurred_at desc);

create table public.sustainable_action_types (
  key text primary key,
  university_id uuid references public.universities on delete cascade,
  title text not null,
  description text not null,
  category text not null check (category in ('energy','water','waste','transport','food','consumption')),
  icon text not null,
  unit text not null,
  xp_per_unit integer not null check (xp_per_unit >= 0),
  points_per_unit integer not null check (points_per_unit >= 0),
  daily_cap numeric not null check (daily_cap > 0),
  impact_per_unit jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.sustainable_action_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  university_id uuid not null references public.universities on delete cascade,
  action_key text not null references public.sustainable_action_types,
  quantity numeric not null check (quantity > 0),
  verification_source text not null default 'self_reported'
    check (verification_source in ('self_reported','sensor','integration','admin')),
  impact jsonb not null default '{}'::jsonb,
  logged_on date not null default current_date,
  created_at timestamptz not null default now()
);
create index sustainable_action_logs_user_date_idx on public.sustainable_action_logs (user_id, logged_on desc);

create table public.achievement_definitions (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities on delete cascade,
  key text not null,
  title text not null,
  description text not null,
  icon text not null,
  rarity text not null default 'common' check (rarity in ('common','rare','epic','legendary')),
  category text not null,
  requirement jsonb not null,
  xp_reward integer not null default 0 check (xp_reward >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique nulls not distinct (university_id, key)
);

create table public.user_achievements (
  achievement_id uuid not null references public.achievement_definitions on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  progress numeric not null default 1 check (progress >= 0),
  unlocked_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (achievement_id, user_id)
);

create table public.reward_offers (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities on delete cascade,
  title text not null,
  description text not null,
  icon text not null default '✦',
  color text not null default '#B8F34A',
  points_cost integer not null check (points_cost > 0),
  stock integer not null check (stock >= 0),
  active boolean not null default true,
  expires_at timestamptz,
  created_by uuid not null references auth.users,
  created_at timestamptz not null default now()
);

create table public.reward_claims (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.reward_offers,
  user_id uuid not null references auth.users,
  points_spent integer not null check (points_spent > 0),
  status text not null default 'claimed' check (status in ('claimed','fulfilled','cancelled')),
  claimed_at timestamptz not null default now(),
  fulfilled_at timestamptz
);
create index reward_claims_user_time_idx on public.reward_claims (user_id, claimed_at desc);

alter table public.game_events enable row level security;
alter table public.sustainable_action_types enable row level security;
alter table public.sustainable_action_logs enable row level security;
alter table public.achievement_definitions enable row level security;
alter table public.user_achievements enable row level security;
alter table public.reward_offers enable row level security;
alter table public.reward_claims enable row level security;

create policy own_game_events_read on public.game_events for select to authenticated using (user_id = auth.uid());
create policy action_types_read on public.sustainable_action_types for select to authenticated using (
  active and (university_id is null or exists (select 1 from public.student_memberships sm where sm.user_id = auth.uid() and sm.university_id = sustainable_action_types.university_id) or public.is_university_admin(university_id))
);
create policy own_action_logs_read on public.sustainable_action_logs for select to authenticated using (user_id = auth.uid());
create policy achievements_read on public.achievement_definitions for select to authenticated using (
  active and (university_id is null or exists (select 1 from public.student_memberships sm where sm.user_id = auth.uid() and sm.university_id = achievement_definitions.university_id) or public.is_university_admin(university_id))
);
create policy own_achievements_read on public.user_achievements for select to authenticated using (user_id = auth.uid());
create policy reward_offers_read on public.reward_offers for select to authenticated using (
  (active or public.is_university_admin(university_id)) and (public.is_university_admin(university_id) or exists (select 1 from public.student_memberships sm where sm.user_id = auth.uid() and sm.university_id = reward_offers.university_id))
);
create policy own_reward_claims_read on public.reward_claims for select to authenticated using (user_id = auth.uid() or exists (select 1 from public.reward_offers ro where ro.id = offer_id and public.is_university_admin(ro.university_id)));
create policy admin_achievement_write on public.achievement_definitions for all to authenticated
  using (university_id is not null and public.is_university_admin(university_id))
  with check (university_id is not null and public.is_university_admin(university_id));
create policy admin_reward_offer_write on public.reward_offers for all to authenticated
  using (public.is_university_admin(university_id)) with check (public.is_university_admin(university_id));

grant select on public.game_events, public.sustainable_action_types, public.sustainable_action_logs,
  public.achievement_definitions, public.user_achievements, public.reward_offers, public.reward_claims to authenticated;
grant insert, update, delete on public.achievement_definitions, public.reward_offers to authenticated;

insert into public.challenge_modules (key, version, label, supported_scopes, description, icon, category, enabled)
values
  ('active-transport', 1, 'Active transport', array['individual','floor','residence'], 'Walk or cycle instead of taking a car.', '↗', 'transport', true),
  ('water-wise', 1, 'Water wise', array['individual','floor','residence'], 'Build simple water-saving habits.', '◉', 'water', true),
  ('zero-waste', 1, 'Zero waste', array['individual','floor','residence'], 'Reuse, recycle, and avoid disposable waste.', '♻', 'waste', true)
on conflict (key) do update set label = excluded.label, supported_scopes = excluded.supported_scopes,
  description = excluded.description, icon = excluded.icon, category = excluded.category, enabled = excluded.enabled;

insert into public.sustainable_action_types (key, title, description, category, icon, unit, xp_per_unit, points_per_unit, daily_cap, impact_per_unit)
values
  ('walk-km', 'Walked instead', 'A trip completed on foot instead of by car.', 'transport', '↗', 'km', 18, 7, 12, '{"co2_kg":0.171,"walk_km":1}'),
  ('cycle-km', 'Cycled instead', 'A trip completed by bicycle instead of by car.', 'transport', '◎', 'km', 16, 6, 20, '{"co2_kg":0.171,"cycle_km":1}'),
  ('short-shower', 'Short shower', 'Kept a shower under five minutes.', 'water', '◉', 'shower', 35, 14, 2, '{"water_l":35}'),
  ('reusable-item', 'Used a reusable', 'Avoided a disposable cup, bottle, or container.', 'waste', '♻', 'item', 24, 10, 4, '{"waste_items":1,"co2_kg":0.04}'),
  ('plant-meal', 'Plant-based meal', 'Chose a plant-forward meal.', 'food', '♧', 'meal', 30, 12, 3, '{"co2_kg":0.7}'),
  ('switch-off', 'Switched it off', 'Turned off unused lights or appliances.', 'energy', '↯', 'action', 20, 8, 5, '{"kwh":0.08,"co2_kg":0.0326}')
on conflict (key) do update set title = excluded.title, description = excluded.description, icon = excluded.icon,
  xp_per_unit = excluded.xp_per_unit, points_per_unit = excluded.points_per_unit,
  daily_cap = excluded.daily_cap, impact_per_unit = excluded.impact_per_unit, active = true;

create or replace function public.current_level(total_xp bigint)
returns integer language sql immutable parallel safe
as $$ select greatest(1, floor((sqrt(1 + 8 * greatest(total_xp, 0) / 250.0) + 1) / 2)::integer) $$;

create or replace function public.level_floor_xp(level_number integer)
returns integer language sql immutable parallel safe
as $$ select greatest(level_number - 1, 0) * greatest(level_number, 1) * 125 $$;

create or replace function public.log_sustainable_action(target_action text, target_quantity numeric default 1)
returns uuid language plpgsql security definer set search_path = public
as $$
declare member public.student_memberships; action public.sustainable_action_types; used numeric; log_id uuid; xp integer; points integer; impact jsonb;
begin
  select * into member from public.student_memberships where user_id = auth.uid();
  if member is null then raise exception 'Complete residence onboarding first'; end if;
  select * into action from public.sustainable_action_types where key = target_action and active and (university_id is null or university_id = member.university_id);
  if action is null then raise exception 'Action is unavailable'; end if;
  if target_quantity <= 0 then raise exception 'Quantity must be positive'; end if;
  select coalesce(sum(quantity), 0) into used from public.sustainable_action_logs where user_id = auth.uid() and action_key = target_action and logged_on = current_date;
  if used + target_quantity > action.daily_cap then raise exception 'Daily limit reached'; end if;
  xp := round(action.xp_per_unit * target_quantity); points := round(action.points_per_unit * target_quantity);
  select coalesce(jsonb_object_agg(key, to_jsonb((value::text)::numeric * target_quantity)), '{}'::jsonb) into impact
  from jsonb_each(action.impact_per_unit);
  insert into public.sustainable_action_logs (user_id, university_id, action_key, quantity, impact)
  values (auth.uid(), member.university_id, target_action, target_quantity, impact) returning id into log_id;
  insert into public.game_events (user_id, university_id, event_type, source_type, source_id, xp_delta, points_delta, metadata)
  values (auth.uid(), member.university_id, 'action', 'action_log', log_id::text, xp, points, jsonb_build_object('action_key', target_action, 'quantity', target_quantity));
  return log_id;
end $$;
grant execute on function public.log_sustainable_action(text, numeric) to authenticated;

create or replace function public.update_my_leaderboard_privacy(enabled boolean)
returns void language sql security definer set search_path = public
as $$ update public.profiles set leaderboard_opt_in = enabled, updated_at = now() where id = auth.uid() $$;
grant execute on function public.update_my_leaderboard_privacy(boolean) to authenticated;

create or replace function public.claim_reward_offer(target_offer uuid)
returns uuid language plpgsql security definer set search_path = public
as $$
declare offer public.reward_offers; member public.student_memberships; balance bigint; claim_id uuid;
begin
  select * into member from public.student_memberships where user_id = auth.uid();
  select * into offer from public.reward_offers where id = target_offer for update;
  if member is null or offer is null or offer.university_id <> member.university_id or not offer.active or offer.stock < 1 or (offer.expires_at is not null and offer.expires_at <= now()) then raise exception 'Reward is unavailable'; end if;
  select coalesce(sum(points_delta), 0) into balance from public.game_events where user_id = auth.uid();
  if balance < offer.points_cost then raise exception 'Not enough points'; end if;
  insert into public.reward_claims (offer_id, user_id, points_spent) values (offer.id, auth.uid(), offer.points_cost) returning id into claim_id;
  update public.reward_offers set stock = stock - 1 where id = offer.id;
  insert into public.game_events (user_id, university_id, event_type, source_type, source_id, points_delta, metadata)
  values (auth.uid(), member.university_id, 'reward_claim', 'reward_offer', claim_id::text, -offer.points_cost, jsonb_build_object('offer_id', offer.id));
  return claim_id;
end $$;
grant execute on function public.claim_reward_offer(uuid) to authenticated;

create or replace function public.get_my_game_dashboard()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare member public.student_memberships; profile public.profiles; xp bigint; points bigint; level_no integer; floor_xp integer; next_xp integer; streak integer := 0; cursor_date date; result jsonb;
begin
  select * into member from public.student_memberships where user_id = auth.uid();
  select * into profile from public.profiles where id = auth.uid();
  select coalesce(sum(xp_delta),0), coalesce(sum(points_delta),0) into xp, points from public.game_events where user_id = auth.uid();
  level_no := public.current_level(xp); floor_xp := public.level_floor_xp(level_no); next_xp := public.level_floor_xp(level_no + 1);
  cursor_date := current_date;
  if not exists (select 1 from public.sustainable_action_logs where user_id = auth.uid() and logged_on = cursor_date) then cursor_date := cursor_date - 1; end if;
  while exists (select 1 from public.sustainable_action_logs where user_id = auth.uid() and logged_on = cursor_date) loop streak := streak + 1; cursor_date := cursor_date - 1; end loop;
  select jsonb_build_object(
    'xp', xp, 'points', points, 'level', level_no, 'levelTitle', case when level_no >= 10 then 'Planet Guardian' when level_no >= 7 then 'Grid Champion' when level_no >= 4 then 'Impact Builder' else 'Eco Starter' end,
    'levelXp', xp - floor_xp, 'levelTarget', next_xp - floor_xp, 'streak', streak, 'leaderboardOptIn', coalesce(profile.leaderboard_opt_in,false),
    'todayActions', (select count(*) from public.sustainable_action_logs where user_id = auth.uid() and logged_on = current_date),
    'weekActions', (select count(*) from public.sustainable_action_logs where user_id = auth.uid() and logged_on >= current_date - 6),
    'impact', coalesce((select jsonb_object_agg(key, value) from (select key, round(sum((value::text)::numeric),2) value from public.sustainable_action_logs l cross join lateral jsonb_each(l.impact) where l.user_id = auth.uid() group by key) impact_values), '{}'::jsonb),
    'weekly', coalesce((select jsonb_agg(jsonb_build_object('label', to_char(activity_day,'Dy'), 'value', coalesce(xp_value,0)) order by activity_day) from (select d::date activity_day, (select sum(e.xp_delta) from public.game_events e where e.user_id = auth.uid() and e.occurred_at::date = d::date) xp_value from generate_series(current_date - 6, current_date, interval '1 day') d) days), '[]'::jsonb),
    'recentEvents', coalesce((select jsonb_agg(item) from (select jsonb_build_object('id',id,'type',event_type,'xp',xp_delta,'points',points_delta,'at',occurred_at,'metadata',metadata) item from public.game_events where user_id = auth.uid() order by occurred_at desc limit 5) recent), '[]'::jsonb),
    'rank', coalesce((select rank from (select user_id, rank() over(order by sum(xp_delta) desc) rank from public.game_events where university_id = member.university_id group by user_id) ranked where user_id = auth.uid()), 1),
    'community', jsonb_build_object('floorName',(select name from public.floors where id = member.floor_id),'residenceName',(select name from public.residences where id = member.residence_id),'members',(select count(*) from public.student_memberships where floor_id = member.floor_id))
  ) into result;
  return result;
end $$;
grant execute on function public.get_my_game_dashboard() to authenticated;

create or replace function public.get_my_achievements()
returns table (id uuid, title text, description text, icon text, rarity text, category text, requirement jsonb, xp_reward integer, progress numeric, unlocked_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select a.id, a.title, a.description, a.icon, a.rarity, a.category, a.requirement, a.xp_reward, coalesce(ua.progress,0), ua.unlocked_at
  from public.achievement_definitions a left join public.user_achievements ua on ua.achievement_id = a.id and ua.user_id = auth.uid()
  where a.active and (a.university_id is null or a.university_id = (select university_id from public.student_memberships where user_id = auth.uid()))
  order by (ua.unlocked_at is not null) desc, case a.rarity when 'legendary' then 1 when 'epic' then 2 when 'rare' then 3 else 4 end, a.title
$$;
grant execute on function public.get_my_achievements() to authenticated;

create or replace function public.get_game_leaderboard(board_scope text default 'individual', board_period text default 'week')
returns table (rank bigint, entity_id uuid, label text, subtitle text, xp bigint, level integer, trend integer, is_me boolean, anonymous boolean)
language plpgsql stable security definer set search_path = public
as $$
declare member public.student_memberships; since_at timestamptz;
begin
  select * into member from public.student_memberships where user_id = auth.uid();
  since_at := case board_period when 'today' then date_trunc('day',now()) when 'week' then date_trunc('week',now()) when 'month' then date_trunc('month',now()) else '2000-01-01'::timestamptz end;
  if board_scope = 'individual' then
    return query select rank() over(order by sum(e.xp_delta) desc), e.user_id,
      case when p.leaderboard_opt_in or e.user_id = auth.uid() then coalesce(p.display_name,'Eco player') else 'Eco player ' || upper(substr(e.user_id::text,1,4)) end,
      f.name || ' · ' || r.name, sum(e.xp_delta)::bigint, public.current_level((select coalesce(sum(all_e.xp_delta),0) from public.game_events all_e where all_e.user_id=e.user_id)), 0,
      e.user_id = auth.uid(), not p.leaderboard_opt_in
    from public.game_events e join public.profiles p on p.id=e.user_id join public.student_memberships sm on sm.user_id=e.user_id join public.floors f on f.id=sm.floor_id join public.residences r on r.id=sm.residence_id
    where e.university_id=member.university_id and e.occurred_at>=since_at and p.archived_at is null group by e.user_id,p.display_name,p.leaderboard_opt_in,f.name,r.name order by sum(e.xp_delta) desc limit 100;
  elsif board_scope = 'floor' then
    return query select rank() over(order by sum(e.xp_delta) desc), sm.floor_id, f.name, r.name, sum(e.xp_delta)::bigint, 1, 0, sm.floor_id=member.floor_id, false
    from public.game_events e join public.student_memberships sm on sm.user_id=e.user_id join public.floors f on f.id=sm.floor_id join public.residences r on r.id=sm.residence_id
    where e.university_id=member.university_id and e.occurred_at>=since_at group by sm.floor_id,f.name,r.name order by sum(e.xp_delta) desc limit 100;
  else
    return query select rank() over(order by sum(e.xp_delta) desc), sm.residence_id, r.name, count(distinct sm.user_id)::text || ' members', sum(e.xp_delta)::bigint, 1, 0, sm.residence_id=member.residence_id, false
    from public.game_events e join public.student_memberships sm on sm.user_id=e.user_id join public.residences r on r.id=sm.residence_id
    where e.university_id=member.university_id and e.occurred_at>=since_at group by sm.residence_id,r.name order by sum(e.xp_delta) desc limit 100;
  end if;
end $$;
grant execute on function public.get_game_leaderboard(text, text) to authenticated;

create or replace function public.get_reward_market()
returns table (id uuid, title text, description text, icon text, color text, points_cost integer, stock integer, expires_at timestamptz, claimed boolean)
language sql stable security definer set search_path = public
as $$ select o.id,o.title,o.description,o.icon,o.color,o.points_cost,o.stock,o.expires_at,
  exists(select 1 from public.reward_claims c where c.offer_id=o.id and c.user_id=auth.uid() and c.status<>'cancelled')
from public.reward_offers o where o.university_id=(select university_id from public.student_memberships where user_id=auth.uid()) and o.active and (o.expires_at is null or o.expires_at>now()) order by o.points_cost $$;
grant execute on function public.get_reward_market() to authenticated;

create or replace function public.get_admin_analytics()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare uid uuid; uni uuid; result jsonb;
begin
  uid := auth.uid(); select university_id into uni from public.organization_memberships where user_id=uid order by role limit 1;
  if uni is null then raise exception 'Not authorized'; end if;
  select jsonb_build_object(
    'totalUsers',(select count(*) from public.student_memberships where university_id=uni),
    'activeUsers',(select count(distinct user_id) from public.game_events where university_id=uni and occurred_at>=now()-interval '7 days'),
    'activeChallenges',(select count(*) from public.challenges where university_id=uni and status='active'),
    'participationRate',coalesce((select round(count(distinct cr.user_id)*100.0/nullif((select count(*) from public.student_memberships where university_id=uni),0),1) from public.challenge_rosters cr join public.challenges c on c.id=cr.challenge_id where c.university_id=uni and c.status in ('active','scheduled')),0),
    'rewardsClaimed',(select count(*) from public.reward_claims rc join public.reward_offers ro on ro.id=rc.offer_id where ro.university_id=uni),
    'xpAwarded',(select coalesce(sum(xp_delta),0) from public.game_events where university_id=uni),
    'impact',coalesce((select jsonb_object_agg(key,value) from (select key,round(sum((value::text)::numeric),1) value from public.sustainable_action_logs l cross join lateral jsonb_each(l.impact) where l.university_id=uni group by key) i),'{}'::jsonb),
    'engagement',coalesce((select jsonb_agg(jsonb_build_object('label',to_char(activity_day,'Dy'),'value',users) order by activity_day) from (select d::date activity_day,(select count(distinct user_id) from public.game_events where university_id=uni and occurred_at::date=d::date) users from generate_series(current_date-6,current_date,interval '1 day') d) x),'[]'::jsonb),
    'residences',coalesce((select jsonb_agg(row_to_json(x) order by x.xp desc) from (select r.id,r.name,count(distinct sm.user_id) members,coalesce(sum(e.xp_delta),0) xp from public.residences r left join public.student_memberships sm on sm.residence_id=r.id left join public.game_events e on e.user_id=sm.user_id where r.university_id=uni group by r.id,r.name) x),'[]'::jsonb)
  ) into result; return result;
end $$;
grant execute on function public.get_admin_analytics() to authenticated;

create or replace function public.get_admin_users(search_text text default '')
returns table (user_id uuid, display_name text, email text, residence_name text, floor_name text, xp bigint, level integer, streak bigint, active boolean, joined_at timestamptz)
language plpgsql stable security definer set search_path = public, auth
as $$
declare uni uuid;
begin
  select university_id into uni from public.organization_memberships where user_id=auth.uid() and role='university_admin' limit 1;
  if uni is null then raise exception 'Not authorized'; end if;
  return query select p.id,coalesce(p.display_name,''),coalesce(u.email,''),r.name,f.name,coalesce(sum(ge.xp_delta),0)::bigint,public.current_level(coalesce(sum(ge.xp_delta),0)),
    (select count(distinct logged_on) from public.sustainable_action_logs sal where sal.user_id=p.id and sal.logged_on>=current_date-6)::bigint,
    p.archived_at is null,p.created_at from public.student_memberships sm join public.profiles p on p.id=sm.user_id join auth.users u on u.id=p.id join public.residences r on r.id=sm.residence_id join public.floors f on f.id=sm.floor_id left join public.game_events ge on ge.user_id=p.id
    where sm.university_id=uni and (search_text='' or p.display_name ilike '%'||search_text||'%' or u.email ilike '%'||search_text||'%') group by p.id,u.email,r.name,f.name order by p.created_at desc;
end $$;
grant execute on function public.get_admin_users(text) to authenticated;

create or replace function public.set_student_active(target_user uuid, enabled boolean)
returns void language plpgsql security definer set search_path = public
as $$
declare uni uuid;
begin
  select university_id into uni from public.student_memberships where user_id=target_user;
  if uni is null or not public.is_university_admin(uni) then raise exception 'Not authorized'; end if;
  update public.profiles set archived_at=case when enabled then null else now() end,updated_at=now() where id=target_user;
end $$;
grant execute on function public.set_student_active(uuid, boolean) to authenticated;

create or replace function public.create_game_challenge(
  target_module text, target_residence uuid, challenge_title text, challenge_subtitle text,
  challenge_starts_at timestamptz, challenge_ends_at timestamptz, target_kind text,
  target_difficulty text, goal_value numeric, goal_unit text, reward_xp integer, reward_points integer
) returns uuid language plpgsql security definer set search_path = public
as $$
declare uni uuid; created uuid;
begin
  select university_id into uni from public.residences where id=target_residence and status='approved';
  if uni is null or not public.is_university_admin(uni) then raise exception 'Not authorized'; end if;
  if not exists(select 1 from public.challenge_modules where key=target_module and enabled) then raise exception 'Challenge type is unavailable'; end if;
  if length(trim(challenge_title))<3 or length(trim(challenge_subtitle))<3 then raise exception 'Add a clear title and action'; end if;
  if challenge_starts_at<=now() or challenge_ends_at<=challenge_starts_at or challenge_ends_at>challenge_starts_at+interval '90 days' then raise exception 'Choose a valid 1–90 day schedule'; end if;
  if target_kind not in ('personal','daily','weekly','community','competitive') or target_difficulty not in ('easy','medium','hard','epic') then raise exception 'Invalid mission settings'; end if;
  if goal_value<=0 or length(trim(goal_unit))<1 or reward_xp<0 or reward_points<0 then raise exception 'Invalid goal or reward'; end if;
  insert into public.challenges(university_id,residence_id,module_key,title,subtitle,scope,configuration,starts_at,ends_at,roster_locks_at,status,created_by,challenge_kind,cadence,difficulty,xp_reward,point_reward)
  values(uni,target_residence,target_module,trim(challenge_title),trim(challenge_subtitle),case when target_kind='personal' then 'individual' else 'residence' end,
    jsonb_build_object('goal',goal_value,'unit',trim(goal_unit),'current',0),challenge_starts_at,challenge_ends_at,challenge_starts_at,'draft',auth.uid(),target_kind,
    case when target_kind='daily' then 'daily' when target_kind='weekly' then 'weekly' else 'event' end,target_difficulty,reward_xp,reward_points)
  returning id into created;
  return created;
end $$;
grant execute on function public.create_game_challenge(text,uuid,text,text,timestamptz,timestamptz,text,text,numeric,text,integer,integer) to authenticated;

alter publication supabase_realtime add table public.game_events;
alter publication supabase_realtime add table public.sustainable_action_logs;
alter publication supabase_realtime add table public.user_achievements;
alter publication supabase_realtime add table public.reward_claims;
