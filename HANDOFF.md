# Handoff — resume from repository evidence

## Current state, 2026-09-10
- Application: **BUILT AND RUNNING** as a fast-track demo slice in `web/`.
- Active milestone: none closed. M0–M4 remain open by agreement; this session delivered an
  M2-shaped scenario/evidence workflow only.
- Completed and verified milestones: **NONE**. Do not mark M0–M4 complete from this session.
- Authorization used: the fast-track delivery instruction of 2026-09-10 (local dependency install,
  app development, tests, local browser verification). No deploy, push, paid service, upload,
  global settings change, or unrelated file edit occurred.
- Blocker: **NONE**.

## How to start the demo
```bash
cd C:\Dev\haladir\web
npm run dev          # http://localhost:3000
```
Production-equivalent, which is what the browser checks exercise:
```bash
cd C:\Dev\haladir\web
npm run build
npm run start -- --hostname 127.0.0.1 --port 3100    # http://127.0.0.1:3100
```
At the end of this session a production server was left running on
**http://127.0.0.1:3100** (verified HTTP 200). It is a foreground-detached process, not a service:
it will not survive a reboot, and a new session must assume it is gone and start its own.

## Visual upgrade, 2026-09-10 (later session)
An authorized bounded visual upgrade added the interactive order schedule and a linked evidence
inspector. The engine, fixtures, source navigation, and every existing test were preserved; no
fixture or expected outcome was edited. Gates re-run: typecheck, lint, 37 unit tests, production
build, and 10 Playwright Chromium checks all PASSED.

New files: `src/components/OrderTimeline.tsx`, `tests/timeline-adapter.test.ts`.
Changed: `src/features/viewModel.ts` (timeline adapter plus severity ordering of row findings),
`src/features/useOpsCheck.ts` (timeline, collapsible source, headline auto-selection on run),
`src/components/{Workspace,EvidencePanel,ui}.tsx`, `src/app/globals.css`, `e2e/demo-flow.spec.ts`.

## AI briefing extension, 2026-09-10 (bounded)
Optional server-only Anthropic integration. Claude composes an outline from a bounded catalog; the
application owns every fact, number, verdict, assumption, and review step. The deterministic engine,
fixtures, source navigation, and all prior tests are preserved.

New: `src/briefing/{contracts,fingerprint,catalog,templates,validate,render,generate}.ts`,
`src/server/anthropic-briefing.ts`, `src/app/api/briefing/route.ts`,
`src/components/AiBriefingPanel.tsx`, `src/features/useBriefing.ts`,
`tests/briefing-gates.test.ts`, `tests/briefing-route.test.ts`, `e2e/briefing.spec.ts`,
`smoke/live-api.smoke.ts`, `vitest.smoke.mts`, `.env.example`.
Changed: `tests/fixture-oracles.test.ts` (now all 18 fixtures), `src/features/useOpsCheck.ts`
(run serial), `src/components/Workspace.tsx`, `vitest.config.mts`, `.gitignore`, `package.json`.

Configuration lives in `web/.env.local` (git-ignored, never read aloud or committed):
`OPSCHECK_AI_ENABLED`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`. Placeholders are in
`web/.env.example`. **No key is needed** to run, build, or test the app.

**Live API: RUN and PASSED** on 2026-09-10. `npm run smoke:ai` made three deliberate calls
(S00/S01/S02, no retries) against `claude-haiku-4-5-20251001`. All three returned `end_turn`, passed
all seven publication gates, and published a verified briefing. Token usage was roughly 800-900 in
and 120-145 out per call. Three successful calls confirm reachability and the structured-output
path; they are not calibration evidence.

## Visible Claude report (V2), 2026-09-10
Run checks now optionally produces a model-authored explanation beside the deterministic result.
The V1 evidence contract, its seven gates, and their tests are unchanged and still authoritative;
the narrative is a separate, explicitly advisory field with its own four structural checks.

New: `src/briefing/validate-narrative.ts`, `src/components/AiReportPanel.tsx`,
`tests/briefing-narrative.test.ts`, `e2e/ai-report.spec.ts`.
Changed: `src/briefing/{contracts,generate}.ts`, `src/server/anthropic-briefing.ts`,
`src/features/useBriefing.ts`, `src/components/Workspace.tsx`, `playwright.config.ts`.
Removed: `e2e/briefing.spec.ts` (superseded by `e2e/ai-report.spec.ts`).

**Cost safety:** the Playwright web server now runs with `OPSCHECK_AI_ENABLED=false`, so no default
test run can reach Anthropic. Do not remove that `env` block: without it, non-mocked specs that click
Run checks will bill.

**Live V2: RUN and PASSED** - three UI-driven calls (S00/S01/S02), all verified, 7/7 V1 gates and all
narrative reference checks. See VERIFICATION.md, including a disclosure of unintended calls made
before the test-server fix.

## What actually works
- One screen preloading the S00 baseline. Inputs and the submitted plan are visible immediately,
  and every derived column reads "Not evaluated" until the user runs checks.
- Three demo cases reachable in one click: S00 baseline, S01 earlier departure, S02 missing packing
  duration. The other fifteen frozen cases are loaded in the fixture pack but have no UI.
- Real `Run checks` and `Reset baseline`. Both replace the whole four-file bundle with a fresh deep
  clone, clear the selected evidence and the source highlight, and invalidate the previous report.
- The real pipeline: CSV parsing → explicit mapping profile → data-readiness validation → R1–R5
  plan rules → source-linked report. All calculation is in `src/domain/`, outside React.
- Data status and plan status are shown separately, distinguishing missing, invalid, modeled
  violation, passed implemented checks, and not evaluated.
- Findings list, compact submitted-plan table, and an evidence panel carrying the rule ID or
  diagnostic code, plain-language explanation, named operands, the engine's formula, raw source
  values, and filename/logical record/column.
- Source navigation genuinely works: it switches the raw table tab, scrolls the record into view,
  and outlines the exact cell. All four raw tables stay inspectable when data blocks evaluation.
- An interactive order schedule: one row per submitted order with the submitted picking interval,
  the hatched modeled packing band, a departure marker, and a labelled overrun for a failed
  readiness check. Before a run it draws only submitted picking times; when data blocks evaluation
  it removes every derived overlay and says so. Rows are real buttons, so selection is keyboard
  reachable, and selection is linked in both directions with the findings list.
- An evidence inspector that reads the calculation as a chain (picking complete, plus assumed
  packing, equals modeled ready, against departure, then the verdict), with a compact chip beside
  each named value that opens that exact source cell. Durations stay durations; only
  `MINUTE_OFFSET` values are shown as clock times.
- An optional AI report tab. Run checks with the "Include AI report" switch on authorizes exactly
  one provider request for that exact snapshot; the deterministic timeline, status, and findings
  update first and independently of the network. The right inspector has two real tabs, AI report
  and Evidence, and a late response cannot pull the user back from Evidence. The server reconstructs and re-evaluates the authorized synthetic
  scenario, compares the client's snapshot fingerprint before any provider call, sends only a
  bounded catalog digest, then runs seven deterministic publication gates over the untrusted
  selection. A rejected payload is withheld with its failed gate named and never receives a green
  badge; a failed API call is reported as unavailable and never replaced with a fabricated report.
  Metrics are measured quantities - evidence traceability, required findings included, and gates
  passed - never a model confidence score.

## Where things live
| Concern | Path |
|---|---|
| Pure engine (no React/DOM/clock/network) | `web/src/domain/` |
| State and orchestration | `web/src/features/useOpsCheck.ts` |
| Presentation assembly and timeline geometry (no recomputation) | `web/src/features/viewModel.ts` |
| Schedule visualization | `web/src/components/OrderTimeline.tsx` |
| Screen composition | `web/src/components/Workspace.tsx` |
| Components | `web/src/components/{PlanTable,FindingsList,EvidencePanel,SourceViewer,ui}.tsx` |
| Focused tests | `web/tests/` |
| Browser checks | `web/e2e/demo-flow.spec.ts` |
| Screenshots and evidence | `web/artifacts/` |

## Verified this session
See `VERIFICATION.md` for the full record. Summary: typecheck, lint, 128 Vitest tests (including
all 18 frozen fixtures), production build with no API key, and 31 Playwright Chromium checks all
PASSED; seed copies are byte-identical to `seed-data/`.

**Not verified:** keyboard-only traversal end to end, and any assistive-technology pass. The
briefing browser checks remain mocked-provider checks by design; the live path is covered by the
three recorded smoke calls instead.

## Deliberately deferred, still required for M0–M4
Real local CSV replacement/upload UI and the mapping-profile switcher; the regression-results
dashboard and in-app 18-case runner; JSON report export; exhaustive unit coverage beyond the
focused set; production hardening. These are omitted from the UI entirely rather than shown as
inert controls.

## Exact next task
Nothing is outstanding for the AI report feature. The remaining backlog is unchanged and unstarted:
end-to-end keyboard-only traversal, an assistive-technology pass, broader edge-case coverage, the
CSV replacement/mapping UI, and the regression dashboard with JSON export. See `DEMO.md`.

If a future live call is ever withheld, that is the gates working. Do not add retries or loosen a
gate to make a live call pass.

## Resume rules
Inspect files and command results. Do not infer that a checkbox means the code still works.
Preserve unrelated changes. Do not restart the project, spawn broad reviews, or extend the approved
milestone range merely because a new context window began.
