-- Development preview data only. Never run this against a production project.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@lifehack.demo', crypt('common-grid', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"University Admin"}', now(), now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student@lifehack.demo', crypt('common-grid', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Preview Student"}', now(), now())
on conflict (id) do nothing;

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '{"sub":"10000000-0000-0000-0000-000000000001","email":"admin@lifehack.demo"}', 'email', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '{"sub":"10000000-0000-0000-0000-000000000002","email":"student@lifehack.demo"}', 'email', now(), now(), now())
on conflict (provider_id, provider) do nothing;

insert into public.profiles (id, display_name, onboarding_complete) values
  ('10000000-0000-0000-0000-000000000001', 'University Admin', true),
  ('10000000-0000-0000-0000-000000000002', 'Preview Student', false)
on conflict (id) do update set display_name = excluded.display_name, onboarding_complete = excluded.onboarding_complete;

insert into public.universities (id, name, slug, status)
values ('20000000-0000-0000-0000-000000000001', 'LifeHack University', 'lifehack-university', 'approved')
on conflict (id) do nothing;
insert into public.residences (id, university_id, name, status)
values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Orchid Residence', 'approved')
on conflict (id) do nothing;
insert into public.floors (id, residence_id, name) values
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'Floor 2'),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'Floor 3'),
  ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', 'Floor 4'),
  ('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000001', 'Floor 5')
on conflict (id) do nothing;

insert into public.organization_memberships (user_id, university_id, role)
values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'university_admin')
on conflict do nothing;
insert into public.join_codes (id, residence_id, code_hash, expires_at, max_uses, created_by)
values ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
  encode(digest('ORCHID26', 'sha256'), 'hex'), now() + interval '30 days', 500, '10000000-0000-0000-0000-000000000001')
on conflict (id) do update set expires_at = excluded.expires_at, revoked_at = null;

insert into public.energy_meters (id, residence_id, floor_id, external_id)
values ('60000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004', 'ORCHID-F4-AC')
on conflict (id) do nothing;

insert into public.energy_readings (meter_id, recorded_at, interval_minutes, total_kwh, ac_kwh, occupancy_ratio, outdoor_temp_c, idempotency_key, source)
select '60000000-0000-0000-0000-000000000001',
  sample_at, 15, 2.4, 1.2 + (extract(hour from sample_at)::integer % 5) * 0.04,
  0.1, 30, 'preview-history-' || extract(epoch from sample_at)::bigint, 'preview-seed'
from generate_series(date_trunc('day', now()) - interval '8 weeks', date_trunc('day', now()) - interval '15 minutes', interval '15 minutes') sample_at
on conflict (idempotency_key) do nothing;

insert into public.challenges (id, university_id, residence_id, module_key, title, subtitle, scope, configuration, starts_at, ends_at, roster_locks_at, status, created_by)
values ('70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
  'idle-ac', 'Cool Smart Week', 'Switch off the AC when nobody is there.', 'residence',
  '{"targetPercent":12,"occupancyThreshold":0.2}', date_trunc('day', now()) + interval '1 day',
  date_trunc('day', now()) + interval '8 days', date_trunc('day', now()) + interval '1 day', 'draft',
  '10000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into public.reward_campaigns (id, challenge_id, university_id, mode, enrollment_capacity, redemption_starts_at, redemption_ends_at, created_by)
values ('80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
  'weighted_guaranteed', 3, now(), now() + interval '60 days', '10000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;
insert into public.reward_items (id, campaign_id, title, description, display_value, color, weight, expires_at) values
  ('90000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 'Campus coffee', 'Any regular drink', '$5', '#F7C85B', 55, now() + interval '60 days'),
  ('90000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000001', 'Dining credit', 'Valid at residence dining', '$10', '#73E6AF', 30, now() + interval '60 days'),
  ('90000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000001', 'Laundry credit', 'Two free wash cycles', '2×', '#79C8F2', 15, now() + interval '60 days')
on conflict (id) do nothing;
insert into private.reward_inventory (reward_item_id, secret_code) values
  ('90000000-0000-0000-0000-000000000001', 'PREVIEW-COFFEE-1'),
  ('90000000-0000-0000-0000-000000000002', 'PREVIEW-MEAL-1'),
  ('90000000-0000-0000-0000-000000000003', 'PREVIEW-LAUNDRY-1')
on conflict do nothing;
