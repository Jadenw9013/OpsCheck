# Tasks — live implementation status

This file starts as a plan. It is not evidence that code exists.

## Execution boundary
- Authorization: **FAST-TRACK DEMO, recorded 2026-09-10**. The user supplied an updated delivery instruction that supersedes M0–M4 sequencing and the full-delivery requirement for this session only. Data contracts, validation rules, frozen fixtures, and truthfulness requirements are unchanged.
- Authorized this session: local dependency installation, application development, tests, local browser verification. NOT authorized: deploy, push, paid services, data upload, global settings changes, unrelated file edits.
- Active work: M3 delivered on 2026-09-11 (CSV import, profile switcher, all 18 scenarios,
  regression dashboard, JSON export) under the user's M3 instruction of that date.
- App status: **BUILT and VERIFIED** on 2026-09-11. See `VERIFICATION.md`.
- Last verified milestone: NONE closed. M0–M4 remain open; M3's own boxes are now checked, but
  closure still depends on the M4 verification items below.
- Genuine blocker: NONE.
- Next task: the remaining M4 items — keyboard-only traversal, an assistive-technology pass, and the
  owner demo rehearsal (see `HANDOFF.md`).
- Later on 2026-09-10 the user authorized a bounded visual upgrade, including the order timeline
  that earlier scope prohibited. Correctness requirements and all other scope boundaries stand.
- Later still on 2026-09-10 the user authorized a bounded, optional server-side Anthropic briefing
  and its verification, superseding the feature freeze and the no-LLM rule for that feature only.
  The deterministic engine remains authoritative. No optimizer, agents, database, chat interface, or
  public deployment was added.

## Fast-track demo scope, 2026-09-10
Explicitly IN scope tonight:
- One compact polished screen preloading the S00 baseline inputs, showing “Plan not evaluated” until the user runs checks.
- Three immediately accessible demo cases: S00 baseline, S01 earlier departure, S02 missing packing duration. Remaining fixtures stay in `web/src/fixtures/` without their own UI.
- Real `Run checks` and `Reset baseline` actions; scenario/reset replaces the whole bundle, clears evidence, invalidates the report.
- The real pipeline: CSV parsing → explicit mapping → data-readiness validation → R1–R5 → source-linked report. Calculation lives outside React.
- Data status shown separately from plan status; missing / invalid / violation / passed / not-evaluated distinguished.
- Findings list, compact submitted-plan table, evidence panel with rule or diagnostic code, plain-language text, named operands, raw source values, filename/record/column, and working source navigation that reveals and highlights the real cell.
- All four raw tables inspectable even when data blocks plan evaluation.
- Assumptions and persistent synthetic-data labeling.
- Focused tests: S00/S01/S02 against the supplied expectations using the documented projection, blank-vs-zero, touching-vs-overlapping intervals, scenario/reset isolation.
- Typecheck, lint, nonwatch tests, production build, and a real browser pass.

Explicitly DEFERRED tonight (still required for M0–M4; see the milestone board and the original acceptance criteria, which remain tomorrow's backlog):
- Real local CSV replacement/upload UI and the mapping-profile switcher.
- The regression-results dashboard and the full 18-case in-app runner.
- JSON report export.
- Exhaustive unit coverage beyond the focused set above, and production hardening.

Deferred features are omitted from the UI entirely rather than shown as inert buttons.

## Milestone board
Milestones close only when every one of their boxes is checked. The fast-track session delivered a
slice that cuts across M0–M2; it does not close any milestone.

| Milestone | Deliverable | Status | Evidence |
|---|---|---|---|
| M0 | Scaffold, scripts, seed copies, smoke test | SUBSTANTIALLY DONE, not closed | App scaffolded in `web/`; scripts defined; seed copies sha256-identical; typecheck/lint/test/build pass |
| M1 | CSV ingestion, data gate, five plan rules, 18-case parity | SUBSTANTIALLY DONE, not closed | Engine, data gate, and R1–R5 implemented; **all 18 frozen fixtures now asserted and passing** |
| M2 | Useful built-in-scenario UI and evidence navigation | SUBSTANTIALLY DONE, not closed | One-screen workflow, all 18 cases selectable, separate data/plan status, working source navigation, stale/not-run states, Playwright checks |
| M3 | Real local CSV replacement, explicit profiles, regression runner, JSON report | IMPLEMENTED 2026-09-11, not closed | Four import slots with per-slot profiles and mapping preview, in-app 18-case sweep, current-only JSON export; 159 Vitest tests and 44 Playwright checks pass |
| M4 | Production/browser verification, limitations, owner demo | PARTIAL | Build + 44 Chromium checks + screenshots done; keyboard/assistive passes and owner rehearsal NOT RUN |

## M0
- [x] Record actual execution authorization.
- [x] Inspect current files; do not overwrite an existing app.
- [x] Verify supported Node/npm; record selected versions. (Node v22.16.0, npm 11.6.2)
- [x] Scaffold in `web/`; handle generated agent guidance without conflicting with root instructions.
- [x] Install only approved dependencies; define scripts.
- [x] Copy seed JSON into `web/src/fixtures/` and keep byte-for-byte equality. (sha256 verified)
- [x] Establish engine test configuration, minimal smoke test, and root ignore rules.
- [x] Pass typecheck, lint, nonwatch tests, and build.

## M1
- [x] Implement domain types and exact mapping profiles.
- [x] Implement CSV structural checks and provenance-preserving field parsing.
- [x] Implement data diagnostics, duplicate detection, references, and readiness gate.
- [x] Implement five rule families, coverage summaries, stable ordering, and blocked dependencies.
- [x] Implement a shared pure `evaluateBundle` entry point.
- [x] Assert exact 18-case signatures and boundary tests. All 18 frozen fixtures now pass through the documented projection.
- [x] Pass typecheck, lint, tests, and build.

## M2
- [x] Build one-screen baseline workflow without arbitrary KPI filler.
- [x] Add all built-in scenarios; make S00/S01/S02 easy to reach. All 18 are in one labelled selector read straight from the fixture pack, with S00 the default.
- [x] Render data readiness separately from plan outcome.
- [x] Show engine-computed metrics and source-linked evidence.
- [x] Implement source table navigation and visible current-record highlighting.
- [x] Implement stale-result and not-run states.
- [x] Verify baseline, late departure, missing packing, and evidence flow in a browser. (8 Playwright Chromium checks)
- [x] Record emergency-demo checkpoint status truthfully.

## M3
- [x] Add actual local file selectors for four table slots. (`src/components/FileSlot.tsx`)
- [x] Add explicit supported profiles and a mapping preview. Options come from
      `supportedProfiles(table)` and rows from `getMapping(table, profile)`; nothing is inferred
      from a filename.
- [x] Guard file size/read failures and asynchronous replacement races. Size is checked against
      `File.size` before the read; record/column caps run through `parseCsv` before the engine sees
      the text; one request token per slot drops a read that a newer choice or a reset superseded.
- [x] Make all edits mark the report stale; reset returns to a fresh cloned baseline. Import,
      removal, and profile changes all bump the input revision; reset reloads S00 and restores
      `SYNTHETIC`.
- [x] Add real run-all regression evaluation with actual-versus-expected comparison.
      (`src/features/regression.ts`, user-triggered, bundled fixtures only.)
- [x] Add current-report JSON download; never export stale results as current. The button is
      disabled unless `report !== null`, and the CSV text is excluded from the payload.
- [x] Verify the Warehouse B and missing-pack upload examples. Both are covered by
      `e2e/import-and-regression.spec.ts`; the standard examples reproduce the bundled S00 result.

## M4
- [ ] Rerun frozen oracle suite and seed-copy equality checks.
- [ ] Run typecheck, lint, unit/integration tests, and production build.
- [ ] Run specified Playwright Chromium checks on the production app.
- [ ] Review laptop and narrow-width layouts and truthful empty/error states.
- [ ] Produce actual screenshots/logs when available; do not invent them.
- [ ] Write app README, actual verification summary, limitations, and local run steps.
- [ ] Rehearse the one-minute demo and mark final status accurately.
- [ ] Stop without adding optional features.

## Deferred, not authorized
Authentication, cloud deployment, optimizer, auto-repair, AI chat, integration credentials, schema discovery, custom mapping builder, saved user workspaces, forecast models, live monitoring, customer-specific rules, performance benchmarking, CI infrastructure beyond a demonstrated need.

## Progress log
Append compact dated entries with milestone, changed files, commands, results, and next step. Do not paste entire tool transcripts.

### 2026-09-10 - visible Claude report (V2 envelope)
Run checks now optionally produces a model-authored explanation in a chat-style report. The V1
evidence contract, its seven gates, and their tests are unchanged and still authoritative; the
narrative is a separate advisory field with four structural/reference checks that are explicitly not
semantic proof. Metrics stay scoped: narrative factual confidence reads "Not calibrated".

Added `src/briefing/validate-narrative.ts`, `src/components/AiReportPanel.tsx`,
`tests/briefing-narrative.test.ts`, `e2e/ai-report.spec.ts`. Changed the contracts, pipeline,
provider adapter, client hook, and workspace (switch beside Run checks, two-tab inspector).

Cost safety: the Playwright web server is now pinned to OPSCHECK_AI_ENABLED=false so no default test
run can bill. Before that fix, one suite run made an estimated 4-6 unintended live calls; disclosed
in VERIFICATION.md.

Commands: typecheck PASSED, lint PASSED, `npm test` PASSED (128), build PASSED,
`npx playwright test` PASSED (31). Live V2 acceptance: 3 UI-driven calls (S00/S01/S02), all verified.

### 2026-09-10 - timeline axis alignment fix (presentation only)
Confirmed in the rendered DOM that the axis header and order rows used different plotting areas:
the header lacked the status-column spacer (111px wider) and the row's 3px left border (3px origin
shift), so a 10:00 marker drew ~71px from its 10:00 tick. Fixed with one shared row shell and
zero-width time anchors; measured axis-to-row delta is now 0.0px at 1440, 1366 and 390.

Also dropped the clipped `p...` label on narrow bars, and moved scenario subtitles to
presentation-owned copy that describes the input change instead of announcing the outcome.
`scenarios.json` was not edited and remains byte-identical to `seed-data/`.

Changed: `src/components/OrderTimeline.tsx`, `src/components/Workspace.tsx`,
`e2e/timeline-geometry.spec.ts` (new), `e2e/briefing.spec.ts` (made one check environment
independent). No engine, contract, fixture, or briefing logic changed.

Commands: typecheck PASSED, lint PASSED, `npm test` PASSED (106), build PASSED,
`npx playwright test` PASSED (27).

### 2026-09-10 - evidence-gated Anthropic briefing (bounded extension)
Added an optional server-only AI briefing. Trust boundary: the server reconstructs and re-evaluates
the authorized synthetic scenario with the same engine, builds a bounded catalog, and Claude returns
only ids, an ordering, and a detail variant in strict JSON. Seven deterministic gates then decide
publication; the application renders its own templates. There is no model-authored free text in the
publishable payload.

First verified the engine baseline by widening `tests/fixture-oracles.test.ts` to all 18 frozen
fixtures: all pass, no expectation edited.

Added `src/briefing/*`, `src/server/anthropic-briefing.ts`, `src/app/api/briefing/route.ts`,
`src/components/AiBriefingPanel.tsx`, `src/features/useBriefing.ts`, gate/route tests, mocked-provider
browser checks, and a separate `npm run smoke:ai` live command that no default command can reach.

Defect found and fixed: catalog ids derived from engine keys embedded `|` separators and column
names, breaking the strict id grammar and leaking internals into the provider payload. Ids are now
opaque handles; the engine key stays in `resultRef`.

Commands: `npm run typecheck` PASSED, `npm run lint` PASSED, `npm test` PASSED (106 tests),
`npm run build` PASSED with no API key, `npx playwright test` PASSED (18 tests).

Live API verification completed the same day once the owner supplied a key: `npm run smoke:ai` made
three deliberate calls (S00/S01/S02, no retries) against claude-haiku-4-5-20251001. All three
returned end_turn, passed 7/7 publication gates, and published a verified briefing. Recorded in
VERIFICATION.md. Three calls confirm reachability, not calibration.

Deferred and unchanged: CSV upload/mapping UI, regression dashboard, JSON export, keyboard-only and
assistive-technology passes.

### 2026-09-10 - visual upgrade (order timeline and linked inspector)
Authorized bounded visual upgrade of the working app. Preserved the engine, fixtures, source
navigation, and every existing test; no fixture or expected outcome was edited.

Added `src/components/OrderTimeline.tsx` and `tests/timeline-adapter.test.ts`. Extended
`src/features/viewModel.ts` with a pure timeline adapter that positions values but decides none:
it plots submitted intervals parsed with the domain's own `parseTimeOffset`, and modeled packing,
readiness and overrun only from published engine results. Added `lateMinutes` to `PlanRow` as a
read-only projection of the readiness metrics, and ordered row findings by severity. Extended
`useOpsCheck.ts` with the timeline, a collapsible raw-source section that any source link expands,
and headline auto-selection on run. Reworked `Workspace.tsx` around the schedule, and rewrote the
evidence calculation as a chain with per-value source chips plus an explicit
"Cannot evaluate this plan" blocked panel.

Defects found and fixed: departure markers rendered at zero width; clicking a failing order opened
an unrelated passed check; the legend overflowed the page by 35px at 390px; edge labels hung
outside the track; tick labels collided on narrow screens.

Commands: `npm run typecheck` PASSED, `npm run lint` PASSED, `npm test` PASSED (37 tests),
`npm run build` PASSED, `npx playwright test` PASSED (10 tests), sha256 seed equality PASSED.
Screenshots re-captured in `web/artifacts/` at 1440, 1366 and 390 with 0px horizontal overflow.

Deferred, unchanged: the full 18-case regression suite, CSV upload/mapping UI, JSON export,
keyboard-only and assistive-technology passes.

### 2026-09-10 - fast-track demo slice
Resumed after a machine crash. Inspection showed the engine, hook, view model, and three components
already existed and that all four gates passed, but `src/app/page.tsx` was still the
create-next-app starter template, so nothing rendered. `e2e/` was empty.

Added: `src/components/Workspace.tsx`, `src/components/PlanTable.tsx`, `e2e/demo-flow.spec.ts`.
Rewrote: `src/app/page.tsx`.

Defects fixed: numeric operands were rendered as clock times, so a 30-minute packing duration
displayed as "(08:30)" - added `OperandUnit` to the `Operand` contract in `src/domain/types.ts`,
set it at each site in `src/domain/evaluatePlan.ts`, and made `EvidencePanel` show a clock only for
`MINUTE_OFFSET`; `Panel` had no accessible name (`src/components/ui.tsx`); scenario switching
discarded the report outright, so the documented changed-input state was unreachable
(`src/features/useOpsCheck.ts`).

Commands actually run: `npm run typecheck` PASSED, `npm run lint` PASSED, `npm test` PASSED
(23 tests), `npm run build` PASSED, `npx playwright test` PASSED (8 tests), sha256 seed-copy
equality PASSED. Screenshots captured in `web/artifacts/` at 1440x900, 1366x768, and 390x844.

No fixture or expected outcome was edited. The operand-unit field is invisible to `projectReport`,
and the S00/S01/S02 oracle comparison still matches byte-for-byte expectations.

Next step: widen `DEMO_CASES` in `web/tests/fixture-oracles.test.ts` to all 18 frozen cases.

### 2026-09-11 - M3: CSV import, profile switcher, regression dashboard, JSON export
Milestone: M3. New files: `src/components/{FileSlot,RegressionPanel}.tsx`,
`src/features/{importFile,regression,exportReport}.ts`,
`tests/{import-limits,regression-runner,export-report}.test.ts`,
`e2e/{import-and-regression.spec.ts,scenario.ts}`. Changed: `src/features/useOpsCheck.ts`
(import/profile actions, per-slot read tokens, reading state), `src/components/Workspace.tsx`
(import section, regression panel, export button, 18-case selector), `src/components/ui.tsx`
(`Disclosure` moved here for reuse), `src/app/globals.css`, `src/fixtures/loadScenario.ts`
(full list exported; `DEMO_SCENARIO_IDS` removed), the three existing e2e specs (shared scenario
selector helper).

Commands run in `web/`: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`,
`npm run test:e2e`. Results: typecheck and lint clean, 159 Vitest tests in 9 files passed,
production build succeeded with no API key, 44 Playwright Chromium checks passed.
`src/domain/` was not modified; `scenarios.json` and `expected-results.json` remain byte-identical
to `seed-data/`. No live provider call was made.

Next step: the remaining M4 items - keyboard-only traversal, an assistive-technology pass, and the
owner demo rehearsal.
