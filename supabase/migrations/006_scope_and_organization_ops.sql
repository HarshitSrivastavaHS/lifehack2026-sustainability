create or replace function public.is_residence_admin(target_residence uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.organization_memberships m
    join public.residences r on r.id = target_residence and r.university_id = m.university_id
    where m.user_id = auth.uid()
      and (m.role = 'university_admin' or (m.role = 'residence_admin' and m.residence_id = target_residence))
  )
$$;


create or replace function private.freeze_energy_baseline(target_challenge uuid)
returns integer language plpgsql security definer set search_path = public, private
as $$
declare selected public.challenges; meter record; interval_at timestamptz; model_id uuid; expected numeric; inserted integer := 0;
begin
  select * into selected from public.challenges where id = target_challenge and module_key = 'idle-ac';
  if selected is null then raise exception 'Energy challenge not found'; end if;
  delete from public.energy_expected_intervals where challenge_id = target_challenge;
  for meter in
    select m.* from public.energy_meters m join public.residences r on r.id = m.residence_id
    where m.active and r.university_id = selected.university_id
      and (selected.residence_id is null or m.residence_id = selected.residence_id)
  loop
    if (select count(*) from public.energy_readings where meter_id = meter.id and recorded_at >= selected.starts_at - interval '8 weeks' and recorded_at < selected.starts_at) < 28
    then raise exception 'Meter % needs more history', meter.external_id; end if;
    insert into public.energy_baseline_models (meter_id, version, training_started_at, training_ended_at, coefficients, mean_absolute_error)
    values (meter.id, coalesce((select max(version) + 1 from public.energy_baseline_models where meter_id = meter.id), 1),
      selected.starts_at - interval '8 weeks', selected.starts_at, jsonb_build_object('method', 'median_same_weekday_time_slot', 'weeks', 8), 0)
    returning id into model_id;
    for interval_at in select generate_series(selected.starts_at, selected.ends_at - interval '15 minutes', interval '15 minutes')
    loop
      select percentile_cont(0.5) within group (order by ac_kwh) into expected
      from public.energy_readings where meter_id = meter.id
        and recorded_at >= selected.starts_at - interval '8 weeks' and recorded_at < selected.starts_at
        and extract(isodow from recorded_at) = extract(isodow from interval_at)
        and extract(hour from recorded_at) = extract(hour from interval_at)
        and extract(minute from recorded_at) = extract(minute from interval_at);
      if expected is null then raise exception 'Meter % lacks a comparable interval for %', meter.external_id, interval_at; end if;
      insert into public.energy_expected_intervals (challenge_id, meter_id, baseline_model_id, interval_at, expected_ac_kwh)
      values (target_challenge, meter.id, model_id, interval_at, expected);
      inserted := inserted + 1;
    end loop;
  end loop;
  if inserted = 0 then raise exception 'No eligible meters were found'; end if;
  return inserted;
end
$$;

create or replace function public.refresh_energy_progress()
returns integer language plpgsql security definer set search_path = public
as $$
declare challenge record; scope record; expected numeric; actual numeric; saved numeric; target numeric; threshold numeric; updated integer := 0;
begin
  update public.challenges set status = 'active' where status = 'scheduled' and starts_at <= now();
  for challenge in select * from public.challenges where module_key = 'idle-ac' and status = 'active'
  loop
    threshold := coalesce((challenge.configuration ->> 'occupancyThreshold')::numeric, 0.2);
    for scope in
      select case when challenge.scope = 'university' then 'university' else 'residence' end::text as scope_type,
        case when challenge.scope = 'university' then challenge.university_id else challenge.residence_id end as scope_id
      union all select 'floor', f.id from public.floors f
        where challenge.residence_id is not null and f.residence_id = challenge.residence_id
    loop
      select coalesce(sum(e.expected_ac_kwh), 0), coalesce(sum(r.ac_kwh), 0) into expected, actual
      from public.energy_expected_intervals e
      join public.energy_meters m on m.id = e.meter_id
      join public.energy_readings r on r.meter_id = e.meter_id and r.recorded_at = e.interval_at
      where e.challenge_id = challenge.id and r.occupancy_ratio < threshold and (
        scope.scope_type = 'university'
        or (scope.scope_type = 'residence' and m.residence_id = scope.scope_id)
        or (scope.scope_type = 'floor' and m.floor_id = scope.scope_id)
      );
      saved := greatest(expected - actual, 0);
      target := greatest(expected * coalesce((challenge.configuration ->> 'targetPercent')::numeric, 12) / 100, 0.0001);
      insert into public.progress_snapshots (challenge_id, scope_type, scope_id, current_value, target_value, unit, verified, display_metrics)
      values (challenge.id, scope.scope_type, scope.scope_id, saved, target, 'kWh', true,
        jsonb_build_object('saved_kwh', saved, 'saved_percent', case when expected > 0 then saved / expected * 100 else 0 end, 'expected_kwh', expected, 'actual_kwh', actual));
      updated := updated + 1;
    end loop;
    delete from public.challenge_metric_points where challenge_id = challenge.id and metric_key = 'actual_kwh';
    insert into public.challenge_metric_points (challenge_id, scope_type, scope_id, metric_key, label, value, comparison_value, recorded_at)
    select challenge.id, case when challenge.scope = 'university' then 'university' else 'residence' end,
      case when challenge.scope = 'university' then challenge.university_id else challenge.residence_id end,
      'actual_kwh', 'D' || (e.interval_at::date - challenge.starts_at::date + 1)::text,
      sum(r.ac_kwh), sum(e.expected_ac_kwh), date_trunc('day', e.interval_at)
    from public.energy_expected_intervals e
    join public.energy_readings r on r.meter_id = e.meter_id and r.recorded_at = e.interval_at
    where e.challenge_id = challenge.id and r.occupancy_ratio < threshold
    group by date_trunc('day', e.interval_at), e.interval_at::date
    order by date_trunc('day', e.interval_at);
  end loop;
  return updated;
end
$$;

create or replace function public.rotate_join_code(target_residence uuid, validity_days integer default 30, allowed_uses integer default 500)
returns text language plpgsql security definer set search_path = public, extensions
as $$
declare university uuid; raw_code text;
begin
  select university_id into university from public.residences where id = target_residence;
  if university is null or not public.is_university_admin(university) then raise exception 'Not authorized'; end if;
  if validity_days < 1 or validity_days > 365 or allowed_uses < 1 then raise exception 'Invalid code limits'; end if;
  raw_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
  update public.join_codes set revoked_at = now() where residence_id = target_residence and revoked_at is null;
  insert into public.join_codes (residence_id, code_hash, expires_at, max_uses, created_by)
  values (target_residence, encode(digest(raw_code, 'sha256'), 'hex'), now() + make_interval(days => validity_days), allowed_uses, auth.uid());
  return raw_code;
end
$$;
grant execute on function public.rotate_join_code(uuid, integer, integer) to authenticated;

create or replace function public.approve_residence(target_residence uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare university uuid;
begin
  select university_id into university from public.residences where id = target_residence;
  if university is null or not public.is_university_admin(university) then raise exception 'Not authorized'; end if;
  update public.residences set status = 'approved' where id = target_residence;
  update public.organization_applications set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
    where kind = 'residence' and proposed_name = (select name from public.residences where id = target_residence) and status = 'pending';
end
$$;
grant execute on function public.approve_residence(uuid) to authenticated;
