create or replace function private.allocate_campaign_rewards(target_campaign uuid)
returns integer
language plpgsql
security definer
set search_path = public, private
as $$
declare
  campaign public.reward_campaigns;
  participant record;
  selected_item uuid;
  selected_inventory uuid;
  allocation_count integer := 0;
  eligible_count integer;
  available_count integer;
begin
  select * into campaign
  from public.reward_campaigns
  where id = target_campaign
  for update;

  if campaign is null then raise exception 'Unknown reward campaign'; end if;
  if campaign.status = 'allocated' then
    return (select count(*)::integer from public.reward_issuances where campaign_id = target_campaign);
  end if;
  if campaign.status <> 'published' then raise exception 'Campaign must be published'; end if;
  if not exists (
    select 1 from public.challenges
    where id = campaign.challenge_id and status = 'completed'
  ) then raise exception 'Challenge is not completed'; end if;

  select count(*) into eligible_count
  from public.challenge_rosters
  where challenge_id = campaign.challenge_id and eligible_for_reward;

  select count(*) into available_count
  from private.reward_inventory inv
  join public.reward_items item on item.id = inv.reward_item_id
  where item.campaign_id = target_campaign and inv.claimed_by is null;

  if available_count < eligible_count then
    raise exception 'Insufficient reward inventory: % available for % people', available_count, eligible_count;
  end if;

  for participant in
    select user_id from public.challenge_rosters
    where challenge_id = campaign.challenge_id and eligible_for_reward
    order by user_id
  loop
    if exists (
      select 1 from public.reward_issuances
      where campaign_id = target_campaign and user_id = participant.user_id
    ) then continue; end if;

    if campaign.mode = 'fixed_all' then
      select item.id into selected_item
      from public.reward_items item
      where item.campaign_id = target_campaign
        and exists (select 1 from private.reward_inventory inv where inv.reward_item_id = item.id and inv.claimed_by is null)
      order by item.id
      limit 1;
    else
      select item.id into selected_item
      from public.reward_items item
      where item.campaign_id = target_campaign and item.weight > 0
        and exists (select 1 from private.reward_inventory inv where inv.reward_item_id = item.id and inv.claimed_by is null)
      order by (-ln(greatest(random(), 0.000001)) / item.weight)
      limit 1;
    end if;

    select inv.id into selected_inventory
    from private.reward_inventory inv
    where inv.reward_item_id = selected_item and inv.claimed_by is null
    order by inv.id
    for update skip locked
    limit 1;

    if selected_inventory is null then raise exception 'Reward inventory changed during allocation'; end if;

    update private.reward_inventory
    set claimed_by = participant.user_id, claimed_at = now()
    where id = selected_inventory;

    insert into public.reward_issuances (
      campaign_id, reward_item_id, user_id, inventory_id
    ) values (
      target_campaign, selected_item, participant.user_id, selected_inventory
    ) on conflict (campaign_id, user_id) do nothing;

    allocation_count := allocation_count + 1;
  end loop;

  update public.reward_campaigns
  set status = 'allocated', allocated_at = now()
  where id = target_campaign;

  return allocation_count;
end
$$;

revoke all on function private.allocate_campaign_rewards(uuid) from public, anon, authenticated;

create or replace function public.reveal_my_reward(target_issuance uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.reward_issuances
  set revealed_at = coalesce(revealed_at, now())
  where id = target_issuance and user_id = auth.uid();
  if not found then raise exception 'Reward not found'; end if;
end
$$;

grant execute on function public.reveal_my_reward(uuid) to authenticated;
