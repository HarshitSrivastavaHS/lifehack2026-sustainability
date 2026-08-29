-- Historical season awards create visibly different demo levels and point balances.
with demo_scores(email,score_seed) as (values
 ('maya.chen@commongrid.demo',23),('aarav.patel@commongrid.demo',19),('sofia.martinez@commongrid.demo',17),('noah.williams@commongrid.demo',15),('amelia.tan@commongrid.demo',21),('ethan.lim@commongrid.demo',13),
 ('priya.nair@commongrid.demo',20),('lucas.moreau@commongrid.demo',16),('hana.kim@commongrid.demo',24),('daniel.okafor@commongrid.demo',12),('isabella.rossi@commongrid.demo',18),('zayn.rahman@commongrid.demo',14),
 ('olivia.johnson@commongrid.demo',22),('kai.thompson@commongrid.demo',11),('nadia.hassan@commongrid.demo',20),('leo.garcia@commongrid.demo',9),('grace.walker@commongrid.demo',17),('kenji.sato@commongrid.demo',15),
 ('chloe.dubois@commongrid.demo',10),('marcus.lee@commongrid.demo',14),('fatima.bello@commongrid.demo',19),('theo.evans@commongrid.demo',13))
insert into public.game_events(id,user_id,university_id,event_type,source_type,source_id,xp_delta,points_delta,metadata,occurred_at)
select md5('historical-season-'||email)::uuid,md5(email)::uuid,md5('demo-university')::uuid,'admin_adjustment','demo_history','season-2026',
  score_seed*250+case when email='hana.kim@commongrid.demo' then 6500 else 0 end,
  100+score_seed*20,jsonb_build_object('reason','Historical challenge awards'),now()-interval '7 days'
from demo_scores on conflict(user_id,event_type,source_type,source_id) do update set xp_delta=excluded.xp_delta,points_delta=excluded.points_delta,metadata=excluded.metadata;
