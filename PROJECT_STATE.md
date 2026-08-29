# Project State

## Current objective

Turn CommonGrid from an Expo demo into a production-oriented, Supabase-backed sustainability platform for student residences while preserving the current visual design. Energy reduction is the first habit, not a one-off architecture.

## Architecture and design decisions

- Expo SDK 57 / React Native 0.86 / React 19.2 with Expo Router and strict TypeScript.
- Supabase provides authentication, PostgreSQL/RLS, realtime updates, Edge Functions, organization membership, challenge data, and rewards.
- `src/core/challenges/` defines generic module/processor contracts and a registry. Habit-specific client and calculation code stays in `src/features/challenges/<habit>/`; raw data and ingestion remain module-specific.
- The platform core owns roles, organizations, habit preferences, enrollment, progress, leagues, rewards, wallet, and redemption.
- Roles come from database memberships, never client selection. Raw energy readings and secrets are not client-readable.
- Energy verification uses occupancy filtering and a median baseline. Rewards are inventory-backed, allocated transactionally, and redeemed in-app with short-lived QR tokens.

## User requirements and constraints

- Support many optional sustainability habits with low coupling; users choose which habits they want.
- Keep screens uncluttered, use graphs where useful, and retain the current look.
- Universities/admins configure challenges, reward inventory, and allocation in advance; students redeem rewards inside the app.
- Build real behavior, not demo-only/fictitious fallbacks. Do not display internal instructions or user prohibitions in the app.
- Before coding, read the exact Expo 57 docs and inspect the existing diff. Never commit secrets.

## Files created or modified

- App/config: `package.json`, `package-lock.json`, `app.json`, `tsconfig.json`, `metro.config.js`, `eslint.config.js`, `.gitignore`.
- Client: `src/app/`, `src/constants/theme.ts`, `src/components/ui/`, `src/core/challenges/`, `src/features/{auth,onboarding,student,admin,challenges}/`, `src/state/app-context.tsx`, and `src/lib/supabase.ts`.
- Backend: `supabase/config.toml`, `.env.example`, migrations `001`–`008`, `seed.sql`, and Edge Functions for energy ingestion, reward tokens, and redemption.
- Documentation: `README.md`, `docs/architecture.md`, and `AGENTS.md`.
- The starter demo components, hooks, tabs, and `src/state/demo-context.tsx` are deleted in the working tree.

## Features completed

- Supabase session persistence, signup/sign-in, DB-derived roles, onboarding, join codes, and organization membership.
- Habit preference loading/toggling and modular challenge registry.
- Student/admin shells, challenge enrollment and commitments, progress charts, league/impact views, reward wallet, QR token generation/redemption, and realtime refresh.
- Energy config/sample validation, progress/impact calculation, processor tests, secure idempotent ingestion, and scheduled baseline/finalization database jobs.
- Database schema/RLS for modular challenges, organization scope, reward planning/inventory, allocation, and redemption.
- Expo SQLite web WASM bundling and local COEP/COOP development headers through Metro.

## Features still pending

- Validate all migrations and Edge Functions against a fresh local/hosted Supabase project.
- Complete end-to-end testing for student, admin, and redeemer roles with real accounts and data.
- Verify camera-based QR redemption on physical iOS/Android devices and responsive/accessibility behavior.
- Add the next habit module to prove the extension contract; energy is the only registered client module.
- Add broader tests for context/data mapping, UI flows, RLS, RPC concurrency, ingestion retries, and reward replay/expiry.

## Known bugs and failed approaches

- No confirmed build or unit-test failures. Backend and device flows have not yet been integration-tested.
- `app-context.tsx` still exposes energy-shaped progress (`EnergyProgress`) at the shared context boundary, which is residual coupling to remove before multiple simultaneous habit dashboards.
- The repository has extensive uncommitted work; preserve it and do not reset or restore deleted starter files.
- A CI-mode Expo development request emitted `Worker chunk not found` from the SDK 57 Metro serializer after successfully resolving SQLite WASM; static web export succeeds. Recheck in the normal interactive development environment before treating it as an application regression.

## Commands and current validation status

Run with `npm install`, then `npm start` or `npm run web|ios|android`. Backend setup is documented in `README.md`; container web setup uses `docker compose up --build`.

Validated on 2026-08-29:

- `npm test` — pass: 1 file, 4 tests.
- `npm run lint` — pass.
- `npx tsc --noEmit` — pass.
- `npx expo export --platform web` — pass; static output written to `dist/`.
- Metro config inspection — pass: `.wasm` is registered as an asset and development middleware is installed.
- Local HTTP header inspection — COEP `credentialless` and COOP `same-origin` are present (the CI-mode request itself returned the worker-chunk serializer error noted above).

## Exact next recommended action

Start a fresh local Supabase instance, apply migrations `001`–`008` in order, load `supabase/seed.sql` only for local preview, serve the three Edge Functions with required secrets, and execute one complete admin-create → student-opt-in/join → energy-ingest → finalize/allocate → reveal → QR-redeem flow. Record every failure as a focused test before changing architecture or UI.
