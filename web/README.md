# OpsCheck — web app

Next.js front-end for the OpsCheck picking-plan validator. See the [root README](../README.md) for project overview.

## Getting started

`ash
npm install
npm run dev
`

Open [http://localhost:3000](http://localhost:3000).

## Commands

| Command | Description |
|---------|-------------|
| \
pm run dev\ | Local dev server |
| \
pm run build\ | Production build |
| \
pm run typecheck\ | TypeScript check |
| \
pm run lint\ | ESLint |
| \
pm test\ | Vitest unit tests (single run) |
| \
pm run test:e2e\ | Playwright E2E — build first |

## Environment

Copy \.env.example\ to \.env.local\ to enable the optional AI briefing:

\\\
OPSCHECK_AI_ENABLED=true
ANTHROPIC_API_KEY=your-key-here
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
\\\

The app builds and all offline tests pass without a key.
