create or replace function public.create_energy_challenge(
  target_residence uuid, challenge_title text, challenge_subtitle text, challenge_starts_at timestamptz,
  target_percent numeric, participant_capacity integer
) returns uuid language plpgsql security definer set search_path = public
as $$
declare university uuid; challenge_id uuid; user_id uuid := auth.uid();
begin
  select university_id into university from public.residences where id = target_residence and status = 'approved';
  if university is null or not public.is_university_admin(university) then raise exception 'Not authorized'; end if;
  if length(trim(challenge_title)) < 3 or length(trim(challenge_subtitle)) < 3 then raise exception 'Add a title and action'; end if;
  if challenge_starts_at <= now() or target_percent < 1 or target_percent > 30 or participant_capacity < 1 then raise exception 'Invalid challenge settings'; end if;
  insert into public.challenges (university_id, residence_id, module_key, title, subtitle, scope, configuration,
    starts_at, ends_at, roster_locks_at, status, created_by)
  values (university, target_residence, 'idle-ac', trim(challenge_title), trim(challenge_subtitle), 'residence',
    jsonb_build_object('targetPercent', target_percent, 'occupancyThreshold', 0.2),
    challenge_starts_at, challenge_starts_at + interval '7 days', challenge_starts_at, 'draft', user_id)
  returning id into challenge_id;
  insert into public.reward_campaigns (challenge_id, university_id, mode, enrollment_capacity, created_by)
  values (challenge_id, university, 'weighted_guaranteed', participant_capacity, user_id);
  return challenge_id;
end
$$;
grant execute on function public.create_energy_challenge(uuid, text, text, timestamptz, numeric, integer) to authenticated;

create or replace function public.add_reward_item(
  target_challenge uuid, reward_title text, reward_description text, reward_value text, reward_color text,
  reward_weight integer, reward_expires_at timestamptz
) returns uuid language plpgsql security definer set search_path = public
as $$
declare campaign public.reward_campaigns; item_id uuid;
begin
  select rc.* into campaign from public.reward_campaigns rc where rc.challenge_id = target_challenge;
  if campaign is null or campaign.status <> 'draft' or not public.is_university_admin(campaign.university_id) then raise exception 'Campaign is not editable'; end if;
  if length(trim(reward_title)) < 2 or reward_weight < 0 or reward_weight > 100 or reward_expires_at <= now() then raise exception 'Invalid reward settings'; end if;
  insert into public.reward_items (campaign_id, title, description, display_value, color, weight, expires_at)
  values (campaign.id, trim(reward_title), trim(reward_description), trim(reward_value), reward_color, reward_weight, reward_expires_at)
  returning id into item_id;
  return item_id;
end
$$;
grant execute on function public.add_reward_item(uuid, text, text, text, text, integer, timestamptz) to authenticated;
