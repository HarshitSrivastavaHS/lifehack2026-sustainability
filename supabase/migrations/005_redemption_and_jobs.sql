insert into public.profiles (id, display_name)
select id, coalesce(raw_user_meta_data ->> 'display_name', split_part(email, '@', 1))
from auth.users on conflict (id) do nothing;

create or replace function public.issue_redemption_token(
  target_issuance uuid, owner_user uuid, hashed_token text, token_expires_at timestamptz
) returns void language plpgsql security definer set search_path = public, private
as $$
declare issuance public.reward_issuances; inventory private.reward_inventory;
begin
  if token_expires_at <= now() or token_expires_at > now() + interval '2 minutes' then raise exception 'Invalid expiry'; end if;
  select * into issuance from public.reward_issuances where id = target_issuance and user_id = owner_user and revealed_at is not null;
  if issuance is null then raise exception 'Reward is not available'; end if;
  select * into inventory from private.reward_inventory where id = issuance.inventory_id;
  if inventory.redeemed_at is not null then raise exception 'Reward was already redeemed'; end if;
  update private.reward_redemption_tokens set consumed_at = now()
    where issuance_id = target_issuance and consumed_at is null;
  insert into private.reward_redemption_tokens (issuance_id, token_hash, expires_at)
  values (target_issuance, hashed_token, token_expires_at);
end
$$;
revoke all on function public.issue_redemption_token(uuid, uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.issue_redemption_token(uuid, uuid, text, timestamptz) to service_role;

create or replace function public.consume_redemption_token_service(raw_token text, acting_user uuid)
returns text language sql security definer set search_path = public, private
as $$ select private.consume_redemption_token(raw_token, acting_user) $$;
revoke all on function public.consume_redemption_token_service(text, uuid) from public, anon, authenticated;
grant execute on function public.consume_redemption_token_service(text, uuid) to service_role;

create or replace function public.get_challenge_participation(target_challenge uuid)
returns table (checked_count bigint, roster_count bigint)
language sql security definer set search_path = public
as $$
  select count(*) filter (where dc.user_id is not null), count(*)
  from public.challenge_rosters cr
  left join public.daily_commitments dc on dc.challenge_id = cr.challenge_id
    and dc.user_id = cr.user_id and dc.commitment_date = current_date
  where cr.challenge_id = target_challenge and (
    exists (select 1 from public.challenge_rosters mine where mine.challenge_id = target_challenge and mine.user_id = auth.uid())
    or exists (select 1 from public.challenges c where c.id = target_challenge and public.is_university_admin(c.university_id))
  )
$$;

create or replace function public.get_challenge_league(target_challenge uuid)
returns table (scope_id uuid, scope_label text, score numeric, participant_count bigint, commitment_count bigint)
language sql security definer set search_path = public
as $$
  select ps.scope_id as scope_id, f.name as scope_label,
    coalesce((ps.display_metrics ->> 'saved_percent')::numeric, 0) as score,
    count(distinct cr.user_id) as participant_count,
    count(distinct dc.user_id) as commitment_count
  from public.progress_snapshots ps
  join public.floors f on f.id = ps.scope_id
  join public.challenge_rosters cr on cr.challenge_id = ps.challenge_id and cr.floor_id = ps.scope_id
  left join public.daily_commitments dc on dc.challenge_id = cr.challenge_id and dc.user_id = cr.user_id and dc.commitment_date = current_date
  where ps.challenge_id = target_challenge and ps.scope_type = 'floor'
    and (exists (select 1 from public.challenge_rosters mine where mine.challenge_id = target_challenge and mine.user_id = auth.uid())
      or exists (select 1 from public.challenges c where c.id = target_challenge and public.is_university_admin(c.university_id)))
    and ps.recorded_at = (select max(latest.recorded_at) from public.progress_snapshots latest where latest.challenge_id = ps.challenge_id and latest.scope_id = ps.scope_id)
  group by ps.scope_id, f.name, ps.display_metrics
  having count(distinct cr.user_id) >= 5
  order by score desc
$$;

create extension if not exists pg_cron;
select cron.schedule('common-grid-finalize', '*/5 * * * *', 'select public.finalize_due_challenges()')
where not exists (select 1 from cron.job where jobname = 'common-grid-finalize');
