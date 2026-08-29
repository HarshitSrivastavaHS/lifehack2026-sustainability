# Project State

## Current objective

Deliver a very small hackathon MVP for one university: student electricity savings award points, advance a shared university milestone, unlock rewards, and allow one redemption per student.

## Architecture and important decisions

- Expo SDK 57 / React Native 0.86 / React 19.2 with one Expo Router entry route.
- Supabase Auth persists sessions through platform-specific storage. `profiles.app_role` exposes only `student` and `admin`; Dr. Elena Brooks is the sole active admin.
- The client uses focused JSON read models and security-definer mutations from migration `024_hackathon_mvp.sql`.
- Electricity records are immutable. The backend calculates `1 kWh = 10 points`, updates aggregate progress, and unlocks reached rewards atomically and idempotently.
- The `manage-student` Edge Function creates/edits Auth users after verifying the active admin. Public signup is absent and new external signups remain inactive.
- Legacy organization, challenge, analytics, inventory, and QR database infrastructure remains for migration safety but is not queried or exposed.

## User requirements and constraints

- One university, students, and one admin only.
- No residences, floors, groups, missions, challenges, XP, levels, streaks, achievements, leaderboards, other environmental metrics, QR codes, or complex analytics.
- Student: personal kWh/points, university progress, rewards, redemption, and history.
- Admin: dashboard, student account management, electricity simulation, and reward management.
- Every visible action must work against Supabase and survive refresh/re-login.

## Files created or modified

- MVP client: `src/app/index.tsx`, `src/state/app-context.tsx`, student/admin/auth screens, shared UI/theme, and `src/core/mvp/` rules/tests.
- Backend: migrations `024`–`026`, `supabase/functions/manage-student/`, and function configuration.
- Removed obsolete client feature modules and QR/camera/document dependencies/plugins.
- Updated `README.md` and `docs/architecture.md` for the active MVP.

## Features completed

- Sign-in-only role routing with no onboarding/university selection.
- Polished responsive student home with personal impact, 920/1,000 shared progress, reward states, redemption, and history.
- Four-section responsive admin console with functional student CRUD/deactivation, simulation, milestone rewards, and summary metrics.
- Secure persistent electricity calculation, university aggregation, automatic unlocks, duplicate protection, and redemption history.
- Twelve active demo students and four rewards; Alice starts at 12 kWh/120 points and the university at 92 kWh/920 points.
- Hosted Supabase migrations `001`–`026` are synchronized and `manage-student` is deployed.

## Still pending

- No requested MVP work remains. Physical-device visual checking is optional; the responsive web/Expo build is valid.

## Known bugs and failed approaches

- No confirmed application, schema, or demo-flow bug remains.
- Local React Native DevTools cannot launch because the container lacks `libnspr4`; Metro and the app still run normally.
- The first hosted acceptance command used a copied student UUID and was rejected before mutation; rerunning with the Supabase Auth user ID passed.

## Commands and validation status

Validated on 2026-08-29:

- `npm test` — pass, 3 MVP rule tests.
- `npm run lint` — pass.
- `npx tsc --noEmit` — pass.
- `npx expo export --platform web` — pass.
- Expo web/Metro smoke test — HTTP 200, no bundle/runtime compile error.
- `npx supabase db lint --linked` — pass, no schema errors.
- `npx supabase migration list --linked` — local/remote parity through `026`.
- Hosted acceptance — Alice 12/120 and university 920/1,000; admin adds 8 kWh; backend awards 80 points; 3 Free Washes unlocks; Alice redeems; sign-out/sign-in preserves history. Demo then restored to 920.
- Hosted security checks — role escalation, raw electricity writes, unauthenticated function calls, and duplicate redemption rejected.
- Hosted admin CRUD — student create/edit/deactivate and reward create/edit/deactivate passed; QA records removed afterward.

## Exact next recommended action

Start the app and use the seeded admin/student accounts to present the required 920 → 1,000 point hackathon demo.
