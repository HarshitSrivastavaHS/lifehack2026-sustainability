# CommonGrid

CommonGrid is a modular sustainability platform for student residences. Students choose the habits they care about, opt into verified team challenges, track community impact, and redeem university-funded rewards inside the app.

Energy reduction is the first installed habit. The platform core is intentionally independent from energy-specific ingestion, baselines, metrics, and UI so walking, water, waste, food, and transport modules can be added without changing authentication, organizations, challenge enrollment, or rewards.

## Local development

1. Create a Supabase project and apply the migrations in `supabase/migrations`.
2. Copy `.env.example` to `.env` and add the project URL and publishable key.
3. Set `BMS_INGESTION_SECRET` as an Edge Function secret.
4. Deploy `ingest-energy`, `reward-token`, and `redeem-reward`.
5. Run:

```bash
npm install
npm start
```

Use `supabase/seed.sql` only for an explicit local preview environment. Production never falls back to fictional data.

`expo-sqlite` web support requires cross-origin isolation. The local Expo server sets the required COEP and COOP headers through `metro.config.js`. Production web hosting must also return:

```text
Cross-Origin-Embedder-Policy: credentialless
Cross-Origin-Opener-Policy: same-origin
```

## Validation

```bash
npm test
npm run lint
npx tsc --noEmit
npx expo export --platform web
```

See `docs/architecture.md` for module boundaries, security rules, ingestion, and redemption.
