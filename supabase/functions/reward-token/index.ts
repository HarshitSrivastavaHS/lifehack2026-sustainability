import { createClient } from 'npm:@supabase/supabase-js@2';
import { bearer, cors, json, sha256 } from '../_shared/http.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const jwt = bearer(request); const url = Deno.env.get('SUPABASE_URL')!;
  const publicClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
  const { data: { user } } = await publicClient.auth.getUser(jwt);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  const { issuanceId } = await request.json();
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: issuance } = await admin.from('reward_issuances').select('id,user_id,revealed_at,inventory_id').eq('id', issuanceId).eq('user_id', user.id).maybeSingle();
  if (!issuance?.revealed_at) return json({ error: 'Reward is not available' }, 409);
  // Availability is checked atomically by issue_redemption_token.
  const token = `cg_${crypto.randomUUID()}_${crypto.randomUUID()}`;
  const expiresAt = new Date(Date.now() + 90_000).toISOString();
  const { error } = await admin.rpc('issue_redemption_token', { target_issuance: issuance.id, owner_user: user.id, hashed_token: await sha256(token), token_expires_at: expiresAt });
  if (error) return json({ error: error.message }, 500);
  return json({ token, expiresAt });
});
