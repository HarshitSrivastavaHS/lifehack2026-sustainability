create or replace function public.get_admin_users(search_text text default '')
returns table (user_id uuid, display_name text, email text, residence_name text, floor_name text, xp bigint, level integer, streak bigint, active boolean, joined_at timestamptz)
language plpgsql stable security definer set search_path = public, auth
as $$
declare admin_university uuid;
begin
  select om.university_id into admin_university from public.organization_memberships om
  where om.user_id=auth.uid() and om.role='university_admin' limit 1;
  if admin_university is null then raise exception 'Not authorized'; end if;
  return query select p.id,coalesce(p.display_name,''),coalesce(u.email,'')::text,r.name,f.name,
    coalesce(sum(ge.xp_delta),0)::bigint,public.current_level(coalesce(sum(ge.xp_delta),0)),
    (select count(distinct sal.logged_on) from public.sustainable_action_logs sal where sal.user_id=p.id and sal.logged_on>=current_date-6)::bigint,
    p.archived_at is null,p.created_at
  from public.student_memberships sm join public.profiles p on p.id=sm.user_id join auth.users u on u.id=p.id
  join public.residences r on r.id=sm.residence_id join public.floors f on f.id=sm.floor_id left join public.game_events ge on ge.user_id=p.id
  where sm.university_id=admin_university and (search_text='' or p.display_name ilike '%'||search_text||'%' or u.email ilike '%'||search_text||'%')
  group by p.id,u.email,r.name,f.name order by p.created_at desc;
end $$;
