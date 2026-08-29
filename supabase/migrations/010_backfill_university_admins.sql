do $$
declare
  account record;
  institution_name text;
  institution_website text;
  job_title text;
  verification_note text;
  university_slug text;
  created_university public.universities;
begin
  for account in
    select u.id, u.raw_user_meta_data
    from auth.users u
    where u.raw_user_meta_data ->> 'account_type' = 'university_admin'
      and not exists (
        select 1 from public.organization_memberships m
        where m.user_id = u.id and m.role = 'university_admin'
      )
  loop
    institution_name := trim(coalesce(account.raw_user_meta_data ->> 'institution_name', ''));
    institution_website := trim(coalesce(account.raw_user_meta_data ->> 'institution_website', ''));
    job_title := trim(coalesce(account.raw_user_meta_data ->> 'job_title', ''));
    verification_note := trim(coalesce(account.raw_user_meta_data ->> 'verification_note', ''));

    if institution_name = '' or length(institution_name) > 160
      or institution_website !~* '^https?://[^[:space:]]+$' or length(institution_website) > 500
      or job_title = '' or length(job_title) > 120
      or verification_note = '' or length(verification_note) > 1000
    then
      raise warning 'Skipping invalid university-admin metadata for user %', account.id;
      continue;
    end if;

    university_slug := trim(both '-' from regexp_replace(lower(institution_name), '[^a-z0-9]+', '-', 'g'));
    university_slug := left(coalesce(nullif(university_slug, ''), 'university'), 80) || '-' || account.id::text;

    insert into public.universities (name, slug, status)
    values (institution_name, university_slug, 'approved')
    on conflict (slug) do update set name = excluded.name
    returning * into created_university;

    insert into public.organization_applications (
      applicant_id, kind, university_id, proposed_name, evidence, status, reviewed_by, reviewed_at
    ) values (
      account.id,
      'university',
      created_university.id,
      institution_name,
      jsonb_build_object(
        'official_website', institution_website,
        'job_title', job_title,
        'verification_note', verification_note,
        'automatic_approval', true,
        'backfilled', true
      ),
      'approved',
      account.id,
      now()
    );

    insert into public.organization_memberships (user_id, university_id, residence_id, role)
    values (account.id, created_university.id, null, 'university_admin')
    on conflict (user_id, university_id, role) do nothing;

    update public.profiles
    set onboarding_complete = true, updated_at = now()
    where id = account.id;
  end loop;
end
$$;
