create or replace function public.get_admin_reward_setup(target_challenge uuid)
returns jsonb language plpgsql security definer set search_path = public, private
as $$
declare campaign public.reward_campaigns; result jsonb;
begin
  select rc.* into campaign from public.reward_campaigns rc where rc.challenge_id = target_challenge;
  if campaign is null or not public.is_university_admin(campaign.university_id) then raise exception 'Not authorized'; end if;

  select jsonb_build_object(
    'campaignId', campaign.id,
    'status', campaign.status,
    'capacity', campaign.enrollment_capacity,
    'totalWeight', coalesce(sum(ri.weight), 0),
    'inventoryCount', coalesce(sum((select count(*) from private.reward_inventory inv where inv.reward_item_id = ri.id)), 0),
    'items', coalesce(jsonb_agg(jsonb_build_object(
      'id', ri.id,
      'title', ri.title,
      'description', ri.description,
      'displayValue', ri.display_value,
      'color', ri.color,
      'weight', ri.weight,
      'expiresAt', ri.expires_at,
      'inventoryCount', (select count(*) from private.reward_inventory inv where inv.reward_item_id = ri.id),
      'allocatedCount', (select count(*) from private.reward_inventory inv where inv.reward_item_id = ri.id and inv.claimed_by is not null)
    ) order by ri.title, ri.id) filter (where ri.id is not null), '[]'::jsonb)
  ) into result
  from public.reward_items ri
  where ri.campaign_id = campaign.id;
  return result;
end
$$;
grant execute on function public.get_admin_reward_setup(uuid) to authenticated;

create or replace function public.remove_reward_item(target_item uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare campaign public.reward_campaigns;
begin
  select rc.* into campaign
  from public.reward_campaigns rc join public.reward_items ri on ri.campaign_id = rc.id
  where ri.id = target_item;
  if campaign is null or campaign.status <> 'draft' or not public.is_university_admin(campaign.university_id) then
    raise exception 'Reward item is not editable';
  end if;
  delete from public.reward_items where id = target_item;
end
$$;
grant execute on function public.remove_reward_item(uuid) to authenticated;

create or replace function public.delete_draft_challenge(target_challenge uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare selected public.challenges;
begin
  select * into selected from public.challenges where id = target_challenge;
  if selected is null or selected.status <> 'draft' or not public.is_university_admin(selected.university_id) then
    raise exception 'Challenge draft cannot be deleted';
  end if;
  delete from public.challenges where id = target_challenge;
end
$$;
grant execute on function public.delete_draft_challenge(uuid) to authenticated;
