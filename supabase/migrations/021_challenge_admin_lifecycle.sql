create or replace function public.update_challenge_draft(target_challenge uuid, challenge_title text, challenge_subtitle text, goal_value numeric, reward_xp integer, reward_points integer)
returns void language plpgsql security definer set search_path = public
as $$
declare selected public.challenges;
begin
  select * into selected from public.challenges where id=target_challenge for update;
  if selected is null or selected.status<>'draft' or not public.is_university_admin(selected.university_id) then raise exception 'Draft cannot be edited'; end if;
  if length(trim(challenge_title))<3 or length(trim(challenge_subtitle))<3 or goal_value<=0 or reward_xp<0 or reward_points<0 then raise exception 'Invalid mission settings'; end if;
  update public.challenges set title=trim(challenge_title),subtitle=trim(challenge_subtitle),
    configuration=case when module_key='idle-ac' then jsonb_set(configuration,'{targetPercent}',to_jsonb(goal_value)) else jsonb_set(configuration,'{goal}',to_jsonb(goal_value)) end,
    xp_reward=reward_xp,point_reward=reward_points where id=target_challenge;
end $$;
grant execute on function public.update_challenge_draft(uuid,text,text,numeric,integer,integer) to authenticated;

create or replace function public.cancel_challenge(target_challenge uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare selected public.challenges;
begin
  select * into selected from public.challenges where id=target_challenge for update;
  if selected is null or selected.status not in ('scheduled','active') or not public.is_university_admin(selected.university_id) then raise exception 'Mission cannot be cancelled'; end if;
  update public.challenges set status='cancelled' where id=target_challenge;
  update public.reward_campaigns set status='cancelled' where challenge_id=target_challenge and status in ('draft','published');
  insert into public.inbox_events(university_id,residence_id,challenge_id,title,body,kind)
  values(selected.university_id,selected.residence_id,selected.id,'Mission cancelled',selected.title||' has been cancelled.','challenge_cancelled');
end $$;
grant execute on function public.cancel_challenge(uuid) to authenticated;
