-- Idempotent hosted demo fixture. Deterministic IDs keep reruns safe.
-- The linked CommonGrid project is a demo environment; unknown rows are preserved.
with demo_users(display_name,email,residence_key,floor_name,score_seed) as (values
  ('Maya Chen','maya.chen@commongrid.demo','orchid','Floor 4',23),
  ('Aarav Patel','aarav.patel@commongrid.demo','orchid','Floor 4',19),
  ('Sofia Martinez','sofia.martinez@commongrid.demo','orchid','Floor 4',17),
  ('Noah Williams','noah.williams@commongrid.demo','orchid','Floor 3',15),
  ('Amelia Tan','amelia.tan@commongrid.demo','orchid','Floor 3',21),
  ('Ethan Lim','ethan.lim@commongrid.demo','orchid','Floor 2',13),
  ('Priya Nair','priya.nair@commongrid.demo','maple','Level 5',20),
  ('Lucas Moreau','lucas.moreau@commongrid.demo','maple','Level 5',16),
  ('Hana Kim','hana.kim@commongrid.demo','maple','Level 4',24),
  ('Daniel Okafor','daniel.okafor@commongrid.demo','maple','Level 4',12),
  ('Isabella Rossi','isabella.rossi@commongrid.demo','maple','Level 3',18),
  ('Zayn Rahman','zayn.rahman@commongrid.demo','maple','Level 3',14),
  ('Olivia Johnson','olivia.johnson@commongrid.demo','harbour','North Wing',22),
  ('Kai Thompson','kai.thompson@commongrid.demo','harbour','North Wing',11),
  ('Nadia Hassan','nadia.hassan@commongrid.demo','harbour','East Wing',20),
  ('Leo García','leo.garcia@commongrid.demo','harbour','East Wing',9),
  ('Grace Walker','grace.walker@commongrid.demo','harbour','South Wing',17),
  ('Kenji Sato','kenji.sato@commongrid.demo','harbour','South Wing',15),
  ('Chloe Dubois','chloe.dubois@commongrid.demo','orchid','Floor 2',10),
  ('Marcus Lee','marcus.lee@commongrid.demo','orchid','Floor 5',14),
  ('Fatima Bello','fatima.bello@commongrid.demo','maple','Level 2',19),
  ('Theo Evans','theo.evans@commongrid.demo','harbour','West Wing',13)
)
insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select md5(email)::uuid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',email,
  extensions.crypt('common-grid',extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,jsonb_build_object('display_name',display_name,'account_type','student'),now(),now()
from demo_users on conflict (id) do update set raw_user_meta_data=excluded.raw_user_meta_data,updated_at=now();

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values (md5('admin@commongrid.demo')::uuid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin@commongrid.demo',
  extensions.crypt('common-grid',extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}',
  '{"display_name":"Dr. Elena Brooks"}',now(),now())
on conflict (id) do update set raw_user_meta_data=excluded.raw_user_meta_data,updated_at=now();

insert into auth.identities (provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
select email,md5(email)::uuid,jsonb_build_object('sub',md5(email)::uuid::text,'email',email),'email',now(),now(),now()
from (values
 ('maya.chen@commongrid.demo'),('aarav.patel@commongrid.demo'),('sofia.martinez@commongrid.demo'),('noah.williams@commongrid.demo'),
 ('amelia.tan@commongrid.demo'),('ethan.lim@commongrid.demo'),('priya.nair@commongrid.demo'),('lucas.moreau@commongrid.demo'),
 ('hana.kim@commongrid.demo'),('daniel.okafor@commongrid.demo'),('isabella.rossi@commongrid.demo'),('zayn.rahman@commongrid.demo'),
 ('olivia.johnson@commongrid.demo'),('kai.thompson@commongrid.demo'),('nadia.hassan@commongrid.demo'),('leo.garcia@commongrid.demo'),
 ('grace.walker@commongrid.demo'),('kenji.sato@commongrid.demo'),('chloe.dubois@commongrid.demo'),('marcus.lee@commongrid.demo'),
 ('fatima.bello@commongrid.demo'),('theo.evans@commongrid.demo'),('admin@commongrid.demo')) x(email)
on conflict (provider_id,provider) do nothing;

insert into public.universities(id,name,slug,status)
values (md5('demo-university')::uuid,'Northbridge University','northbridge-university','approved')
on conflict (id) do update set name=excluded.name,status='approved';

insert into public.residences(id,university_id,name,status) values
  (md5('res-orchid')::uuid,md5('demo-university')::uuid,'Orchid Residence','approved'),
  (md5('res-maple')::uuid,md5('demo-university')::uuid,'Maple Hall','approved'),
  (md5('res-harbour')::uuid,md5('demo-university')::uuid,'Harbour House','approved')
on conflict (id) do update set name=excluded.name,status='approved';

with floor_data(residence_key,floor_name) as (values
 ('orchid','Floor 2'),('orchid','Floor 3'),('orchid','Floor 4'),('orchid','Floor 5'),
 ('maple','Level 2'),('maple','Level 3'),('maple','Level 4'),('maple','Level 5'),
 ('harbour','North Wing'),('harbour','East Wing'),('harbour','South Wing'),('harbour','West Wing'))
insert into public.floors(id,residence_id,name)
select md5('floor-'||residence_key||'-'||floor_name)::uuid,md5('res-'||residence_key)::uuid,floor_name from floor_data
on conflict (id) do update set name=excluded.name;

insert into public.profiles(id,display_name,onboarding_complete,leaderboard_opt_in)
select md5(email)::uuid,display_name,true,(score_seed % 4 <> 0) from (values
  ('Maya Chen','maya.chen@commongrid.demo','orchid','Floor 4',23),('Aarav Patel','aarav.patel@commongrid.demo','orchid','Floor 4',19),('Sofia Martinez','sofia.martinez@commongrid.demo','orchid','Floor 4',17),
  ('Noah Williams','noah.williams@commongrid.demo','orchid','Floor 3',15),('Amelia Tan','amelia.tan@commongrid.demo','orchid','Floor 3',21),('Ethan Lim','ethan.lim@commongrid.demo','orchid','Floor 2',13),
  ('Priya Nair','priya.nair@commongrid.demo','maple','Level 5',20),('Lucas Moreau','lucas.moreau@commongrid.demo','maple','Level 5',16),('Hana Kim','hana.kim@commongrid.demo','maple','Level 4',24),
  ('Daniel Okafor','daniel.okafor@commongrid.demo','maple','Level 4',12),('Isabella Rossi','isabella.rossi@commongrid.demo','maple','Level 3',18),('Zayn Rahman','zayn.rahman@commongrid.demo','maple','Level 3',14),
  ('Olivia Johnson','olivia.johnson@commongrid.demo','harbour','North Wing',22),('Kai Thompson','kai.thompson@commongrid.demo','harbour','North Wing',11),('Nadia Hassan','nadia.hassan@commongrid.demo','harbour','East Wing',20),
  ('Leo García','leo.garcia@commongrid.demo','harbour','East Wing',9),('Grace Walker','grace.walker@commongrid.demo','harbour','South Wing',17),('Kenji Sato','kenji.sato@commongrid.demo','harbour','South Wing',15),
  ('Chloe Dubois','chloe.dubois@commongrid.demo','orchid','Floor 2',10),('Marcus Lee','marcus.lee@commongrid.demo','orchid','Floor 5',14),('Fatima Bello','fatima.bello@commongrid.demo','maple','Level 2',19),
  ('Theo Evans','theo.evans@commongrid.demo','harbour','West Wing',13)) d(display_name,email,residence_key,floor_name,score_seed)
on conflict (id) do update set display_name=excluded.display_name,onboarding_complete=true,leaderboard_opt_in=excluded.leaderboard_opt_in;

insert into public.profiles(id,display_name,onboarding_complete,leaderboard_opt_in)
values (md5('admin@commongrid.demo')::uuid,'Dr. Elena Brooks',true,false)
on conflict (id) do update set display_name=excluded.display_name,onboarding_complete=true;

insert into public.organization_memberships(user_id,university_id,residence_id,role)
values (md5('admin@commongrid.demo')::uuid,md5('demo-university')::uuid,null,'university_admin')
on conflict (user_id,university_id,role) do update set residence_id=null;

with demo_users(display_name,email,residence_key,floor_name,score_seed) as (values
  ('Maya Chen','maya.chen@commongrid.demo','orchid','Floor 4',23),('Aarav Patel','aarav.patel@commongrid.demo','orchid','Floor 4',19),('Sofia Martinez','sofia.martinez@commongrid.demo','orchid','Floor 4',17),
  ('Noah Williams','noah.williams@commongrid.demo','orchid','Floor 3',15),('Amelia Tan','amelia.tan@commongrid.demo','orchid','Floor 3',21),('Ethan Lim','ethan.lim@commongrid.demo','orchid','Floor 2',13),
  ('Priya Nair','priya.nair@commongrid.demo','maple','Level 5',20),('Lucas Moreau','lucas.moreau@commongrid.demo','maple','Level 5',16),('Hana Kim','hana.kim@commongrid.demo','maple','Level 4',24),
  ('Daniel Okafor','daniel.okafor@commongrid.demo','maple','Level 4',12),('Isabella Rossi','isabella.rossi@commongrid.demo','maple','Level 3',18),('Zayn Rahman','zayn.rahman@commongrid.demo','maple','Level 3',14),
  ('Olivia Johnson','olivia.johnson@commongrid.demo','harbour','North Wing',22),('Kai Thompson','kai.thompson@commongrid.demo','harbour','North Wing',11),('Nadia Hassan','nadia.hassan@commongrid.demo','harbour','East Wing',20),
  ('Leo García','leo.garcia@commongrid.demo','harbour','East Wing',9),('Grace Walker','grace.walker@commongrid.demo','harbour','South Wing',17),('Kenji Sato','kenji.sato@commongrid.demo','harbour','South Wing',15),
  ('Chloe Dubois','chloe.dubois@commongrid.demo','orchid','Floor 2',10),('Marcus Lee','marcus.lee@commongrid.demo','orchid','Floor 5',14),('Fatima Bello','fatima.bello@commongrid.demo','maple','Level 2',19),('Theo Evans','theo.evans@commongrid.demo','harbour','West Wing',13))
insert into public.student_memberships(user_id,university_id,residence_id,floor_id,verified_at)
select md5(email)::uuid,md5('demo-university')::uuid,md5('res-'||residence_key)::uuid,md5('floor-'||residence_key||'-'||floor_name)::uuid,now()-interval '4 months'
from demo_users on conflict (user_id) do update set university_id=excluded.university_id,residence_id=excluded.residence_id,floor_id=excluded.floor_id;

insert into public.join_codes(id,residence_id,code_hash,expires_at,max_uses,uses,created_by)
select md5('code-'||r.id::text)::uuid,r.id,encode(extensions.digest(upper(replace(r.name,' ',''))||'26','sha256'),'hex'),now()+interval '180 days',500,0,md5('admin@commongrid.demo')::uuid
from public.residences r where r.university_id=md5('demo-university')::uuid
on conflict (id) do update set expires_at=excluded.expires_at,revoked_at=null;

insert into public.energy_meters(id,residence_id,floor_id,external_id,active)
select md5('meter-'||f.id::text)::uuid,f.residence_id,f.id,'NBU-'||upper(substr(md5(f.id::text),1,8))||'-AC',true
from public.floors f join public.residences r on r.id=f.residence_id where r.university_id=md5('demo-university')::uuid
on conflict (id) do update set active=true;

insert into public.energy_readings(meter_id,recorded_at,interval_minutes,total_kwh,ac_kwh,occupancy_ratio,outdoor_temp_c,idempotency_key,source)
select m.id,slot,60,
  round((2.8 + extract(hour from slot)*0.025 + (get_byte(decode(substr(md5(m.id::text),1,2),'hex'),0)%8)*0.06)::numeric,3),
  round((1.45 + extract(hour from slot)*0.012 - least(extract(epoch from (now()-slot))/86400,42)*0.004 + (get_byte(decode(substr(md5(slot::text||m.id::text),1,2),'hex'),0)%10)*0.018)::numeric,3),
  case when extract(hour from slot) between 9 and 18 then .58 else .14 end,29.5 + sin(extract(epoch from slot)/86400)*2,
  'demo-'||m.id||'-'||extract(epoch from slot)::bigint,'demo-fixture'
from public.energy_meters m join public.residences r on r.id=m.residence_id
cross join generate_series(date_trunc('hour',now())-interval '42 days',date_trunc('hour',now())-interval '1 hour',interval '1 hour') slot
where r.university_id=md5('demo-university')::uuid on conflict (idempotency_key) do nothing;

insert into public.challenges(id,university_id,residence_id,module_key,title,subtitle,scope,configuration,starts_at,ends_at,roster_locks_at,status,created_by,challenge_kind,cadence,difficulty,xp_reward,point_reward,featured)
values
 (md5('challenge-campus-steps')::uuid,md5('demo-university')::uuid,null,'active-transport','Campus Steps Rally','Walk or cycle together to cross 500 km.','university','{"goal":500,"unit":"km","current":418}',date_trunc('day',now())-interval '9 days',date_trunc('day',now())+interval '5 days',date_trunc('day',now())+interval '4 days','active',md5('admin@commongrid.demo')::uuid,'community','event','epic',600,250,true),
 (md5('challenge-water-week')::uuid,md5('demo-university')::uuid,md5('res-orchid')::uuid,'water-wise','Five-Minute Shower Week','Keep showers short and protect the shared target.','residence','{"goal":140,"unit":"showers","current":96}',date_trunc('day',now())-interval '2 days',date_trunc('day',now())+interval '5 days',date_trunc('day',now())+interval '4 days','active',md5('admin@commongrid.demo')::uuid,'weekly','weekly','medium',300,120,false),
 (md5('challenge-zero-waste')::uuid,md5('demo-university')::uuid,null,'zero-waste','Zero Waste Sprint','Avoid 300 single-use items this week.','university','{"goal":300,"unit":"items","current":177}',date_trunc('day',now())-interval '1 day',date_trunc('day',now())+interval '6 days',date_trunc('day',now())+interval '5 days','active',md5('admin@commongrid.demo')::uuid,'weekly','weekly','hard',450,180,false),
 (md5('challenge-floor-clash')::uuid,md5('demo-university')::uuid,md5('res-maple')::uuid,'active-transport','Floor Clash: Maple','Every kilometre moves your floor up the table.','floor','{"goal":120,"unit":"km","current":0}',date_trunc('day',now())+interval '3 days',date_trunc('day',now())+interval '10 days',date_trunc('day',now())+interval '4 days','scheduled',md5('admin@commongrid.demo')::uuid,'competitive','weekly','hard',500,200,false),
 (md5('challenge-energy-complete')::uuid,md5('demo-university')::uuid,md5('res-harbour')::uuid,'idle-ac','Cool Smart Challenge','Reduce unnecessary cooling in shared spaces.','residence','{"targetPercent":12,"occupancyThreshold":0.2}',date_trunc('day',now())-interval '21 days',date_trunc('day',now())-interval '14 days',date_trunc('day',now())-interval '20 days','completed',md5('admin@commongrid.demo')::uuid,'community','event','hard',500,200,false)
on conflict (id) do update set configuration=excluded.configuration,starts_at=excluded.starts_at,ends_at=excluded.ends_at,roster_locks_at=excluded.roster_locks_at,status=excluded.status;

insert into public.challenge_rosters(challenge_id,user_id,floor_id,eligible_for_reward,joined_at)
select c.id,sm.user_id,sm.floor_id,true,greatest(c.starts_at-interval '2 days',now()-interval '30 days')
from public.challenges c join public.student_memberships sm on sm.university_id=c.university_id and (c.residence_id is null or sm.residence_id=c.residence_id)
where c.university_id=md5('demo-university')::uuid and (get_byte(decode(substr(md5(c.id::text||sm.user_id::text),1,2),'hex'),0)%5<>0)
on conflict do nothing;

insert into public.progress_snapshots(challenge_id,scope_type,scope_id,current_value,target_value,unit,verified,display_metrics,recorded_at)
values
 (md5('challenge-campus-steps')::uuid,'university',md5('demo-university')::uuid,418,500,'km',false,'{"walk_km":418,"co2_kg":71.5,"participants":19}',now()),
 (md5('challenge-water-week')::uuid,'residence',md5('res-orchid')::uuid,96,140,'showers',false,'{"water_l":3360,"participants":7}',now()),
 (md5('challenge-zero-waste')::uuid,'university',md5('demo-university')::uuid,177,300,'items',false,'{"waste_items":177,"co2_kg":7.1,"participants":17}',now()),
 (md5('challenge-energy-complete')::uuid,'residence',md5('res-harbour')::uuid,92.4,80,'kWh',true,'{"saved_kwh":92.4,"saved_percent":13.8,"expected_kwh":669.5,"actual_kwh":577.1}',now()-interval '14 days')
on conflict do nothing;

insert into public.challenge_metric_points(challenge_id,scope_type,scope_id,metric_key,label,value,comparison_value,recorded_at)
select md5('challenge-campus-steps')::uuid,'university',md5('demo-university')::uuid,'distance','D'||day_number,round((21+day_number*4.4+sin(day_number)*7)::numeric,1),null,date_trunc('day',now())+(day_number-9)*interval '1 day'
from generate_series(1,9) as series(day_number) on conflict do nothing;

insert into public.sustainable_action_logs(id,user_id,university_id,action_key,quantity,verification_source,impact,logged_on,created_at)
select md5('log-'||u.email||'-'||day_offset::text)::uuid,md5(u.email)::uuid,md5('demo-university')::uuid,
  case (day_offset+u.seed)%5 when 0 then 'walk-km' when 1 then 'short-shower' when 2 then 'reusable-item' when 3 then 'plant-meal' else 'switch-off' end,
  case when (day_offset+u.seed)%5=0 then 1+(u.seed%4) else 1 end,'self_reported',
  case (day_offset+u.seed)%5 when 0 then jsonb_build_object('walk_km',1+(u.seed%4),'co2_kg',round(((1+(u.seed%4))*.171)::numeric,3)) when 1 then '{"water_l":35}'::jsonb when 2 then '{"waste_items":1,"co2_kg":0.04}'::jsonb when 3 then '{"co2_kg":0.7}'::jsonb else '{"kwh":0.08,"co2_kg":0.0326}'::jsonb end,
  current_date-day_offset,(current_date-day_offset)::timestamptz+interval '18 hours'
from (values
 ('maya.chen@commongrid.demo',23),('aarav.patel@commongrid.demo',19),('sofia.martinez@commongrid.demo',17),('noah.williams@commongrid.demo',15),('amelia.tan@commongrid.demo',21),('ethan.lim@commongrid.demo',13),
 ('priya.nair@commongrid.demo',20),('lucas.moreau@commongrid.demo',16),('hana.kim@commongrid.demo',24),('daniel.okafor@commongrid.demo',12),('isabella.rossi@commongrid.demo',18),('zayn.rahman@commongrid.demo',14),
 ('olivia.johnson@commongrid.demo',22),('kai.thompson@commongrid.demo',11),('nadia.hassan@commongrid.demo',20),('leo.garcia@commongrid.demo',9),('grace.walker@commongrid.demo',17),('kenji.sato@commongrid.demo',15),
 ('chloe.dubois@commongrid.demo',10),('marcus.lee@commongrid.demo',14),('fatima.bello@commongrid.demo',19),('theo.evans@commongrid.demo',13)) u(email,seed)
cross join lateral generate_series(0,least(41,5+(u.seed%20))) as series(day_offset) on conflict (id) do nothing;

insert into public.game_events(id,user_id,university_id,event_type,source_type,source_id,xp_delta,points_delta,metadata,occurred_at)
select md5('event-'||l.id)::uuid,l.user_id,l.university_id,'action','action_log',l.id::text,
  case l.action_key when 'walk-km' then round(l.quantity*18) when 'short-shower' then 35 when 'reusable-item' then 24 when 'plant-meal' then 30 else 20 end,
  case l.action_key when 'walk-km' then round(l.quantity*7) when 'short-shower' then 14 when 'reusable-item' then 10 when 'plant-meal' then 12 else 8 end,
  jsonb_build_object('action_key',l.action_key,'quantity',l.quantity),l.created_at
from public.sustainable_action_logs l where l.university_id=md5('demo-university')::uuid on conflict (id) do nothing;

insert into public.achievement_definitions(id,university_id,key,title,description,icon,rarity,category,requirement,xp_reward,active) values
 (md5('achievement-first-steps')::uuid,null,'first-steps','First Steps','Log your first sustainable action.','✦','common','starter','{"type":"actions","target":1}',50,true),
 (md5('achievement-seven-streak')::uuid,null,'seven-streak','7 Day Streak','Show up for seven days in a row.','♨','rare','streak','{"type":"streak","target":7}',150,true),
 (md5('achievement-walking-warrior')::uuid,null,'walking-warrior','Walking Warrior','Walk 25 km instead of driving.','↗','rare','transport','{"type":"walk_km","target":25}',200,true),
 (md5('achievement-energy-saver')::uuid,null,'energy-saver','Energy Saver','Help complete a verified energy challenge.','↯','epic','energy','{"type":"energy_challenges","target":1}',300,true),
 (md5('achievement-community-mvp')::uuid,md5('demo-university')::uuid,'community-mvp','Community MVP','Reach the weekly top ten.','♛','epic','community','{"type":"weekly_rank","target":10}',350,true),
 (md5('achievement-zero-waste')::uuid,null,'zero-waste-week','Zero Waste Week','Avoid seven disposable items in one week.','♻','rare','waste','{"type":"waste_items","target":7}',180,true),
 (md5('achievement-grid-legend')::uuid,md5('demo-university')::uuid,'grid-legend','Grid Legend','Reach level 10.','◆','legendary','level','{"type":"level","target":10}',1000,true)
on conflict (id) do update set title=excluded.title,description=excluded.description,requirement=excluded.requirement,active=true;

insert into public.user_achievements(achievement_id,user_id,progress,unlocked_at)
select a.id,sm.user_id,
  case a.key when 'first-steps' then 1 when 'seven-streak' then least(7,3+(get_byte(decode(substr(md5(sm.user_id::text),1,2),'hex'),0)%8)) when 'walking-warrior' then 8+(get_byte(decode(substr(md5(sm.user_id::text),3,2),'hex'),0)%25) else 1 end,
  case when a.key='first-steps' or (a.key='seven-streak' and get_byte(decode(substr(md5(sm.user_id::text),1,2),'hex'),0)%3=0) or (a.key='community-mvp' and sm.user_id in (md5('maya.chen@commongrid.demo')::uuid,md5('hana.kim@commongrid.demo')::uuid)) then now()-interval '3 days' else null end
from public.student_memberships sm cross join public.achievement_definitions a
where sm.university_id=md5('demo-university')::uuid and a.key in ('first-steps','seven-streak','walking-warrior','community-mvp')
on conflict (achievement_id,user_id) do update set progress=excluded.progress,unlocked_at=excluded.unlocked_at;

insert into public.reward_offers(id,university_id,title,description,icon,color,points_cost,stock,active,expires_at,created_by) values
 (md5('offer-coffee')::uuid,md5('demo-university')::uuid,'Campus Coffee','Any regular drink at The Atrium.','☕','#F7C85B',180,24,true,now()+interval '60 days',md5('admin@commongrid.demo')::uuid),
 (md5('offer-laundry')::uuid,md5('demo-university')::uuid,'Laundry Credit','One wash cycle in your residence.','◎','#79C8F2',320,14,true,now()+interval '90 days',md5('admin@commongrid.demo')::uuid),
 (md5('offer-dining')::uuid,md5('demo-university')::uuid,'Dining Credit','Five dollars at a campus dining hall.','♧','#73E6AF',480,9,true,now()+interval '45 days',md5('admin@commongrid.demo')::uuid),
 (md5('offer-bottle')::uuid,md5('demo-university')::uuid,'Grid Bottle','Limited CommonGrid insulated bottle.','◈','#AE8BFA',900,4,true,now()+interval '120 days',md5('admin@commongrid.demo')::uuid)
on conflict (id) do update set stock=excluded.stock,active=true,expires_at=excluded.expires_at;

insert into public.reward_claims(id,offer_id,user_id,points_spent,status,claimed_at,fulfilled_at) values
 (md5('claim-hana-coffee')::uuid,md5('offer-coffee')::uuid,md5('hana.kim@commongrid.demo')::uuid,180,'fulfilled',now()-interval '8 days',now()-interval '7 days'),
 (md5('claim-olivia-laundry')::uuid,md5('offer-laundry')::uuid,md5('olivia.johnson@commongrid.demo')::uuid,320,'claimed',now()-interval '2 days',null),
 (md5('claim-maya-coffee')::uuid,md5('offer-coffee')::uuid,md5('maya.chen@commongrid.demo')::uuid,180,'fulfilled',now()-interval '12 days',now()-interval '11 days')
on conflict (id) do nothing;

insert into public.game_events(id,user_id,university_id,event_type,source_type,source_id,xp_delta,points_delta,metadata,occurred_at)
select md5('event-claim-'||c.id)::uuid,c.user_id,md5('demo-university')::uuid,'reward_claim','reward_offer',c.id::text,0,-c.points_spent,jsonb_build_object('offer_id',c.offer_id),c.claimed_at
from public.reward_claims c join public.reward_offers o on o.id=c.offer_id where o.university_id=md5('demo-university')::uuid on conflict (id) do nothing;

insert into public.inbox_events(id,university_id,residence_id,challenge_id,title,body,kind,created_at) values
 (md5('inbox-rally')::uuid,md5('demo-university')::uuid,null,md5('challenge-campus-steps')::uuid,'The finish line is close','Campus Steps Rally is 82% complete.','challenge_progress',now()-interval '3 hours'),
 (md5('inbox-rewards')::uuid,md5('demo-university')::uuid,null,null,'New reward drop','Four rewards are now available in the store.','reward_drop',now()-interval '2 days'),
 (md5('inbox-maple')::uuid,md5('demo-university')::uuid,md5('res-maple')::uuid,md5('challenge-floor-clash')::uuid,'Floor Clash starts soon','Build your team before the roster locks.','challenge_upcoming',now()-interval '1 day')
on conflict (id) do update set title=excluded.title,body=excluded.body,created_at=excluded.created_at;

insert into public.user_habit_preferences(user_id,module_key,enabled,notifications_enabled)
select sm.user_id,m.key,true,true from public.student_memberships sm cross join public.challenge_modules m
where sm.university_id=md5('demo-university')::uuid and m.key in ('idle-ac','active-transport','water-wise','zero-waste')
on conflict (user_id,module_key) do update set enabled=true,notifications_enabled=true;
