export const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ingestion-secret' };
export function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } }); }
export function bearer(request: Request) { return request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''; }
export async function sha256(value: string) { const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)); return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join(''); }
