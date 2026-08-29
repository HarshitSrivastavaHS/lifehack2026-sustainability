-- Restore the hosted acceptance test to the hackathon starting checkpoint.
delete from public.mvp_reward_redemptions
where student_id = md5('alice.morgan@commongrid.demo')::uuid
  and reward_id = md5('mvp-reward-washes')::uuid;

delete from public.mvp_university_reward_unlocks
where reward_id = md5('mvp-reward-washes')::uuid;

delete from public.mvp_electricity_savings
where request_id = '02400000-0000-4000-8000-000000000001'::uuid;
