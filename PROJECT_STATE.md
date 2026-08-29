# Project State

## Current objective

Deliver a polished, mobile-first student experience and a judge-ready demo video for the existing hackathon MVP without changing its backend or product scope.

## Architecture and important decisions

- Expo SDK 57 / React Native 0.86 / React 19.2 with one Expo Router entry route.
- Supabase Auth persists sessions through platform-specific storage. `profiles.app_role` exposes only `student` and `admin`; Dr. Elena Brooks is the sole active admin.
- The client uses focused JSON read models and security-definer mutations from migration `024_hackathon_mvp.sql`.
- The student client reads its existing `mvp_electricity_savings` rows to derive a truthful 14-day cumulative savings chart; no new backend data or schema is involved.
- Electricity records are immutable. The backend calculates `1 kWh = 10 points`, updates aggregate progress, and unlocks reached rewards atomically and idempotently.
- The `manage-student` Edge Function creates/edits Auth users after verifying the active admin. Public signup is absent and new external signups remain inactive.
- Legacy organization, challenge, analytics, inventory, and QR database infrastructure remains for migration safety but is not queried or exposed.

## User requirements and constraints

- One university, students, and one admin only.
- No residences, floors, groups, missions, challenges, XP, levels, streaks, achievements, leaderboards, other environmental metrics, QR codes, or complex analytics.
- Student: personal kWh/points, university progress, rewards, redemption, and history.
- Admin: dashboard, student account management, electricity simulation, and reward management.
- Every visible action must work against Supabase and survive refresh/re-login.
- Final polish is student-only. Backend, authentication, admin behavior, points, reward logic, simulation, migrations, Edge Functions, and RLS must remain unchanged.

## Files created or modified

- MVP client: `src/app/index.tsx`, `src/state/app-context.tsx`, student/admin/auth screens, shared UI/theme, and `src/core/mvp/` rules/tests.
- Final student polish: `src/features/student/student-app.tsx` and the student read mapping in `src/state/app-context.tsx`.
- Demo-moment polish: the same two client files now add silent student refresh, point-gain feedback, and a milestone unlock takeover; no backend/admin files changed.
- Demo assets: `artifacts/demo-video/CommonGrid-demo.mp4` and `CommonGrid-demo-cover.jpg`.
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
- Student home is now a centered consumer feed with a dominant animated university milestone, supporting personal impact strip, real 14-day savings chart, next/almost/unlocked/redeemed reward treatments, and fast redemption feedback.
- Compact phone layouts use reduced gutters, wrapped personal stats, thumb-friendly reward actions, and single-column progression hierarchy.
- Student data silently refreshes every four seconds. A university point increase animates the counters and briefly shows the exact gain.
- An unlocked reward now replaces the next-goal hero with a 100% milestone state and direct redeem action; after redemption, the next milestone resumes. Rewards stay above the supporting history chart.
- The unlocked milestone progress track is explicitly full-width, verified from the rendered GUI.
- A 47-second 1280×720 H.264 demo records the actual Expo GUI through student progress, admin 8 kWh simulation, 1,000-point unlock, redemption, and history, with animated transitions and concise captions. Network interception simulated only the recording mutation, so hosted demo data stayed at its checkpoint.

## Still pending

- No requested MVP work remains. Physical-device visual checking remains optional; the responsive web/Expo build is valid.

## Known bugs and failed approaches

- No confirmed application, schema, or demo-flow bug remains.
- Local React Native DevTools cannot launch because the container lacks `libnspr4`; Metro and the app still run normally.
- Chromium capture initially lacked system libraries; temporary user-space libraries and timed browser screencast frames produced the final GUI video without adding app dependencies. Temporary raw frames were moved out of the workspace after encoding.
- The first hosted acceptance command used a copied student UUID and was rejected before mutation; rerunning with the Supabase Auth user ID passed.

## Commands and validation status

Validated on 2026-08-29:

- `npm test` — pass, 3 MVP rule tests.
- `npm run lint` — pass.
- `npx tsc --noEmit` — pass.
- `npx expo export --platform web` — pass.
- Final demo-moment pass — `npm test`, `npm run lint`, `npx tsc --noEmit`, `npx expo export --platform web`, and `git diff --check` all pass.
- Video verification — 47.57 seconds, 1280×720, 30 fps, H.264/yuv420p MP4 with fast-start metadata; key unlock and redemption frames visually inspected.
- Final student polish: hosted read confirms the chart receives Alice's real 12 kWh history and the reward checkpoint remains 920/1,000; tests, lint, TypeScript, web export, and `git diff --check` pass.
- Expo web/Metro smoke test — HTTP 200, no bundle/runtime compile error.
- `npx supabase db lint --linked` — pass, no schema errors.
- `npx supabase migration list --linked` — local/remote parity through `026`.
- Hosted acceptance — Alice 12/120 and university 920/1,000; admin adds 8 kWh; backend awards 80 points; 3 Free Washes unlocks; Alice redeems; sign-out/sign-in preserves history. Demo then restored to 920.
- Hosted security checks — role escalation, raw electricity writes, unauthenticated function calls, and duplicate redemption rejected.
- Hosted admin CRUD — student create/edit/deactivate and reward create/edit/deactivate passed; QA records removed afterward.

## Exact next recommended action

Submit `artifacts/demo-video/CommonGrid-demo.mp4`; use its matching cover image as the submission thumbnail, then rehearse the same 920 → 1,000 flow live.
