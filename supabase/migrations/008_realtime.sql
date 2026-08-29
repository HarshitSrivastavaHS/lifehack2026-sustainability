do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'progress_snapshots') then
    alter publication supabase_realtime add table public.progress_snapshots;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'challenges') then
    alter publication supabase_realtime add table public.challenges;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reward_issuances') then
    alter publication supabase_realtime add table public.reward_issuances;
  end if;
end
$$;
