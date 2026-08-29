# CommonGrid MVP architecture

## Active product

The client has one Expo Router route and derives its role from the authenticated Supabase profile. Students receive one impact-and-rewards screen. The sole admin receives Dashboard, Students, Electricity, and Rewards sections. No client route reads the legacy residence, challenge, leaderboard, inventory, or QR systems.

## Data flow

1. Supabase Auth restores a student or admin session.
2. `get_mvp_session` returns the server-controlled role and active state.
3. `get_mvp_student_home` derives personal and university totals from immutable electricity records and returns milestone/redeemed states.
4. The admin submits a student and kWh value to `simulate_mvp_electricity_saving`.
5. One transaction validates the admin and student, calculates `1 kWh = 10 points`, inserts the record, recomputes totals, and persists reached reward unlocks.
6. `redeem_mvp_reward` allows each active student to redeem each active unlocked reward once.

The client refreshes the relevant read model after every mutation and whenever the app resumes, so persisted state is authoritative.

## Security boundaries

- Public clients receive only the Supabase publishable key.
- Students and admins cannot insert electricity records or edit reward/unlock/redemption tables directly.
- Profile update grants are revoked so students cannot alter roles or active state.
- All mutations validate the authenticated role inside security-definer functions.
- Student Auth creation/editing uses the `manage-student` Edge Function and service-role access after verifying the caller is the active admin.
- New public Auth users default to inactive students; account metadata cannot create an admin.
- Electricity simulation uses an idempotency UUID and a transaction lock to avoid duplicate submissions or milestone races.

Legacy tables and functions remain deployed for migration compatibility only. Removing them is intentionally outside the hackathon MVP.
