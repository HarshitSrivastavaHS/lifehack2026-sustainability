# Repository Guidelines

## Project Structure & Module Organization

CommonGrid is an Expo 57 React Native app. Routes live in `src/app/`, shared UI in `src/components/ui/`, state and integrations in `src/state/` and `src/lib/`, and flows in `src/features/`. Register independent sustainability habits under `src/features/challenges/` through contracts in `src/core/challenges/`. Assets are in `assets/`; Supabase migrations, functions, and seed data are in `supabase/`.

## Build, Test, and Development Commands

- `npm install`: install locked dependencies.
- `npm start`: start Expo; use `npm run web`, `ios`, or `android` for a target.
- `npm run lint`: run Expo's ESLint configuration.
- `npm test`: run the Vitest suite once.
- `docker compose up --build`: start the containerized web setup.

## Coding Style & Naming Conventions

Use strict TypeScript, two-space indentation, semicolons, and functional components. Use `PascalCase` for components/types, `camelCase` for values, and kebab-case filenames such as `metric-chart.tsx`. Prefer `@/` imports. Keep business logic outside screens and expose habits through the challenge registry.

## Testing Guidelines

Place Vitest tests beside implementations as `*.test.ts(x)`, like `energy/processor.test.ts`. Cover calculations, validation, boundaries, and regressions. No coverage threshold is configured. Run tests and lint before submission.

## Commit & Pull Request Guidelines

History uses short imperative subjects such as `Setup docker`. Keep commits focused. PRs should explain behavior and architecture changes, link issues, report test results, include visuals for UI changes, and flag migrations.

## Security & Configuration

Keep credentials untracked. Review Supabase policies and function authorization when changing data access.

# Agent instructions

Before doing any work:

1. Read `PROJECT_STATE.md` completely.
2. Inspect the current Git diff and status.
3. Continue from the existing implementation instead of starting over.
4. Read the exact [Expo SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/) before writing code.

If `PROJECT_STATE.md` does not exist, create it before substantial implementation. After any substantial work, update it with:

- Current objective
- Architecture and important design decisions
- User requirements and constraints
- Files created or modified
- Features completed and still pending
- Known bugs and failed approaches
- Commands used to run, build, and test
- Current test/build status
- Exact next recommended action

Keep it concise but sufficient for a fresh agent to continue without prior conversation. Never put secrets, API keys, tokens, or passwords in either file.
