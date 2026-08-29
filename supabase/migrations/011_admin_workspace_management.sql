create or replace function public.get_admin_residences()
returns table (
  residence_id uuid,
  residence_name text,
  residence_status public.approval_status,
  floors jsonb,
  meters jsonb,
  member_count bigint,
  residence_admins jsonb,
  reward_redeemers jsonb
)
language plpgsql security definer set search_path = public, auth
as $$
declare
  admin_university uuid;
  admin_residence uuid;
  admin_role public.org_role;
begin
  select m.university_id, m.residence_id, m.role into admin_university, admin_residence, admin_role
  from public.organization_memberships m
  where m.user_id = auth.uid()
  order by m.created_at
  limit 1;
  if admin_university is null then raise exception 'Not authorized'; end if;

  return query
  select
    r.id,
    r.name,
    r.status,
    coalesce((
      select jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name) order by f.name)
      from public.floors f where f.residence_id = r.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', em.id,
        'externalId', em.external_id,
        'floorId', em.floor_id,
        'active', em.active
      ) order by em.external_id)
      from public.energy_meters em where em.residence_id = r.id
    ), '[]'::jsonb),
    (select count(*) from public.student_memberships sm where sm.residence_id = r.id),
    coalesce((
      select jsonb_agg(jsonb_build_object('userId', om.user_id, 'email', u.email) order by u.email)
      from public.organization_memberships om
      join auth.users u on u.id = om.user_id
      where om.residence_id = r.id and om.role = 'residence_admin'
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object('userId', rs.user_id, 'email', u.email) order by u.email)
      from public.reward_redeemer_scopes rs
      join auth.users u on u.id = rs.user_id
      where rs.university_id = admin_university and rs.residence_id = r.id and rs.active
    ), '[]'::jsonb)
  from public.residences r
  where r.university_id = admin_university
    and (admin_role = 'university_admin' or r.id = admin_residence)
  order by r.name;
end
$$;
grant execute on function public.get_admin_residences() to authenticated;

create or replace function public.create_residence_with_floors(
  residence_name text,
  floor_names text[]
)
returns table (residence_id uuid, join_code text)
language plpgsql security definer set search_path = public, extensions
as $$
declare
  admin_university uuid;
  created_residence uuid;
  normalized_floors text[];
  raw_code text;
begin
  select m.university_id into admin_university
  from public.organization_memberships m
  where m.user_id = auth.uid() and m.role = 'university_admin'
  order by m.created_at
  limit 1;
  if admin_university is null then raise exception 'Not authorized'; end if;
  if length(trim(residence_name)) < 2 or length(trim(residence_name)) > 120 then
    raise exception 'Residence name must be 2–120 characters';
  end if;

  select array_agg(name order by name) into normalized_floors
  from (
    select distinct trim(value) as name
    from unnest(floor_names) value
    where trim(value) <> '' and length(trim(value)) <= 80
  ) names;
  if coalesce(array_length(normalized_floors, 1), 0) < 1 then
    raise exception 'Add at least one floor';
  end if;
  if array_length(normalized_floors, 1) > 100 then
    raise exception 'A residence can have at most 100 floors';
  end if;

  insert into public.residences (university_id, name, status)
  values (admin_university, trim(residence_name), 'approved')
  returning id into created_residence;

  insert into public.floors (residence_id, name)
  select created_residence, name from unnest(normalized_floors) name;

  raw_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
  insert into public.join_codes (residence_id, code_hash, expires_at, max_uses, created_by)
  values (created_residence, encode(digest(raw_code, 'sha256'), 'hex'), now() + interval '30 days', 500, auth.uid());

  return query select created_residence, raw_code;
end
$$;
grant execute on function public.create_residence_with_floors(text, text[]) to authenticated;

create or replace function public.add_residence_floor(target_residence uuid, floor_name text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare created_floor uuid;
begin
  if not public.is_residence_admin(target_residence) then raise exception 'Not authorized'; end if;
  if length(trim(floor_name)) < 1 or length(trim(floor_name)) > 80 then
    raise exception 'Floor name must be 1–80 characters';
  end if;
  insert into public.floors (residence_id, name)
  values (target_residence, trim(floor_name))
  returning id into created_floor;
  return created_floor;
end
$$;
grant execute on function public.add_residence_floor(uuid, text) to authenticated;

create or replace function public.register_energy_meter(
  target_residence uuid,
  target_floor uuid,
  external_meter_id text
)
returns uuid language plpgsql security definer set search_path = public
as $$
declare created_meter uuid;
begin
  if not public.is_residence_admin(target_residence) then raise exception 'Not authorized'; end if;
  if not exists (select 1 from public.floors where id = target_floor and residence_id = target_residence) then
    raise exception 'Choose a floor in this residence';
  end if;
  if length(trim(external_meter_id)) < 2 or length(trim(external_meter_id)) > 160 then
    raise exception 'Meter ID must be 2–160 characters';
  end if;
  insert into public.energy_meters (residence_id, floor_id, external_id, active)
  values (target_residence, target_floor, trim(external_meter_id), true)
  on conflict (external_id) do update set
    floor_id = excluded.floor_id,
    active = true
  where public.energy_meters.residence_id = excluded.residence_id
  returning id into created_meter;
  if created_meter is null then raise exception 'Meter ID belongs to another workspace'; end if;
  return created_meter;
end
$$;
grant execute on function public.register_energy_meter(uuid, uuid, text) to authenticated;

create or replace function public.set_energy_meter_active(target_meter uuid, enabled boolean)
returns void language plpgsql security definer set search_path = public
as $$
declare target_residence uuid;
begin
  select residence_id into target_residence from public.energy_meters where id = target_meter;
  if target_residence is null or not public.is_residence_admin(target_residence) then raise exception 'Not authorized'; end if;
  update public.energy_meters set active = enabled where id = target_meter;
end
$$;
grant execute on function public.set_energy_meter_active(uuid, boolean) to authenticated;

create or replace function public.assign_residence_admin(target_residence uuid, target_email text)
returns void language plpgsql security definer set search_path = public, auth
as $$
declare admin_university uuid; target_user uuid;
begin
  select university_id into admin_university from public.residences where id = target_residence;
  if admin_university is null or not public.is_university_admin(admin_university) then raise exception 'Not authorized'; end if;
  select id into target_user from auth.users where lower(email) = lower(trim(target_email));
  if target_user is null then raise exception 'That email must create a CommonGrid account first'; end if;
  insert into public.organization_memberships (user_id, university_id, residence_id, role)
  values (target_user, admin_university, target_residence, 'residence_admin')
  on conflict (user_id, university_id, role) do update set residence_id = excluded.residence_id;
  update public.profiles set onboarding_complete = true, updated_at = now() where id = target_user;
end
$$;
grant execute on function public.assign_residence_admin(uuid, text) to authenticated;

create or replace function public.assign_reward_redeemer(target_residence uuid, target_email text)
returns void language plpgsql security definer set search_path = public, auth
as $$
declare admin_university uuid; target_user uuid; scope_label text;
begin
  select university_id, name || ' rewards' into admin_university, scope_label from public.residences where id = target_residence;
  if admin_university is null or not public.is_university_admin(admin_university) then raise exception 'Not authorized'; end if;
  select id into target_user from auth.users where lower(email) = lower(trim(target_email));
  if target_user is null then raise exception 'That email must create a CommonGrid account first'; end if;
  insert into public.reward_redeemer_scopes (user_id, university_id, residence_id, label, active)
  values (target_user, admin_university, target_residence, scope_label, true)
  on conflict (user_id, university_id) do update set residence_id = excluded.residence_id, label = excluded.label, active = true;
  update public.profiles set onboarding_complete = true, updated_at = now() where id = target_user;
end
$$;
grant execute on function public.assign_reward_redeemer(uuid, text) to authenticated;

create or replace function public.revoke_workspace_access(target_user uuid, access_kind text, target_residence uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare admin_university uuid;
begin
  select university_id into admin_university from public.residences where id = target_residence;
  if admin_university is null or not public.is_university_admin(admin_university) then raise exception 'Not authorized'; end if;
  if target_user = auth.uid() then raise exception 'You cannot revoke your own access'; end if;
  if access_kind = 'residence_admin' then
    delete from public.organization_memberships
    where user_id = target_user and university_id = admin_university and residence_id = target_residence and role = 'residence_admin';
  elsif access_kind = 'reward_redeemer' then
    update public.reward_redeemer_scopes set active = false
    where user_id = target_user and university_id = admin_university and residence_id = target_residence;
  else
    raise exception 'Unsupported access type';
  end if;
  update public.profiles set onboarding_complete = (
    exists (select 1 from public.student_memberships sm where sm.user_id = target_user)
    or exists (select 1 from public.organization_memberships om where om.user_id = target_user)
    or exists (select 1 from public.reward_redeemer_scopes rs where rs.user_id = target_user and rs.active)
  ), updated_at = now() where id = target_user;
end
$$;
grant execute on function public.revoke_workspace_access(uuid, text, uuid) to authenticated;

create or replace function public.rotate_join_code(target_residence uuid, validity_days integer default 30, allowed_uses integer default 500)
returns text language plpgsql security definer set search_path = public, extensions
as $$
declare raw_code text;
begin
  if not public.is_residence_admin(target_residence) then raise exception 'Not authorized'; end if;
  if validity_days < 1 or validity_days > 365 or allowed_uses < 1 then raise exception 'Invalid code limits'; end if;
  raw_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
  update public.join_codes set revoked_at = now() where residence_id = target_residence and revoked_at is null;
  insert into public.join_codes (residence_id, code_hash, expires_at, max_uses, created_by)
  values (target_residence, encode(digest(raw_code, 'sha256'), 'hex'), now() + make_interval(days => validity_days), allowed_uses, auth.uid());
  return raw_code;
end
$$;
