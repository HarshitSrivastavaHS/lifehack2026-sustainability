-- CommonGrid hackathon MVP: one university, electricity savings, and shared rewards.
-- Legacy platform tables remain in place but are no longer used by the client.

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists app_role text not null default 'student';
alter table public.profiles add column if not exists active boolean not null default false;
alter table public.profiles add column if not exists mvp_university_id uuid references public.universities(id);

do $$ begin
  alter table public.profiles add constraint profiles_mvp_role_check check (app_role in ('student', 'admin'));
exception when duplicate_object then null;
end $$;

create unique index if not exists profiles_one_active_admin_idx
  on public.profiles (app_role) where app_role = 'admin' and active;
create unique index if not exists profiles_email_lower_idx
  on public.profiles (lower(email)) where email is not null;

create table if not exists public.mvp_electricity_savings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id),
  kwh_saved numeric(10,2) not null check (kwh_saved > 0 and kwh_saved <= 100),
  points_awarded integer not null check (points_awarded = round(kwh_saved * 10)),
  request_id uuid not null unique,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists mvp_electricity_student_time_idx
  on public.mvp_electricity_savings(student_id, created_at desc);

create table if not exists public.mvp_rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 240),
  points_required integer not null check (points_required > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(points_required)
);

create table if not exists public.mvp_university_reward_unlocks (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null unique references public.mvp_rewards(id) on delete restrict,
  unlocked_at timestamptz not null default now()
);

create table if not exists public.mvp_reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id),
  reward_id uuid not null references public.mvp_rewards(id) on delete restrict,
  redeemed_at timestamptz not null default now(),
  status text not null default 'redeemed' check (status = 'redeemed'),
  unique(student_id, reward_id)
);
create index if not exists mvp_redemptions_student_time_idx
  on public.mvp_reward_redemptions(student_id, redeemed_at desc);

alter table public.mvp_electricity_savings enable row level security;
alter table public.mvp_rewards enable row level security;
alter table public.mvp_university_reward_unlocks enable row level security;
alter table public.mvp_reward_redemptions enable row level security;

create or replace function public.mvp_is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and app_role = 'admin' and active
  )
$$;

create or replace function public.mvp_is_active_student()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and app_role = 'student' and active
  )
$$;

drop policy if exists mvp_electricity_read on public.mvp_electricity_savings;
create policy mvp_electricity_read on public.mvp_electricity_savings for select to authenticated
  using (student_id = auth.uid() or public.mvp_is_admin());
drop policy if exists mvp_rewards_read on public.mvp_rewards;
create policy mvp_rewards_read on public.mvp_rewards for select to authenticated
  using (public.mvp_is_admin() or public.mvp_is_active_student());
drop policy if exists mvp_unlocks_read on public.mvp_university_reward_unlocks;
create policy mvp_unlocks_read on public.mvp_university_reward_unlocks for select to authenticated
  using (public.mvp_is_admin() or public.mvp_is_active_student());
drop policy if exists mvp_redemptions_read on public.mvp_reward_redemptions;
create policy mvp_redemptions_read on public.mvp_reward_redemptions for select to authenticated
  using (student_id = auth.uid() or public.mvp_is_admin());

-- The legacy own_profile policy permits updates, so remove the table grant. All
-- role, active, name, and email changes now go through trusted server operations.
revoke update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant select on public.mvp_electricity_savings, public.mvp_rewards,
  public.mvp_university_reward_unlocks, public.mvp_reward_redemptions to authenticated;
revoke insert, update, delete on public.mvp_electricity_savings, public.mvp_rewards,
  public.mvp_university_reward_unlocks, public.mvp_reward_redemptions from anon, authenticated;

create or replace function public.get_mvp_session()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select jsonb_build_object(
    'id', p.id,
    'name', coalesce(nullif(trim(p.display_name), ''), split_part(coalesce(p.email, ''), '@', 1)),
    'email', coalesce(p.email, ''),
    'role', p.app_role,
    'active', p.active,
    'universityName', coalesce(u.name, 'Northbridge University')
  ) into result
  from public.profiles p
  left join public.universities u on u.id = p.mvp_university_id
  where p.id = auth.uid();
  return result;
end
$$;

create or replace function public.get_mvp_student_home()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  personal_kwh numeric;
  personal_points integer;
  university_kwh numeric;
  university_points integer;
  next_reward record;
  reward_rows jsonb;
  history_rows jsonb;
  university_name text;
begin
  if not public.mvp_is_active_student() then raise exception 'Active student access required'; end if;

  select coalesce(sum(kwh_saved), 0), coalesce(sum(points_awarded), 0)
    into personal_kwh, personal_points
  from public.mvp_electricity_savings where student_id = auth.uid();

  select coalesce(sum(kwh_saved), 0), coalesce(sum(points_awarded), 0)
    into university_kwh, university_points
  from public.mvp_electricity_savings;

  select r.id, r.name, r.description, r.points_required into next_reward
  from public.mvp_rewards r
  left join public.mvp_university_reward_unlocks u on u.reward_id = r.id
  where r.active and u.id is null
  order by r.points_required asc limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'name', r.name,
    'description', r.description,
    'pointsRequired', r.points_required,
    'active', r.active,
    'state', case when d.id is not null then 'redeemed' when u.id is not null then 'unlocked' else 'locked' end,
    'unlockedAt', u.unlocked_at,
    'redeemedAt', d.redeemed_at
  ) order by r.points_required), '[]'::jsonb) into reward_rows
  from public.mvp_rewards r
  left join public.mvp_university_reward_unlocks u on u.reward_id = r.id
  left join public.mvp_reward_redemptions d on d.reward_id = r.id and d.student_id = auth.uid()
  where r.active;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', d.id,
    'rewardId', r.id,
    'rewardName', r.name,
    'redeemedAt', d.redeemed_at,
    'status', d.status
  ) order by d.redeemed_at desc), '[]'::jsonb) into history_rows
  from public.mvp_reward_redemptions d
  join public.mvp_rewards r on r.id = d.reward_id
  where d.student_id = auth.uid();

  select coalesce(u.name, 'Northbridge University') into university_name
  from public.profiles p left join public.universities u on u.id = p.mvp_university_id
  where p.id = auth.uid();

  return jsonb_build_object(
    'personalKwh', personal_kwh,
    'personalPoints', personal_points,
    'universityName', university_name,
    'universityKwh', university_kwh,
    'universityPoints', university_points,
    'nextReward', case when next_reward.id is null then null else jsonb_build_object(
      'id', next_reward.id,
      'name', next_reward.name,
      'description', next_reward.description,
      'pointsRequired', next_reward.points_required
    ) end,
    'rewards', reward_rows,
    'redemptions', history_rows
  );
end
$$;

create or replace function public.get_mvp_admin_dashboard()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare result jsonb;
begin
  if not public.mvp_is_admin() then raise exception 'Admin access required'; end if;
  select jsonb_build_object(
    'students', (select count(*) from public.profiles where app_role = 'student' and active),
    'totalKwh', (select coalesce(sum(kwh_saved), 0) from public.mvp_electricity_savings),
    'totalPoints', (select coalesce(sum(points_awarded), 0) from public.mvp_electricity_savings),
    'rewardsUnlocked', (select count(*) from public.mvp_university_reward_unlocks u join public.mvp_rewards r on r.id = u.reward_id where r.active),
    'rewardsRedeemed', (select count(*) from public.mvp_reward_redemptions)
  ) into result;
  return result;
end
$$;

create or replace function public.get_mvp_admin_students(search_text text default '')
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare result jsonb;
begin
  if not public.mvp_is_admin() then raise exception 'Admin access required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'name', p.display_name,
    'email', p.email,
    'active', p.active,
    'kwhSaved', coalesce(s.kwh, 0),
    'points', coalesce(s.points, 0)
  ) order by p.active desc, p.display_name), '[]'::jsonb) into result
  from public.profiles p
  left join lateral (
    select sum(e.kwh_saved) kwh, sum(e.points_awarded) points
    from public.mvp_electricity_savings e where e.student_id = p.id
  ) s on true
  where p.app_role = 'student'
    and (coalesce(search_text, '') = '' or p.display_name ilike '%' || search_text || '%' or p.email ilike '%' || search_text || '%');
  return result;
end
$$;

create or replace function public.get_mvp_admin_rewards()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare result jsonb;
begin
  if not public.mvp_is_admin() then raise exception 'Admin access required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'name', r.name,
    'description', r.description,
    'pointsRequired', r.points_required,
    'active', r.active,
    'state', case when u.id is null then 'locked' else 'unlocked' end,
    'unlockedAt', u.unlocked_at,
    'redemptionCount', (select count(*) from public.mvp_reward_redemptions d where d.reward_id = r.id)
  ) order by r.points_required), '[]'::jsonb) into result
  from public.mvp_rewards r
  left join public.mvp_university_reward_unlocks u on u.reward_id = r.id;
  return result;
end
$$;

create or replace function public.simulate_mvp_electricity_saving(
  target_student uuid,
  kwh_amount numeric,
  simulation_request uuid
)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  awarded integer;
  existing public.mvp_electricity_savings;
  university_kwh numeric;
  university_points integer;
  student_kwh numeric;
  student_points integer;
  unlocked jsonb := '[]'::jsonb;
begin
  if not public.mvp_is_admin() then raise exception 'Admin access required'; end if;
  if kwh_amount is null or kwh_amount <= 0 or kwh_amount > 100 or scale(kwh_amount) > 2 then
    raise exception 'Electricity saved must be between 0.01 and 100 kWh with at most two decimal places';
  end if;
  if not exists (select 1 from public.profiles where id = target_student and app_role = 'student' and active) then
    raise exception 'Select an active student';
  end if;

  perform pg_advisory_xact_lock(hashtext('commongrid-mvp-electricity'));
  select * into existing from public.mvp_electricity_savings where request_id = simulation_request;
  if existing.id is null then
    awarded := round(kwh_amount * 10);
    insert into public.mvp_electricity_savings(student_id, kwh_saved, points_awarded, request_id, created_by)
    values (target_student, kwh_amount, awarded, simulation_request, auth.uid());
  else
    target_student := existing.student_id;
    kwh_amount := existing.kwh_saved;
    awarded := existing.points_awarded;
  end if;

  select coalesce(sum(kwh_saved), 0), coalesce(sum(points_awarded), 0)
    into university_kwh, university_points from public.mvp_electricity_savings;

  if existing.id is null then
    with new_unlocks as (
      insert into public.mvp_university_reward_unlocks(reward_id)
      select id from public.mvp_rewards where active and points_required <= university_points
      on conflict (reward_id) do nothing
      returning reward_id
    )
    select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name, 'pointsRequired', r.points_required)), '[]'::jsonb)
      into unlocked from new_unlocks n join public.mvp_rewards r on r.id = n.reward_id;
  end if;

  select coalesce(sum(kwh_saved), 0), coalesce(sum(points_awarded), 0)
    into student_kwh, student_points from public.mvp_electricity_savings where student_id = target_student;

  return jsonb_build_object(
    'kwhAdded', kwh_amount,
    'pointsAwarded', awarded,
    'studentKwh', student_kwh,
    'studentPoints', student_points,
    'universityKwh', university_kwh,
    'universityPoints', university_points,
    'newlyUnlocked', unlocked,
    'duplicate', existing.id is not null
  );
end
$$;

create or replace function public.redeem_mvp_reward(target_reward uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare result public.mvp_reward_redemptions;
begin
  if not public.mvp_is_active_student() then raise exception 'Active student access required'; end if;
  if not exists (
    select 1 from public.mvp_rewards r
    join public.mvp_university_reward_unlocks u on u.reward_id = r.id
    where r.id = target_reward and r.active
  ) then raise exception 'This reward is not available yet'; end if;

  insert into public.mvp_reward_redemptions(student_id, reward_id)
  values (auth.uid(), target_reward)
  on conflict (student_id, reward_id) do nothing
  returning * into result;

  if result.id is null then raise exception 'You already redeemed this reward'; end if;
  return jsonb_build_object('id', result.id, 'rewardId', result.reward_id, 'redeemedAt', result.redeemed_at, 'status', result.status);
end
$$;

create or replace function public.save_mvp_reward(
  target_reward uuid,
  reward_name text,
  reward_description text,
  required_points integer,
  reward_active boolean
)
returns uuid language plpgsql security definer set search_path = public
as $$
declare saved_id uuid; current_points integer; current_threshold integer;
begin
  if not public.mvp_is_admin() then raise exception 'Admin access required'; end if;
  reward_name := trim(coalesce(reward_name, ''));
  reward_description := trim(coalesce(reward_description, ''));
  if char_length(reward_name) < 1 or char_length(reward_name) > 80 then raise exception 'Reward name must be 1 to 80 characters'; end if;
  if char_length(reward_description) > 240 then raise exception 'Description must be 240 characters or fewer'; end if;
  if required_points is null or required_points <= 0 then raise exception 'Points required must be greater than zero'; end if;

  if target_reward is null then
    insert into public.mvp_rewards(name, description, points_required, active)
    values (reward_name, reward_description, required_points, reward_active)
    returning id into saved_id;
  else
    select points_required into current_threshold from public.mvp_rewards where id = target_reward;
    if current_threshold is null then raise exception 'Reward not found'; end if;
    if current_threshold <> required_points and (
      exists(select 1 from public.mvp_university_reward_unlocks where reward_id = target_reward)
      or exists(select 1 from public.mvp_reward_redemptions where reward_id = target_reward)
    ) then raise exception 'The threshold cannot change after a reward is unlocked'; end if;
    update public.mvp_rewards set name = reward_name, description = reward_description,
      points_required = required_points, active = reward_active, updated_at = now()
    where id = target_reward returning id into saved_id;
  end if;

  select coalesce(sum(points_awarded), 0) into current_points from public.mvp_electricity_savings;
  if reward_active and required_points <= current_points then
    insert into public.mvp_university_reward_unlocks(reward_id) values (saved_id)
    on conflict (reward_id) do nothing;
  end if;
  return saved_id;
exception when unique_violation then
  raise exception 'Another reward already uses that points milestone';
end
$$;

create or replace function public.set_mvp_student_active(target_student uuid, enabled boolean)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.mvp_is_admin() then raise exception 'Admin access required'; end if;
  update public.profiles set active = enabled, updated_at = now()
  where id = target_student and app_role = 'student';
  if not found then raise exception 'Student not found'; end if;
end
$$;

revoke all on function public.mvp_is_admin() from public, anon;
revoke all on function public.mvp_is_active_student() from public, anon;
revoke all on function public.get_mvp_session() from public, anon;
revoke all on function public.get_mvp_student_home() from public, anon;
revoke all on function public.get_mvp_admin_dashboard() from public, anon;
revoke all on function public.get_mvp_admin_students(text) from public, anon;
revoke all on function public.get_mvp_admin_rewards() from public, anon;
revoke all on function public.simulate_mvp_electricity_saving(uuid, numeric, uuid) from public, anon;
revoke all on function public.redeem_mvp_reward(uuid) from public, anon;
revoke all on function public.save_mvp_reward(uuid, text, text, integer, boolean) from public, anon;
revoke all on function public.set_mvp_student_active(uuid, boolean) from public, anon;
grant execute on function public.mvp_is_admin(), public.mvp_is_active_student(), public.get_mvp_session(),
  public.get_mvp_student_home(), public.get_mvp_admin_dashboard(), public.get_mvp_admin_students(text),
  public.get_mvp_admin_rewards(), public.simulate_mvp_electricity_saving(uuid, numeric, uuid),
  public.redeem_mvp_reward(uuid), public.save_mvp_reward(uuid, text, text, integer, boolean),
  public.set_mvp_student_active(uuid, boolean) to authenticated;

-- Public signups create an inactive student shell. Only the admin Edge Function
-- can activate it, and account metadata can no longer provision an admin.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id, display_name, email, app_role, active, mvp_university_id, onboarding_complete)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    lower(new.email),
    'student',
    false,
    md5('demo-university')::uuid,
    true
  )
  on conflict(id) do update set display_name = excluded.display_name, email = excluded.email, updated_at = now();
  return new;
end
$$;

-- Demo fixture: one admin, twelve students, and exactly 92 kWh / 920 points.
insert into auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new,
  email_change, reauthentication_token, created_at, updated_at)
values (
  md5('alice.morgan@commongrid.demo')::uuid,
  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'alice.morgan@commongrid.demo', extensions.crypt('common-grid', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{"display_name":"Alice Morgan","account_type":"student"}',
  '', '', '', '', '', now(), now()
)
on conflict(id) do update set email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()), updated_at = now();

insert into auth.identities(provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (
  md5('alice.morgan@commongrid.demo')::uuid::text,
  md5('alice.morgan@commongrid.demo')::uuid,
  jsonb_build_object('sub', md5('alice.morgan@commongrid.demo')::uuid::text, 'email', 'alice.morgan@commongrid.demo', 'email_verified', true, 'phone_verified', false),
  'email', now(), now(), now()
)
on conflict(provider_id, provider) do update set identity_data = excluded.identity_data, updated_at = now();

update public.profiles p set email = lower(u.email), active = false, app_role = 'student',
  mvp_university_id = md5('demo-university')::uuid, onboarding_complete = true, updated_at = now()
from auth.users u where u.id = p.id;

with demo_students(name, email) as (values
  ('Alice Morgan', 'alice.morgan@commongrid.demo'),
  ('Maya Chen', 'maya.chen@commongrid.demo'),
  ('Aarav Patel', 'aarav.patel@commongrid.demo'),
  ('Sofia Martinez', 'sofia.martinez@commongrid.demo'),
  ('Noah Williams', 'noah.williams@commongrid.demo'),
  ('Amelia Tan', 'amelia.tan@commongrid.demo'),
  ('Priya Nair', 'priya.nair@commongrid.demo'),
  ('Lucas Moreau', 'lucas.moreau@commongrid.demo'),
  ('Hana Kim', 'hana.kim@commongrid.demo'),
  ('Olivia Johnson', 'olivia.johnson@commongrid.demo'),
  ('Nadia Hassan', 'nadia.hassan@commongrid.demo'),
  ('Grace Walker', 'grace.walker@commongrid.demo')
)
insert into public.profiles(id, display_name, email, app_role, active, mvp_university_id, onboarding_complete)
select md5(email)::uuid, name, email, 'student', true, md5('demo-university')::uuid, true from demo_students
on conflict(id) do update set display_name = excluded.display_name, email = excluded.email,
  app_role = 'student', active = true, mvp_university_id = excluded.mvp_university_id, onboarding_complete = true, updated_at = now();

insert into public.profiles(id, display_name, email, app_role, active, mvp_university_id, onboarding_complete)
values (md5('admin@commongrid.demo')::uuid, 'Dr. Elena Brooks', 'admin@commongrid.demo', 'admin', true, md5('demo-university')::uuid, true)
on conflict(id) do update set display_name = excluded.display_name, email = excluded.email,
  app_role = 'admin', active = true, mvp_university_id = excluded.mvp_university_id, onboarding_complete = true, updated_at = now();

with seed_savings(name, email, kwh) as (values
  ('Alice Morgan', 'alice.morgan@commongrid.demo', 12.00::numeric),
  ('Maya Chen', 'maya.chen@commongrid.demo', 10.00::numeric),
  ('Aarav Patel', 'aarav.patel@commongrid.demo', 9.00::numeric),
  ('Sofia Martinez', 'sofia.martinez@commongrid.demo', 8.50::numeric),
  ('Noah Williams', 'noah.williams@commongrid.demo', 7.50::numeric),
  ('Amelia Tan', 'amelia.tan@commongrid.demo', 8.00::numeric),
  ('Priya Nair', 'priya.nair@commongrid.demo', 7.00::numeric),
  ('Lucas Moreau', 'lucas.moreau@commongrid.demo', 6.50::numeric),
  ('Hana Kim', 'hana.kim@commongrid.demo', 9.00::numeric),
  ('Olivia Johnson', 'olivia.johnson@commongrid.demo', 6.00::numeric),
  ('Nadia Hassan', 'nadia.hassan@commongrid.demo', 4.50::numeric),
  ('Grace Walker', 'grace.walker@commongrid.demo', 4.00::numeric)
)
insert into public.mvp_electricity_savings(id, student_id, kwh_saved, points_awarded, request_id, created_by, created_at)
select md5('mvp-saving-' || email)::uuid, md5(email)::uuid, kwh, round(kwh * 10),
  md5('mvp-request-' || email)::uuid, md5('admin@commongrid.demo')::uuid, now() - interval '7 days'
from seed_savings
on conflict(id) do update set student_id = excluded.student_id, kwh_saved = excluded.kwh_saved,
  points_awarded = excluded.points_awarded, request_id = excluded.request_id, created_by = excluded.created_by;

insert into public.mvp_rewards(id, name, description, points_required, active) values
  (md5('mvp-reward-dining')::uuid, '$5 Dining Credit', 'Use at participating campus dining locations.', 500, true),
  (md5('mvp-reward-washes')::uuid, '3 Free Washes', 'Three complimentary laundry cycles.', 1000, true),
  (md5('mvp-reward-voucher')::uuid, '$10 Voucher', 'A university store voucher.', 1500, true),
  (md5('mvp-reward-kit')::uuid, 'Eco Essentials Kit', 'A reusable bottle, cup, and tote.', 2000, true)
on conflict(id) do update set name = excluded.name, description = excluded.description,
  points_required = excluded.points_required, active = excluded.active, updated_at = now();

insert into public.mvp_university_reward_unlocks(id, reward_id, unlocked_at)
values (md5('mvp-unlock-dining')::uuid, md5('mvp-reward-dining')::uuid, now() - interval '4 days')
on conflict(reward_id) do nothing;

insert into public.mvp_reward_redemptions(id, student_id, reward_id, redeemed_at, status)
values (md5('mvp-redemption-alice-dining')::uuid, md5('alice.morgan@commongrid.demo')::uuid,
  md5('mvp-reward-dining')::uuid, now() - interval '2 days', 'redeemed')
on conflict(student_id, reward_id) do nothing;
