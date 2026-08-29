drop policy if exists own_commitments_insert on public.daily_commitments;
create policy own_commitments_insert on public.daily_commitments for insert to authenticated with check (
  user_id = (select auth.uid())
  and commitment_date = current_date
  and exists (
    select 1 from public.challenge_rosters cr
    join public.challenges c on c.id = cr.challenge_id
    where cr.challenge_id = daily_commitments.challenge_id
      and cr.user_id = (select auth.uid())
      and c.status = 'active'
      and c.starts_at <= now()
      and c.ends_at > now()
  )
);
