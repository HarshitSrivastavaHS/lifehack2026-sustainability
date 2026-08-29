# CommonGrid

CommonGrid is a small Expo 57 hackathon app with one loop:

**A student saves electricity → earns points → advances Northbridge University’s shared total → unlocks a reward → redeems it.**

There are two app roles: student and admin. Students see personal electricity savings, personal points, university progress, rewards, and redemption history. The admin manages student accounts, records simulated electricity savings, and manages reward milestones.

## Local development

1. Copy `.env.example` to `.env` and set the Supabase URL and publishable key.
2. Apply the migrations and deploy the student-management function.
3. Start Expo.

```bash
npm install
npx supabase db push
npx supabase functions deploy manage-student --no-verify-jwt
npm start
```

The MVP migration seeds 12 realistic students, four rewards, and exactly 92 kWh / 920 points. Alice Morgan starts at 12 kWh / 120 points. Recording another 8 kWh awards 80 points and unlocks **3 Free Washes** at 1,000 university points.

Demo accounts use the password `common-grid`:

- Student: `alice.morgan@commongrid.demo`
- Admin: `admin@commongrid.demo`

## Validation

```bash
npm test
npm run lint
npx tsc --noEmit
npx expo export --platform web
npx supabase db lint --linked
```

Legacy platform tables remain in existing migrations to avoid a risky database rewrite, but the MVP client does not query or expose them. See `docs/architecture.md` for the active data flow and security boundaries.
