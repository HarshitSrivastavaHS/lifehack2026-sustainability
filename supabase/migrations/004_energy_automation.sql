create or replace function private.freeze_energy_baseline(target_challenge uuid)
returns integer language plpgsql security definer set search_path = public, private
as $$
declare selected public.challenges; meter record; interval_at timestamptz; model_id uuid; expected numeric; inserted integer := 0;
begin
  select * into selected from public.challenges where id = target_challenge and module_key = 'idle-ac';
  if selected is null then raise exception 'Energy challenge not found'; end if;
  delete from public.energy_expected_intervals where challenge_id = target_challenge;

  for meter in select * from public.energy_meters where active and residence_id = selected.residence_id
  loop
    if (select count(*) from public.energy_readings where meter_id = meter.id and recorded_at >= selected.starts_at - interval '8 weeks' and recorded_at < selected.starts_at) < 28
    then raise exception 'Meter % needs more history', meter.external_id; end if;

    insert into public.energy_baseline_models (meter_id, version, training_started_at, training_ended_at, coefficients, mean_absolute_error)
    values (meter.id, coalesce((select max(version) + 1 from public.energy_baseline_models where meter_id = meter.id), 1),
      selected.starts_at - interval '8 weeks', selected.starts_at,
      jsonb_build_object('method', 'median_same_weekday_time_slot', 'weeks', 8), 0)
    returning id into model_id;

    for interval_at in select generate_series(selected.starts_at, selected.ends_at - interval '15 minutes', interval '15 minutes')
    loop
      select percentile_cont(0.5) within group (order by ac_kwh) into expected
      from public.energy_readings
      where meter_id = meter.id and recorded_at >= selected.starts_at - interval '8 weeks' and recorded_at < selected.starts_at
        and extract(isodow from recorded_at) = extract(isodow from interval_at)
        and extract(hour from recorded_at) = extract(hour from interval_at)
        and extract(minute from recorded_at) = extract(minute from interval_at);
      if expected is null then raise exception 'Meter % lacks a comparable interval for %', meter.external_id, interval_at; end if;
      insert into public.energy_expected_intervals (challenge_id, meter_id, baseline_model_id, interval_at, expected_ac_kwh)
      values (target_challenge, meter.id, model_id, interval_at, expected);
      inserted := inserted + 1;
    end loop;
  end loop;
  return inserted;
end
$$;

create or replace function public.publish_energy_challenge(target_challenge uuid)
returns void language plpgsql security definer set search_path = public, private
as $$
declare selected public.challenges; campaign public.reward_campaigns; inventory_count integer; total_weight integer;
begin
  select * into selected from public.challenges where id = target_challenge for update;
  if selected is null or not public.is_university_admin(selected.university_id) then raise exception 'Not authorized'; end if;
  if selected.status <> 'draft' or selected.starts_at <= now() then raise exception 'Challenge cannot be published'; end if;
  select * into campaign from public.reward_campaigns where challenge_id = target_challenge;
  if campaign is null then raise exception 'Configure rewards before publishing'; end if;
  select coalesce(sum(weight), 0) into total_weight from public.reward_items where campaign_id = campaign.id;
  if campaign.mode = 'weighted_guaranteed' and total_weight <> 100 then raise exception 'Reward weights must total 100'; end if;
  select count(*) into inventory_count from private.reward_inventory i join public.reward_items r on r.id = i.reward_item_id where r.campaign_id = campaign.id;
  if campaign.enrollment_capacity is null or inventory_count < campaign.enrollment_capacity then raise exception 'Inventory must cover enrollment capacity'; end if;
  perform private.freeze_energy_baseline(target_challenge);
  update public.reward_campaigns set status = 'published' where id = campaign.id;
  update public.challenges set status = 'scheduled' where id = target_challenge;
end
$$;
grant execute on function public.publish_energy_challenge(uuid) to authenticated;

create or replace function public.add_reward_inventory(target_item uuid, codes text[])
returns integer language plpgsql security definer set search_path = public, private
as $$
declare campaign public.reward_campaigns; inserted integer;
begin
  select rc.* into campaign from public.reward_campaigns rc join public.reward_items ri on ri.campaign_id = rc.id where ri.id = target_item;
  if campaign is null or not public.is_university_admin(campaign.university_id) then raise exception 'Not authorized'; end if;
  if campaign.status <> 'draft' then raise exception 'Inventory is locked'; end if;
  if array_length(codes, 1) is null or array_length(codes, 1) > 5000 then raise exception 'Provide 1–5000 codes'; end if;
  insert into private.reward_inventory (reward_item_id, secret_code)
  select target_item, trim(code) from unnest(codes) code where trim(code) <> ''
  on conflict do nothing;
  get diagnostics inserted = row_count;
  return inserted;
end
$$;
grant execute on function public.add_reward_inventory(uuid, text[]) to authenticated;

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
      select 'residence'::text scope_type, challenge.residence_id scope_id
      union all
      select 'floor', f.id from public.floors f where f.residence_id = challenge.residence_id
    loop
      select coalesce(sum(e.expected_ac_kwh), 0), coalesce(sum(r.ac_kwh), 0)
      into expected, actual
      from public.energy_expected_intervals e
      join public.energy_meters m on m.id = e.meter_id
      join public.energy_readings r on r.meter_id = e.meter_id and r.recorded_at = e.interval_at
      where e.challenge_id = challenge.id and r.occupancy_ratio < threshold
        and (scope.scope_type = 'residence' or m.floor_id = scope.scope_id);
      saved := greatest(expected - actual, 0);
      target := greatest(expected * coalesce((challenge.configuration ->> 'targetPercent')::numeric, 12) / 100, 0.0001);
      insert into public.progress_snapshots (challenge_id, scope_type, scope_id, current_value, target_value, unit, verified, display_metrics)
      values (challenge.id, scope.scope_type, scope.scope_id, saved, target, 'kWh', true,
        jsonb_build_object('saved_kwh', saved, 'saved_percent', case when expected > 0 then saved / expected * 100 else 0 end, 'expected_kwh', expected, 'actual_kwh', actual));
      updated := updated + 1;
    end loop;

    delete from public.challenge_metric_points where challenge_id = challenge.id and metric_key = 'actual_kwh';
    insert into public.challenge_metric_points (challenge_id, scope_type, scope_id, metric_key, label, value, comparison_value, recorded_at)
    select challenge.id, 'residence', challenge.residence_id, 'actual_kwh',
      'D' || (e.interval_at::date - challenge.starts_at::date + 1)::text,
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
revoke all on function public.refresh_energy_progress() from public, anon, authenticated;

create or replace function public.finalize_due_challenges()
returns integer language plpgsql security definer set search_path = public, private
as $$
declare selected record; campaign_id uuid; successful boolean; finalized integer := 0;
begin
  perform public.refresh_energy_progress();
  for selected in select * from public.challenges where status = 'active' and ends_at <= now() for update
  loop
    select coalesce(ps.current_value >= ps.target_value, false) into successful
    from public.progress_snapshots ps where ps.challenge_id = selected.id and ps.scope_type = case when selected.scope = 'university' then 'university' else 'residence' end
    order by ps.recorded_at desc limit 1;
    update public.challenges set status = 'completed' where id = selected.id;
    select id into campaign_id from public.reward_campaigns where challenge_id = selected.id and status = 'published';
    if successful and campaign_id is not null then perform private.allocate_campaign_rewards(campaign_id);
    elsif campaign_id is not null then update public.reward_campaigns set status = 'cancelled' where id = campaign_id;
    end if;
    finalized := finalized + 1;
  end loop;
  return finalized;
end
$$;
revoke all on function public.finalize_due_challenges() from public, anon, authenticated;

create or replace function private.consume_redemption_token(raw_token text, acting_user uuid)
returns text language plpgsql security definer set search_path = public, private, extensions
as $$
declare selected private.reward_redemption_tokens; issuance public.reward_issuances; campaign public.reward_campaigns;
begin
  select * into selected from private.reward_redemption_tokens where token_hash = encode(digest(raw_token, 'sha256'), 'hex') for update;
  if selected is null or selected.consumed_at is not null or selected.expires_at <= now() then raise exception 'This redemption code is invalid or expired'; end if;
  select * into issuance from public.reward_issuances where id = selected.issuance_id;
  select * into campaign from public.reward_campaigns where id = issuance.campaign_id;
  if not exists (select 1 from public.reward_redeemer_scopes s where s.user_id = acting_user and s.university_id = campaign.university_id and s.active)
     and not exists (select 1 from public.organization_memberships m where m.user_id = acting_user and m.university_id = campaign.university_id and m.role = 'university_admin')
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
