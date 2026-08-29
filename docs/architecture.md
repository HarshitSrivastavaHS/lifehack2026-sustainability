# CommonGrid architecture

CommonGrid separates its stable platform core from behavior-specific challenge modules.

## Runtime modes

The checked-in app starts in local demo mode so the full judging flow works without credentials:

1. Choose Student demo and complete university/residence onboarding with the prefilled join code.
2. Explore the daily commitment, verified progress, league, impact, and locked wallet.
3. Sign out and choose University admin.
4. Advance the simulated BMS feed to day 7.
5. Return to the student account and reveal the issued voucher.

The Supabase client in `src/lib/supabase.ts` activates when both public environment variables are set. Apply
`supabase/migrations/001_initial.sql` to a project before replacing the demo repository with Supabase queries.
Disable **Confirm email** for the hackathon password flow; production should use university SSO or custom SMTP.

## Challenge modules

The generic contract lives in `src/core/challenges/types.ts`; installed modules are listed in
`src/core/challenges/registry.ts`. A module owns:

- validated configuration;
- raw sample normalization;
- verified progress and impact calculation;
- module-specific student/admin renderers;
- its typed database tables and ingestion adapter.

The core owns organizations, memberships, challenge lifecycle, rosters, commitments, generic progress, rewards,
wallets, and audit events. Adding walking therefore does not change energy tables or reward/auth logic.

## Adding a walking module

1. Add `src/features/challenges/walking/module.tsx` implementing `ChallengeModule`.
2. Add a walking migration for device connections and step/distance samples.
3. Register the module in the client registry and `challenge_modules`.
4. Add an Edge Function that validates provider samples and writes progress snapshots.

Expo SDK 57's basic pedometer does not receive background updates, so a production walking module should use
Health Connect on Android and HealthKit on iOS rather than silently claiming complete passive tracking.

## Security boundaries

- Only aggregate progress is student-readable.
- Raw meter/occupancy samples and unassigned voucher codes are never exposed through public tables.
- Organization roles come from database memberships, never client-provided profile fields.
- Join codes are hashed and redeemed atomically.
- Challenge finalization and reward allocation are server-side and idempotent.
- Service-role and ingestion secrets must never use an `EXPO_PUBLIC_` variable.
