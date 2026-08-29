-- Hosted GoTrue expects non-null token fields and canonical identity provider IDs.
with demo_emails(email) as (values
 ('maya.chen@commongrid.demo'),('aarav.patel@commongrid.demo'),('sofia.martinez@commongrid.demo'),('noah.williams@commongrid.demo'),
 ('amelia.tan@commongrid.demo'),('ethan.lim@commongrid.demo'),('priya.nair@commongrid.demo'),('lucas.moreau@commongrid.demo'),
 ('hana.kim@commongrid.demo'),('daniel.okafor@commongrid.demo'),('isabella.rossi@commongrid.demo'),('zayn.rahman@commongrid.demo'),
 ('olivia.johnson@commongrid.demo'),('kai.thompson@commongrid.demo'),('nadia.hassan@commongrid.demo'),('leo.garcia@commongrid.demo'),
 ('grace.walker@commongrid.demo'),('kenji.sato@commongrid.demo'),('chloe.dubois@commongrid.demo'),('marcus.lee@commongrid.demo'),
 ('fatima.bello@commongrid.demo'),('theo.evans@commongrid.demo'),('admin@commongrid.demo'))
update auth.users u set confirmation_token='',recovery_token='',email_change_token_new='',email_change='',reauthentication_token='',
  email_confirmed_at=coalesce(u.email_confirmed_at,now()),updated_at=now()
from demo_emails d where u.email=d.email;

delete from auth.identities i using auth.users u
where i.user_id=u.id and u.email like '%@commongrid.demo';

insert into auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
select u.id::text,u.id,jsonb_build_object('sub',u.id::text,'email',u.email,'email_verified',true,'phone_verified',false),'email',now(),now(),now()
from auth.users u where u.email like '%@commongrid.demo'
on conflict (provider_id,provider) do update set identity_data=excluded.identity_data,updated_at=now();
