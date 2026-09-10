# 07 — Executable implementation plan

## Workflow and authorization
The user's bootstrap instruction authorizes M0–M4. Until that instruction is actually supplied, this file is a plan, not execution authorization. Record the instruction in TASKS.md when received.

Use one builder. Each milestone has scope, exclusions, checks, and an explicit exit. Continue through authorized green gates without requesting repetitive permission. Stop for a genuine contract conflict, unavailable required environment, destructive action, or additional scope. Do not stall on routine component names or styling choices.

Before a milestone: inspect relevant files and read its contract. During: implement one small complete path and test it. After: run checks, update TASKS/VERIFICATION/HANDOFF, make a local checkpoint commit if authorized/configured, then continue.

**No stage is complete merely because code was written.** Record exactly what ran. Keep not-run browser checks distinct from unit-test passes.

## Priority and time budget
Planning target for a focused build: 3–5 hours, not a guarantee. Approximate allocation: M0 15–25 minutes, M1 50–80, M2 40–60, M3 35–55, M4 25–45. Installation or debugging can exceed this.

M2 is the emergency demo checkpoint. Full M0–M4 delivery includes actual imports and regression reporting. Features outside this sequence are not implicitly authorized.

## M0 — Safe scaffold and testable skeleton
### Read
Root instructions; `02_ARCHITECTURE_AND_SETUP.md`; seed file layout; this milestone.

### Implement
1. Inspect working directory, existing files, Git root/status, and Node/npm versions. Do not touch unrelated files or overwrite an existing `web/` app.
2. Record authorization and selected runtime. Run the documented create-next-app command targeting `web/`.
3. Install only the approved CSV/testing packages. Keep npm lockfile. Attempt Chromium installation; record a concrete browser-install blocker without repeatedly reinstalling everything.
4. Inspect generated agent instruction files and ensure root scope is not contradicted. Remove scaffold marketing UI and external font fetching.
5. Add required npm scripts; configure a Node-environment Vitest suite restricted to `tests/`.
6. Copy the two seed JSON files into `web/src/fixtures/`. Do not edit their contents.
7. Create one truthful smoke test for a tiny utility or seed-shape loader. Do not create a fake test that always asserts true.
8. Render a minimal OpsCheck page with an explicit “Not evaluated” state.
9. Set root ignore rules. Keep a single repository and do not invent Git identity.

### Do not build
No domain engine yet, no second backend, no auth, no complex UI, no CI workflow.

### Exit gate
`npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` succeed from `web/`. Seed copies match originals. The page compiles. A Chromium installation problem may be recorded for M2/M4; it is not evidence of application failure or browser success.

### Handoff
Record exact versions, commands, scaffold location, and M1's first file/task.

## M1 — The real engine before polished screens
### Read
Full `03_DATA_CONTRACTS.md`, `04_VALIDATION_ENGINE.md`, `05_FIXTURES_AND_ORACLES.md`, and engine sections of `08_TEST_PLAN.md`.

### Implement in order
1. Define input, canonical, source, diagnostic, check, and report types. Add fixed rule order and mapping profiles.
2. Parse CSV arrays with preservation of logical record indices. Validate header/row widths and caps before normalization.
3. Implement scalar parsers returning valid/missing/invalid outcomes. Preserve raw strings. Write focused tests before wiring all tables.
4. Normalize structurally usable rows without casting partial data to valid entities.
5. Validate primary IDs, references, interval ordering, and the whole-dataset readiness gate. Avoid cascading fake diagnostics.
6. Implement R1–R5 as small functions over a valid canonical dataset. Pay particular attention to half-open intervals, all-pairs overlap, and blocked R5 when R1 fails.
7. Assemble deterministic reports and a read-only source model. Add exact baseline, ten-minute miss, and missing-duration tests immediately.
8. Implement the shared actual-result projection and compare all 18 cases against the frozen expected JSON. Keep expected results outside the domain imports.
9. Add boundary tests for zero/blank/partial numbers, interval adjacency, nested overlaps, duplicate IDs, and empty plan.

### Do not build
No UI formulas, optimizer, partial data evaluation, source-free generic messages, or “temporary” fixture-name shortcuts.

### Exit gate
All 18 fixture projections match; critical boundary tests pass; typecheck, lint, tests, and build pass. Exact counts for S00/S07/S08 match their contracts. Same input repeats identically and baseline is not mutated by another case.

### Handoff
Summarize rule coverage and any deliberately unmodeled constraints. M1 output is a verified engine, not yet a complete product.

## M2 — First useful, explainable browser demo
### Read
`06_INTERFACE_SPEC.md`; report/evidence shapes; S00/S01/S02 details.

### Implement in order
1. Create the client application state/hook. Preload baseline input without showing a pass before evaluation.
2. Add scenario selector, Run checks, Reset baseline, origin label, and separate data/plan summaries.
3. Wire the real engine result; display findings and core plan rows. Use existing result metrics, not recalculated formulas in JSX.
4. Add the evidence panel and raw source viewer. Make a finding's source link select the correct table, record, and cell.
5. Implement not-run, stale, blocked, empty-selection, and unexpected-error states. Disable stale report actions.
6. Add visible modeling limitations and synthetic-origin language.
7. Ensure a functional laptop layout before spending time on visual refinement. Add basic keyboard labels/focus.
8. Exercise S00, S01, S02 and source navigation in an actual browser using Playwright or a documented manual inspection.

### Do not build
No arbitrary mapping editor, file dropzone, timeline chart, AI explanation generation, or cosmetic dashboard KPIs.

### Exit gate
The three-case story works from the actual page; S01 shows 10 minutes with correct source cells; S02 shows no operational evaluation. Changing scenario invalidates the old report. Typecheck, lint, tests, and build pass. Record browser evidence.

When browser execution is genuinely unavailable, state **built, browser unverified** rather than marking this gate passed. Work on independently testable tasks may continue within the user's authorization, but do not claim the emergency demo is verified. Do not retry a blocked browser setup indefinitely.

### Emergency checkpoint
Provide a local run command and a one-minute built-in-scenario walkthrough. Full MVP features are still unfinished until M3/M4. If the user invokes the emergency prompt, stop at this bounded checkpoint and disclose those omissions.

## M3 — Real inputs and regression behavior
### Read
Input/profile/state sections of `02`, `03`, and `06`; regression projection in `05`; import tests in `08`.

### Implement in order
1. Add four native local file inputs. Read text on the client; maintain actual filename and content. Validate configured file-size cap and guard read errors.
2. Use per-slot request tokens or equivalent cancellation semantics so a stale read cannot overwrite a newer file/scenario/reset. Disable reevaluation while reads are pending.
3. Add explicit supported profile selectors and mapping preview. Keep workers/plan standard. Show missing headers and ignored extra columns.
4. Ensure every accepted replacement or profile change marks the report stale and input origin unverified. Do not auto-assume uploaded data is synthetic.
5. Add a “Run 18 regression cases” action that calls the engine for each cloned fixture and compares projected actual results with independent expected results.
6. Show MATCH/MISMATCH separately from a scenario's plan status. Show expected/actual differences, not just a green total.
7. Add current-report JSON export through browser Blob/object URL; disable on stale/unrun/pending input.
8. Use the provided CSV files to demonstrate actual Warehouse B mapping and missing-duration blocking.

### Do not build
No server upload route, persistence, automatic schema matching, arbitrary field edits, custom scenario designer, user account, or remote repository push.

### Exit gate
Real file selection changes the evaluation. Warehouse B inputs normalize correctly. Missing packing input blocks plan checks. Stale export is disabled. Actual regression results match all 18 expectations and running the suite does not alter selected user inputs. Typecheck, lint, tests, and build pass.

## M4 — Verification and interview handoff
### Read
Full `08_TEST_PLAN.md` and `09_DEMO_AND_HANDOFF.md`.

### Implement / verify
1. Compare copied seed JSON against originals; verify no fixture/oracle shortcuts were introduced.
2. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
3. Run Playwright Chromium against the production build on the dedicated test port. Check actual file selection, source targeting, stale state, and regression behavior.
4. Inspect the laptop page and a narrow viewport. Fix broken interactions, hidden statuses, or material clipping. Do not begin a visual redesign.
5. Check for accidental external data transmission, raw-content logging, real-company branding, unsupported production claims, and missing limitations.
6. Add `web/README.md` with actual setup/run/test commands, short architecture explanation, modeled assumptions, and known limitations.
7. Save real screenshots or logs when available. Update the final verification matrix accurately.
8. Rehearse the one-minute story and longer follow-up. Produce the owner handoff and stop.

### Exit gate
Full MVP done only when actual required checks pass and the demo is verified. A blocked browser or production build is disclosed as incomplete verification; do not combine it with passing counts. A documented M2 emergency checkpoint is not mislabeled full completion.

## Repair and interruption policy
Fix the smallest cause shown by an actual error. After two unsuccessful attempts on the same environment issue, record attempted commands and the blocker; do not spawn watchers, reinstall everything, disable assertions, or loop indefinitely. Genuine application defects remain defects until fixed; a time cutoff can defer the full demo but cannot relabel failure as success.

If interrupted, update HANDOFF with the exact next action. Resume from the first unfinished authorized task rather than replanning the project.

## Final builder response format
Provide: local run command; completed features; actual checks and outcomes; remaining limitations/unverified items; source of screenshots if created; one-minute demo script. Do not end with only “done,” a watcher status, or an offer to begin another milestone.
