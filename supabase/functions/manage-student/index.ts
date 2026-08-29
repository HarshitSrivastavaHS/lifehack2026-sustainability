import { createClient } from 'npm:@supabase/supabase-js@2';
import { bearer, cors, json } from '../_shared/http.ts';

type StudentRequest = {
  action?: 'create' | 'update';
  id?: string;
  name?: string;
  email?: string;
  password?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const jwt = bearer(request);
  const url = Deno.env.get('SUPABASE_URL')!;
  const publicClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: { user } } = await publicClient.auth.getUser(jwt);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: actor } = await admin.from('profiles')
    .select('app_role,active,mvp_university_id')
    .eq('id', user.id)
    .maybeSingle();
  if (!actor || actor.app_role !== 'admin' || !actor.active) return json({ error: 'Admin access required' }, 403);

  let body: StudentRequest;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  const action = body.action;
  const name = body.name?.trim() ?? '';
  const email = body.email?.trim().toLowerCase() ?? '';
  if (name.length < 2 || name.length > 80) return json({ error: 'Name must be 2 to 80 characters' }, 422);
  if (!emailPattern.test(email) || email.length > 254) return json({ error: 'Enter a valid email address' }, 422);

  if (action === 'create') {
    if (!body.password || body.password.length < 8 || body.password.length > 72) {
      return json({ error: 'Temporary password must be 8 to 72 characters' }, 422);
    }
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: body.password,
      email_confirm: true,
      user_metadata: { display_name: name, account_type: 'student' },
    });
    if (createError || !created.user) return json({ error: createError?.message ?? 'Could not create student' }, 409);

    const { error: profileError } = await admin.from('profiles').upsert({
      id: created.user.id,
      display_name: name,
      email,
      app_role: 'student',
      active: true,
      mvp_university_id: actor.mvp_university_id,
      onboarding_complete: true,
      updated_at: new Date().toISOString(),
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: profileError.message }, 409);
    }
    return json({ id: created.user.id, message: 'Student added' }, 201);
  }

  if (action === 'update') {
    if (!body.id) return json({ error: 'Student is required' }, 422);
    const { data: target } = await admin.from('profiles').select('id,app_role').eq('id', body.id).maybeSingle();
    if (!target || target.app_role !== 'student') return json({ error: 'Student not found' }, 404);

    const { error: authError } = await admin.auth.admin.updateUserById(body.id, {
      email,
      email_confirm: true,
      user_metadata: { display_name: name, account_type: 'student' },
    });
    if (authError) return json({ error: authError.message }, 409);

    const { error: profileError } = await admin.from('profiles').update({
      display_name: name,
      email,
      updated_at: new Date().toISOString(),
    }).eq('id', body.id).eq('app_role', 'student');
    if (profileError) return json({ error: profileError.message }, 409);
    return json({ id: body.id, message: 'Student updated' });
  }

  return json({ error: 'Unsupported action' }, 422);
});
