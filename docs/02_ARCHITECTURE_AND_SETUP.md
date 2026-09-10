# 02 — Architecture, setup, and commands

## Selected stack
This is **our demo stack**, not a verified Haladir stack.

| Layer | Choice | Justification |
|---|---|---|
| App | Next.js App Router + TypeScript | One familiar application and a straightforward local build. |
| UI | React local state / reducer; generated Tailwind setup | No global-state library or component-system installation. |
| CSV | Papa Parse with explicit settings | Real quoted-field handling without writing a fragile split-based parser. |
| Validation | Pure TypeScript functions | Same implementation in the UI and tests; no model calls. |
| Unit/integration testing | Vitest, Node environment | Exercise parsing, rules, source references, and fixtures. |
| Browser verification | Playwright, Chromium only | Exercise the actual page, uploads, source navigation, and stale states. |
| Persistence | None | User inputs live in page memory and disappear on refresh. |

Sources [S4]–[S9] in `10_SOURCE_NOTES.md` support tooling facts. Architecture choices and constraints are ours.

## Runtime and version policy
Use **Node 24 LTS** for this build. Verify the installed version and package engine requirements rather than assuming an older Node installation is sufficient. The current Vitest documentation has a higher Node requirement than the minimum on the Next.js installation page [S5, S6, S9].

At M0, choose current stable compatible packages, record their actual resolved versions, and commit/keep `package-lock.json`. Do not use prereleases or upgrade repeatedly during the build. Do not silently install an obsolete runtime to satisfy one package.

## Safe bootstrap
Run from the repository root. `web/` must not already contain an app. Inspect first; preserve existing work.

```text
node --version
npm --version
npx create-next-app@latest web --ts --tailwind --eslint --app --src-dir --use-npm --import-alias "@/*" --disable-git --yes
cd web
npm install papaparse
npm install -D @types/papaparse vitest @playwright/test
npx playwright install chromium
```

These commands are intended to work in a normal terminal, including PowerShell. Run sequentially, check failures, and adjust only an actually unsupported CLI flag after reading `npx create-next-app --help`. Do not scaffold into `.`. Do not install system-level packages or change global settings without permission.

The scaffold may generate its own agent guidance files. Inspect newly generated `web/CLAUDE.md` / `web/AGENTS.md`; ensure they do not conflict with the supplied root rules. A minimal newly generated `web/CLAUDE.md` can simply refer to `../CLAUDE.md`. Do not replace preexisting user instructions.

Remove demo boilerplate and external font fetching. Use a system font stack. Keep the generated compatible Tailwind/ESLint integration rather than pasting configuration from an older major version.

## Seed copy, once during M0
From the repository root:
```text
node -e "const fs=require('node:fs');fs.mkdirSync('web/src/fixtures',{recursive:true});for(const n of ['scenarios.json','expected-results.json'])fs.copyFileSync('seed-data/'+n,'web/src/fixtures/'+n)"
```

The original `seed-data/` files are the frozen blueprint. Runtime code imports `web/src/fixtures/scenarios.json`; only the regression comparison layer and tests may import `expected-results.json`. Verify both copies remain byte-for-byte identical to the originals at M4. No runtime filesystem access or build-time code generation is necessary.

## Desired folder layout
```text
repository/
  CLAUDE.md
  START_HERE.md
  BOOTSTRAP_PROMPT.md
  TASKS.md
  DECISIONS.md
  VERIFICATION.md
  HANDOFF.md
  docs/
  seed-data/
  web/
    package.json
    package-lock.json
    next.config.ts
    tsconfig.json
    vitest.config.ts
    playwright.config.ts
    src/
      app/
        layout.tsx
        page.tsx
        globals.css
      components/
        OpsCheckApp.tsx
        ScenarioToolbar.tsx
        InputPanel.tsx
        MappingPreview.tsx
        ReportSummary.tsx
        FindingsList.tsx
        EvidencePanel.tsx
        SourceTable.tsx
        RegressionPanel.tsx
        LimitationsPanel.tsx
      domain/
        types.ts
        constants.ts
        profiles.ts
        parseCsv.ts
        parseFields.ts
        normalize.ts
        validateData.ts
        evaluatePlan.ts
        evaluateBundle.ts
        report.ts
      fixtures/
        scenarios.json
        expected-results.json
        loadScenario.ts
      features/
        regression.ts
        exportReport.ts
        useOpsCheck.ts
    tests/
      parsing.test.ts
      data-validation.test.ts
      plan-rules.test.ts
      fixture-oracles.test.ts
      report.test.ts
    e2e/
      demo.spec.ts
```

This is a suggested module partition, not a quota. Merge tiny files when that makes the code clearer. Do not add abstract repositories or plugin registries for four tables and five rules.

## Dependency direction
`UI → evaluateBundle → CSV/normalization/data checks → plan rules → report assembly`

`regression.ts → evaluateBundle + fixture inputs + independent expectations`

The domain must never import React, components, fixture names, or expected results. UI components must not calculate readiness or overlap themselves. All runtime file content remains in browser memory.

`page.tsx` may render one client component. File handling, selections, and reports stay inside that client boundary. Do not create a server API for uploading data.

## State model
Use a reducer or a small hook containing:
- `inputBundle` and monotonically increasing `inputRevision`.
- `lastReport` and `reportRevision`.
- `readingFile`, `fileReadError`, and a per-slot request token.
- selected scenario/profile, selected finding, selected source table/record.
- separate regression-run state.

`current = lastReport !== null && reportRevision === inputRevision && !readingFile`.

On input/profile/scenario replacement: increment input revision; clear selected evidence tied to the old report; hide old current-result badges; disable current-report export. Run checks only against an immutable snapshot of the current bundle. A later file-read completion must not overwrite a more recent selection or a reset.

No localStorage, server session, or auto-save. Baseline reset creates a fresh clone, not a reference to a mutable fixture object.

## Required npm scripts
Adapt the generated package scripts to this behavior:
```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test"
}
```

Do not substitute a watch process for `npm test`; automated milestones must finish. Run lint separately from build. Keep `strict: true`; use explicit parsing results rather than `any` or broad unchecked casts.

## Minimal Vitest setup
Use `defineConfig` from `vitest/config`; `environment: 'node'`; include `tests/**/*.test.ts`; configure the `@` alias to `./src` with `fileURLToPath(new URL('./src', import.meta.url))`. Do not accidentally collect Playwright specs or try to unit-test async server components. The domain tests do not need jsdom [S6, S10].

## Playwright setup
One Chromium project. Use `testDir: './e2e'` and a fixed local test server address such as `http://127.0.0.1:3100`.

After `npm run build`, the Playwright `webServer` command should be:
```text
npm run start -- --hostname 127.0.0.1 --port 3100
```
Set the matching URL/baseURL, `reuseExistingServer: false`, and a bounded startup timeout. This avoids accidentally testing a stale server. A server conflict should fail clearly, not silently switch ports. See official server management guidance [S8].

## Privacy / safety / performance boundaries
Do not log uploaded file content. No telemetry or analytics libraries, external fonts, network AI, or user-content uploads. Next.js development tooling can make its own framework requests; do not confuse those with sending CSV content to a service.

Cap each CSV at 256 KiB, 100 nonblank data records, and 32 columns. Reject oversize input rather than truncating it. These are deliberate demo limits, not performance benchmarks. Text is rendered as text; never inject raw HTML. JSON export is the only report export.

## Git and artifacts
If a new repository is initialized, keep `.git` at the kit root, not a second nested repository in `web/`. Ignore dependencies, `.next`, browser reports, secrets, and local artifacts. Do not push or deploy. Record any environment blocker in the live handoff rather than repeatedly reinstalling the whole toolchain.
