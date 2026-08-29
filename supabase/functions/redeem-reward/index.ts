import { createClient } from 'npm:@supabase/supabase-js@2';
import { bearer, cors, json } from '../_shared/http.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const jwt = bearer(request); const url = Deno.env.get('SUPABASE_URL')!;
  const publicClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
  const { data: { user } } = await publicClient.auth.getUser(jwt);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  const { token } = await request.json();
  if (typeof token !== 'string' || token.length > 200) return json({ error: 'Invalid code' }, 422);
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await admin.rpc('consume_redemption_token_service', { raw_token: token, acting_user: user.id });
  if (error) return json({ error: error.message }, 409);
  return json({ message: data });
});
