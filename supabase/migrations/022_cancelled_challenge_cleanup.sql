create or replace function public.delete_cancelled_challenge(target_challenge uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare selected public.challenges;
begin
  select * into selected from public.challenges where id=target_challenge for update;
  if selected is null or selected.status<>'cancelled' or not public.is_university_admin(selected.university_id) then raise exception 'Cancelled mission cannot be deleted'; end if;
  delete from public.inbox_reads where event_id in (select id from public.inbox_events where challenge_id=target_challenge);
  delete from public.inbox_events where challenge_id=target_challenge;
  delete from public.challenges where id=target_challenge;
end $$;
grant execute on function public.delete_cancelled_challenge(uuid) to authenticated;
