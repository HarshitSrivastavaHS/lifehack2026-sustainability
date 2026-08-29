create or replace function public.publish_game_challenge(target_challenge uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare selected public.challenges;
begin
  select * into selected from public.challenges where id=target_challenge for update;
  if selected is null or selected.module_key='idle-ac' or not public.is_university_admin(selected.university_id) then raise exception 'Not authorized'; end if;
  if selected.status<>'draft' or selected.starts_at<=now() then raise exception 'Mission cannot be published'; end if;
  update public.challenges set status='scheduled' where id=target_challenge;
  insert into public.inbox_events(university_id,residence_id,challenge_id,title,body,kind)
  values(selected.university_id,selected.residence_id,selected.id,'New mission',selected.title||' is open to join.','challenge_published');
end $$;
grant execute on function public.publish_game_challenge(uuid) to authenticated;

create or replace function private.evaluate_achievements(target_user uuid)
returns integer language plpgsql security definer set search_path = public, private
as $$
declare definition record; member public.student_memberships; measured numeric; unlocked integer:=0;
begin
  select * into member from public.student_memberships where user_id=target_user;
  if member is null then return 0; end if;
  for definition in select * from public.achievement_definitions where active and (university_id is null or university_id=member.university_id)
  loop
    measured:=case definition.requirement->>'type'
      when 'actions' then (select count(*) from public.sustainable_action_logs where user_id=target_user)
      when 'walk_km' then (select coalesce(sum(quantity),0) from public.sustainable_action_logs where user_id=target_user and action_key in ('walk-km','cycle-km'))
      when 'waste_items' then (select coalesce(sum(quantity),0) from public.sustainable_action_logs where user_id=target_user and action_key='reusable-item' and logged_on>=current_date-6)
      when 'level' then public.current_level((select coalesce(sum(xp_delta),0) from public.game_events where user_id=target_user))
      else 0 end;
    insert into public.user_achievements(achievement_id,user_id,progress,unlocked_at)
    values(definition.id,target_user,measured,case when measured>=coalesce((definition.requirement->>'target')::numeric,1) then now() end)
    on conflict(achievement_id,user_id) do update set progress=greatest(public.user_achievements.progress,excluded.progress),
      unlocked_at=coalesce(public.user_achievements.unlocked_at,excluded.unlocked_at);
    if measured>=coalesce((definition.requirement->>'target')::numeric,1) then
      insert into public.game_events(user_id,university_id,event_type,source_type,source_id,xp_delta,metadata)
      values(target_user,member.university_id,'achievement','achievement',definition.id::text,definition.xp_reward,jsonb_build_object('title',definition.title))
      on conflict(user_id,event_type,source_type,source_id) do nothing;
      if found then unlocked:=unlocked+1; end if;
    end if;
  end loop;
  return unlocked;
end $$;

create or replace function public.log_sustainable_action(target_action text, target_quantity numeric default 1)
returns uuid language plpgsql security definer set search_path = public
as $$
declare member public.student_memberships; action public.sustainable_action_types; used numeric; log_id uuid; xp integer; points integer; impact jsonb; module text; mission record; next_value numeric;
begin
  select * into member from public.student_memberships where user_id=auth.uid();
  if member is null then raise exception 'Complete residence onboarding first'; end if;
  select * into action from public.sustainable_action_types where key=target_action and active and (university_id is null or university_id=member.university_id);
  if action is null then raise exception 'Action is unavailable'; end if;
  if target_quantity<=0 then raise exception 'Quantity must be positive'; end if;
  select coalesce(sum(quantity),0) into used from public.sustainable_action_logs where user_id=auth.uid() and action_key=target_action and logged_on=current_date;
  if used+target_quantity>action.daily_cap then raise exception 'Daily limit reached'; end if;
  xp:=round(action.xp_per_unit*target_quantity); points:=round(action.points_per_unit*target_quantity);
  select coalesce(jsonb_object_agg(key,to_jsonb((value::text)::numeric*target_quantity)),'{}'::jsonb) into impact from jsonb_each(action.impact_per_unit);
  insert into public.sustainable_action_logs(user_id,university_id,action_key,quantity,impact) values(auth.uid(),member.university_id,target_action,target_quantity,impact) returning id into log_id;
  insert into public.game_events(user_id,university_id,event_type,source_type,source_id,xp_delta,points_delta,metadata)
  values(auth.uid(),member.university_id,'action','action_log',log_id::text,xp,points,jsonb_build_object('action_key',target_action,'quantity',target_quantity));
  module:=case action.category when 'transport' then 'active-transport' when 'water' then 'water-wise' when 'waste' then 'zero-waste' else null end;
  if module is not null then
    for mission in select c.* from public.challenges c join public.challenge_rosters cr on cr.challenge_id=c.id and cr.user_id=auth.uid()
      where c.module_key=module and c.status='active' and c.university_id=member.university_id and (c.residence_id is null or c.residence_id=member.residence_id)
    loop
      next_value:=least(coalesce((mission.configuration->>'current')::numeric,0)+target_quantity,coalesce((mission.configuration->>'goal')::numeric,1));
      update public.challenges set configuration=jsonb_set(configuration,'{current}',to_jsonb(next_value)) where id=mission.id;
      insert into public.progress_snapshots(challenge_id,scope_type,scope_id,current_value,target_value,unit,verified,display_metrics)
      values(mission.id,case when mission.scope='university' then 'university' when mission.scope='floor' then 'floor' else 'residence' end,
        case when mission.scope='university' then mission.university_id when mission.scope='floor' then member.floor_id else mission.residence_id end,
        next_value,(mission.configuration->>'goal')::numeric,mission.configuration->>'unit',false,jsonb_build_object('estimated',true,'participants',(select count(*) from public.challenge_rosters where challenge_id=mission.id)));
    end loop;
  end if;
  perform private.evaluate_achievements(auth.uid());
  return log_id;
end $$;

create or replace function public.refresh_game_lifecycle()
returns integer language plpgsql security definer set search_path = public
as $$
declare mission record; changed integer:=0;
begin
  update public.challenges set status='active' where status='scheduled' and starts_at<=now();
  get diagnostics changed=row_count;
  for mission in select * from public.challenges where status='active' and module_key<>'idle-ac' and ends_at<=now() for update
  loop
    insert into public.game_events(user_id,university_id,event_type,source_type,source_id,xp_delta,points_delta,metadata,occurred_at)
    select cr.user_id,mission.university_id,'challenge_complete','challenge',mission.id::text,mission.xp_reward,mission.point_reward,jsonb_build_object('title',mission.title),now()
    from public.challenge_rosters cr where cr.challenge_id=mission.id and cr.eligible_for_reward
    on conflict(user_id,event_type,source_type,source_id) do nothing;
    update public.challenges set status='completed' where id=mission.id;
    insert into public.inbox_events(university_id,residence_id,challenge_id,title,body,kind)
    values(mission.university_id,mission.residence_id,mission.id,'Mission complete',mission.title||' is complete. Rewards have been added.','challenge_complete');
    changed:=changed+1;
  end loop;
  return changed;
end $$;
grant execute on function public.refresh_game_lifecycle() to authenticated;

do $$ begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname='common-grid-game-lifecycle';
    perform cron.schedule('common-grid-game-lifecycle','*/15 * * * *','select public.refresh_game_lifecycle()');
  end if;
end $$;
