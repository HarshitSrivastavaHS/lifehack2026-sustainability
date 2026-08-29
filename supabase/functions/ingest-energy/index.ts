import { createClient } from 'npm:@supabase/supabase-js@2';
import { cors, json } from '../_shared/http.ts';

interface Reading {
  externalMeterId: string; recordedAt: string; intervalMinutes: number; totalKwh: number;
  acKwh: number; occupancyRatio?: number; outdoorTempC?: number; idempotencyKey: string;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const expectedSecret = Deno.env.get('BMS_INGESTION_SECRET');
  if (!expectedSecret || request.headers.get('x-ingestion-secret') !== expectedSecret) return json({ error: 'Unauthorized' }, 401);

  let body: { source?: string; readings?: Reading[] };
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!Array.isArray(body.readings) || body.readings.length < 1 || body.readings.length > 1000) return json({ error: 'Provide 1–1000 readings' }, 400);

  const rows: Record<string, unknown>[] = [];
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  for (const [index, reading] of body.readings.entries()) {
    if (!reading.externalMeterId || !reading.idempotencyKey || !Number.isFinite(reading.acKwh) || reading.acKwh < 0 ||
        !Number.isFinite(reading.totalKwh) || reading.totalKwh < reading.acKwh || !Number.isInteger(reading.intervalMinutes) ||
        reading.intervalMinutes < 1 || Number.isNaN(Date.parse(reading.recordedAt)) ||
        (reading.occupancyRatio != null && (reading.occupancyRatio < 0 || reading.occupancyRatio > 1))) {
      return json({ error: `Invalid reading at index ${index}` }, 422);
    }
    const { data: meter } = await client.from('energy_meters').select('id').eq('external_id', reading.externalMeterId).eq('active', true).maybeSingle();
    if (!meter) return json({ error: `Unknown meter at index ${index}` }, 422);
    rows.push({ meter_id: meter.id, recorded_at: reading.recordedAt, interval_minutes: reading.intervalMinutes,
      total_kwh: reading.totalKwh, ac_kwh: reading.acKwh, occupancy_ratio: reading.occupancyRatio ?? null,
      outdoor_temp_c: reading.outdoorTempC ?? null, idempotency_key: reading.idempotencyKey, source: body.source ?? 'bms' });
  }
  const { error } = await client.from('energy_readings').upsert(rows, { onConflict: 'idempotency_key', ignoreDuplicates: true });
  if (error) return json({ error: error.message }, 500);
  await client.rpc('finalize_due_challenges');
  return json({ accepted: rows.length });
});
