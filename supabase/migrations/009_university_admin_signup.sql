create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  account_type text := coalesce(new.raw_user_meta_data ->> 'account_type', 'student');
  institution_name text := trim(coalesce(new.raw_user_meta_data ->> 'institution_name', ''));
  institution_website text := trim(coalesce(new.raw_user_meta_data ->> 'institution_website', ''));
  job_title text := trim(coalesce(new.raw_user_meta_data ->> 'job_title', ''));
  verification_note text := trim(coalesce(new.raw_user_meta_data ->> 'verification_note', ''));
  university_slug text;
  created_university public.universities;
begin
  insert into public.profiles (id, display_name, onboarding_complete)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    account_type = 'university_admin'
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    onboarding_complete = public.profiles.onboarding_complete or excluded.onboarding_complete,
    updated_at = now();

  if account_type = 'student' then
    return new;
  end if;
  if account_type <> 'university_admin' then
    raise exception 'Unsupported account type';
  end if;
  if institution_name = '' or length(institution_name) > 160 then
    raise exception 'University name is required and must be 160 characters or fewer';
  end if;
  if institution_website !~* '^https?://[^[:space:]]+$' or length(institution_website) > 500 then
    raise exception 'A valid official university website is required';
  end if;
  if job_title = '' or length(job_title) > 120 then
    raise exception 'University job title is required and must be 120 characters or fewer';
  end if;
  if verification_note = '' or length(verification_note) > 1000 then
    raise exception 'Verification note is required and must be 1000 characters or fewer';
  end if;

  university_slug := trim(both '-' from regexp_replace(lower(institution_name), '[^a-z0-9]+', '-', 'g'));
  university_slug := left(coalesce(nullif(university_slug, ''), 'university'), 80) || '-' || new.id::text;

  insert into public.universities (name, slug, status)
  values (institution_name, university_slug, 'approved')
  returning * into created_university;

  insert into public.organization_applications (
    applicant_id, kind, university_id, proposed_name, evidence, status, reviewed_by, reviewed_at
  ) values (
    new.id,
    'university',
    created_university.id,
    institution_name,
    jsonb_build_object(
      'official_website', institution_website,
      'job_title', job_title,
      'verification_note', verification_note,
      'automatic_approval', true
    ),
    'approved',
    new.id,
    now()
  );

  insert into public.organization_memberships (user_id, university_id, residence_id, role)
  values (new.id, created_university.id, null, 'university_admin')
  on conflict (user_id, university_id, role) do nothing;

  return new;
end
$$;
