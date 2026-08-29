# CommonGrid architecture

## Platform core and habit modules

The platform core owns authentication, organization membership, user habit preferences, challenge lifecycle, explicit roster enrollment, aggregate progress, notifications, rewards, and redemption.

A habit module supplies a versioned manifest, configuration validation, metric definitions, graph specifications, impact mappings, and student UI. Its server processor owns raw input validation, baseline generation, and verified calculations. Raw source tables remain module-specific. Adding a habit requires only its module, processor, registration, and data migration.

Energy uses an eight-week median baseline matched by weekday and 15-minute slot. Expected intervals are frozen when the challenge is published. Only readings below the configured aggregate occupancy threshold count toward verified savings.

## Runtime data flow

1. Supabase Auth restores the session from Expo SQLite-backed storage.
2. Database memberships determine the role; a role is never selected by the client.
3. Students choose enabled habits and explicitly join open challenges before roster lock.
4. A secret-authenticated Edge Function idempotently ingests BMS intervals.
5. Server functions write privacy-safe progress and graph points.
6. A scheduled job finalizes ended challenges and allocates rewards transactionally.
7. Students request a 90-second QR token; an authorized redeemer scans it and the database atomically records one redemption.

## Security boundaries

- Public clients receive only a publishable key.
- BMS, service-role, and ingestion secrets are Edge Function secrets.
- Raw readings, join-code hashes, unused voucher inventory, and redemption-token hashes are not client-readable.
- RLS and security-definer functions derive access from authenticated memberships.
- Team rankings require at least five verified members.
- Reward capacity is reserved before publication; allocation and finalization are idempotent.
- QR redemption requires connectivity and rejects expiry, replay, unauthorized redeemers, and already-used inventory.

## Adding another habit

1. Implement the client `ChallengeModule` and pure `HabitProcessor`.
2. Add its raw-data migration and secure ingestion adapter.
3. Register the module in the client registry and `challenge_modules`.
4. Add processor tests for validation, baseline behavior, progress, impact, and edge cases.
5. Reuse the core preference, enrollment, graph, reward, wallet, and redemption flows.
