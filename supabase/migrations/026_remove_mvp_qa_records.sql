-- Remove records created by the hosted admin CRUD verification.
delete from public.mvp_rewards where name = 'QA Reward Updated' and points_required = 9998;
delete from auth.users where email in ('qa.student@commongrid.demo', 'qa.updated@commongrid.demo');
