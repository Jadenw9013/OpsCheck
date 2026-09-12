# Handoff — resume from repository evidence

## Current state, 2026-09-11
- Application: **BUILT** in `web/`, with the M3 import, regression, and export surfaces in place.
- Active milestone: none closed. M0–M4 remain open; the 2026-09-11 session implemented all of M3
  (CSV import, profile switcher, all 18 scenarios, regression dashboard, JSON export).
- Completed and verified milestones: **NONE**. Do not mark M0–M4 complete from this session.
- Authorization used: the fast-track delivery instruction of 2026-09-10, then the M3 implementation
  instruction of 2026-09-11 (implement the four M3 features and run the gates). No deploy, push,
  paid service, upload, global settings change, or unrelated file edit occurred. Nothing is
  committed: the M3 work is present in the working tree only.
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
**No server is running now.** The 2026-09-11 session's browser checks started their own production
server and shut it down with the run; port 3100 was verified unreachable afterwards. Start your own
with the commands above.

## M3, 2026-09-11 (CSV import, profile switcher, regression dashboard, JSON export)
Implemented against `M3_IMPLEMENTATION_PLAN.md`. The engine was not touched: `src/domain/` has no
changes, and `scenarios.json` and `expected-results.json` remain byte-identical to `seed-data/`.

New: `src/components/{FileSlot,RegressionPanel}.tsx`,
`src/features/{importFile,regression,exportReport}.ts`,
`tests/{import-limits,regression-runner,export-report}.test.ts`,
`e2e/{import-and-regression.spec.ts,scenario.ts}`.
Changed: `src/features/useOpsCheck.ts`, `src/components/{Workspace,ui}.tsx`,
`src/app/globals.css`, `src/fixtures/loadScenario.ts`, and the three existing e2e specs.

What it does:
- **All 18 cases** in one labelled selector read straight from the fixture pack, S00 default.
  `DEMO_SCENARIO_IDS` is gone, so no hardcoded subset can drift from `scenarios.json`.
- **Four import slots**, each with its own explicit mapping profile and a mapping preview built from
  `getMapping(table, profile)`; the options come from `supportedProfiles(table)`. A profile is never
  inferred from a filename. A loaded file whose header lacks a mapped column says so in the preview
  as a statement about the header, not as a verdict.
- Files are read in the browser with `FileReader`. **One request token per slot**: a read that a
  newer pick, a removal, a profile change, or a reset superseded is discarded instead of landing.
  Size is checked against `File.size` before reading; the record and column caps run through
  `parseCsv` before the engine sees the text, so the caps are not re-implemented. Over-limit input
  is refused per slot with a reason; a broken-quoting or short-record file is *not* refused, because
  those are diagnostics the report exists to explain.
- Importing or removing any file marks the bundle `USER_SUPPLIED_UNVERIFIED` and relabels the header
  badge. Reset baseline reloads S00 and restores `SYNTHETIC`. A profile change leaves the origin
  alone (the data's provenance did not change) but does invalidate the result.
- **Regression dashboard**: a user-triggered sweep of all 18 bundled cases against
  `expected-results.json`, using the same projection as `fixture-oracles.test.ts`. It reads bundled
  fixtures only and cannot see or change the workspace bundle. `firstDifference` is exported so the
  comparison itself is tested for actually detecting a mismatch.
- **JSON export**: enabled only while the report matches the current inputs. The payload carries the
  engine's statuses, counts, rule coverage, diagnostics, and checks with their cited source cells,
  plus provenance and a stated-limitations list. The CSV text and raw tables are excluded.

Two deliberate decisions worth knowing:
- The **AI report switch is disabled for a customized bundle.** The request names a bundled scenario
  that the server re-evaluates itself, so there is nothing for it to reproduce, and user CSV content
  is never sent anywhere. `runChecks` also refuses to start a request in that state, so a stale
  toggle cannot leak one.
- **Run checks is disabled while a file is being read**, and no report is current during a read.
  A failed read leaves the bundle and any existing result untouched and reports the failure at the
  slot.

Gates re-run in `web/`: typecheck, lint, **159 Vitest tests in 9 files**, production build with no
API key, and **44 Playwright Chromium checks**, all PASSED. Screenshots:
`web/artifacts/m3-{import-section,regression,controls}.png`. No live provider call was made.

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

## Presentation redesign, 2026-09-10
A bounded design retrofit using `opscheck-design-system/`. Tokens are integrated into the existing
Tailwind theme in `web/src/app/globals.css`; components use semantic role classes (`ops-title`,
`ops-outcome`, `ops-panel-title`, `ops-prose`, `ops-body`, `ops-meta`) instead of the 126 arbitrary
`text-[Npx]` utilities that produced a 10-13px interface.

Measured result: h1 18px -> 32px, panel headings 13 -> 20, body/table 12.5 -> 16, AI prose 12.5 ->
18, metadata 10-11.5 -> 14. Run checks 31px -> 48px high; schedule rows 41 -> 60. Nothing visible
is below 14px.

Layout: header -> toolbar -> "Current plan result" -> schedule/inspector workspace -> secondary
disclosures. Plan status moved into its own result region in plain language.

**Do not reintroduce** the `.axis-tick:nth-child(even) { display: none }` rule: it hid the tick
anchor, not its label, and broke geometry measurement. If label thinning is needed, hide the inner
label only.

No engine, fixture, AI protocol or provider behaviour changed, and no live call was made.

## What actually works
- One screen preloading the S00 baseline. Inputs and the submitted plan are visible immediately,
  and every derived column reads "Not evaluated" until the user runs checks.
- All eighteen frozen cases reachable from one Scenario selector, S00 default. Four import slots
  accept your own CSV exports, each with an explicit mapping profile and a live mapping preview.
  A regression panel sweeps all eighteen cases against the frozen expectations on demand, and the
  current report can be downloaded as JSON.
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
See `VERIFICATION.md` for the full record. Summary: typecheck, lint, 159 Vitest tests (including all
18 frozen fixtures), production build with no API key, and 44 Playwright Chromium checks all PASSED;
seed copies are byte-identical to `seed-data/`. The example files in `seed-data/import-examples/`
were imported through the real file picker in the browser and reproduced the bundled S00 result.

**Not verified:** keyboard-only traversal end to end (including the new import controls), any
assistive-technology pass, an automated axe scan, 200% text enlargement, the user text-spacing
override test, and a real over-limit file picked in the browser (the caps are asserted at the unit
boundary instead). The briefing browser
checks remain mocked-provider checks by design; the live path is covered by the recorded smoke
calls instead.

## Deliberately deferred, still required for M0–M4
Exhaustive unit coverage beyond the focused set, and production hardening. The CSV replacement UI,
the mapping-profile switcher, the in-app 18-case runner, and JSON export were delivered on
2026-09-11 and are no longer deferred.

## Exact next task
The remaining M4 items: end-to-end keyboard-only traversal (start with the import slots, where the
visible label mirrors the real file input's focus ring), an assistive-technology pass, and the
owner demo rehearsal. See `DEMO.md`, which still describes the three-case toolbar and should be
re-read against the current selector before rehearsing.

If a future live call is ever withheld, that is the gates working. Do not add retries or loosen a
gate to make a live call pass.

## Resume rules
Inspect files and command results. Do not infer that a checkbox means the code still works.
Preserve unrelated changes. Do not restart the project, spawn broad reviews, or extend the approved
milestone range merely because a new context window began.
