# M3 Implementation Plan — CSV Upload, Profile Switcher, Regression Dashboard, JSON Export

**Status:** IMPLEMENTED 2026-09-11. All five features are in the app and verified; see
`VERIFICATION.md` (M3 pass) and `HANDOFF.md`. Engine (M1) and demo UI (M2) were already complete and
were not modified. Two documented deviations from the text below: `DEMO_SCENARIO_IDS` was removed
rather than expanded, and `runRegressionSuite` returns the results array with a separate
`summarizeRegression` helper for the aggregate counts.  
**Prerequisite reading before touching any file:** `AGENTS.md`, `docs/02_ARCHITECTURE_AND_SETUP.md`, `docs/03_DATA_CONTRACTS.md`, `docs/04_VALIDATION_ENGINE.md`, `HANDOFF.md`.

---

## What exists today

| Area | State |
|------|-------|
| Validation engine (`web/src/domain/`) | Complete. All 18 fixture oracles pass. Do not touch. |
| Two mapping profiles (`profiles.ts`) | Implemented in the engine. No UI exposes them. |
| Scenario loader (`loadScenario.ts`) | Loads bundled scenarios. `DEMO_SCENARIO_IDS` is hardcoded to `['S00','S01','S02']`. |
| State machine (`useOpsCheck.ts`) | Handles scenario switching and engine runs. No file-upload actions exist yet. |
| Workspace UI (`Workspace.tsx`) | Renders the 3-scenario toolbar, timeline, findings, evidence, AI report. |
| All 18 scenarios | In `web/src/fixtures/scenarios.json`. Only S00/S01/S02 have toolbar buttons. |
| Regression oracle data | `web/src/fixtures/expected-results.json`. Used only in Vitest tests today. |

---

## Scope of this plan

Four features, in dependency order:

1. **CSV file upload** — four file slots, each with a profile selector
2. **Profile switcher** — per-slot dropdown (Standard / Warehouse B) visible before upload
3. **All 18 scenarios in the toolbar** — extend the existing scenario list
4. **Regression dashboard** — run all 18 fixtures, compare to frozen oracles, show pass/fail
5. **JSON report export** — download the current report as JSON (never a stale one)

Features 1 and 2 are tightly coupled. Features 3 and 4 share the fixture/oracle layer. Feature 5 is standalone.

---

## Feature 1 — CSV file upload

### What to build

Four file input slots (orders, departures, workers, plan). Each slot shows:
- Current file name (or "No file loaded" if missing)
- A "Choose file" button that opens a native `<input type="file" accept=".csv">`
- The currently selected profile for that slot (handled by Feature 2)
- A clear/remove button once a file is loaded

### State changes required in `useOpsCheck.ts`

Add a new action:

```ts
| { type: 'loadFile'; table: TableKind; fileName: string; csvText: string; profile: ProfileId }
| { type: 'clearFile'; table: TableKind }
| { type: 'setProfile'; table: TableKind; profile: ProfileId }
| { type: 'fileReadError'; table: TableKind; error: string }
```

On `loadFile`:
- Replace `bundle.files[table]` with the new `InputFile`.
- Set `bundle.origin` to `'USER_SUPPLIED_UNVERIFIED'`.
- Increment `inputRevision`.
- Clear `selectedFindingId`, `sourceTarget`, `lastReport` currency (set `reportRevision` to -1).

On `clearFile`:
- Set `bundle.files[table]` to `null`.
- Increment `inputRevision`.
- Clear derived state as above.

### File reading (UI layer only — never in domain)

Read files with `FileReader.readAsText`. This is an async operation; use a request token pattern to prevent a slow read from overwriting a more recent slot selection.

Enforce the limits from `docs/02_ARCHITECTURE_AND_SETUP.md` before passing to the engine:
- Max 262,144 bytes (256 KiB)
- Max 100 non-blank data records
- Max 32 columns

Reject over-limit files with a visible error per slot, not a silent truncation.

### New component: `FileSlot.tsx`

Props: `table`, `currentFile` (`InputFile | null`), `profile`, `onLoad(file)`, `onClear()`, `onProfileChange(p)`, `error?`.

Does not evaluate anything. Purely presentation + file reading callback.

Assemble four `<FileSlot>` elements in a collapsible "Upload your own CSVs" section in `Workspace.tsx`, below the scenario toolbar.

### Important constraints from the contracts

- A replaced file marks origin `USER_SUPPLIED_UNVERIFIED` even if the filename matches a supplied example.
- Resetting to S00 via the existing "Reset baseline" button must restore `SYNTHETIC` origin.
- Do not auto-infer a profile from the filename.
- Do not read file content in domain code; pass text into the engine only.

---

## Feature 2 — Profile switcher

### What to build

A per-slot dropdown with the supported profiles for that slot:

| Table | Supported profiles |
|-------|--------------------|
| orders | Standard, Warehouse B |
| departures | Standard, Warehouse B |
| workers | Standard only |
| plan | Standard only |

Use `supportedProfiles(table)` from `web/src/domain/profiles.ts` — it already returns the correct list. Do not hardcode the options.

Show the profile dropdown for a slot regardless of whether a file is loaded (setting profile before uploading is valid).

When a profile changes on a slot that already has a file loaded:
- Update `bundle.files[table].profile`.
- Increment `inputRevision` (the mapping changed, so the report is stale).
- Clear derived state.

### Mapping preview

Below each slot, show which source column maps to which canonical field for the selected profile. This information comes directly from `getMapping(table, profile)` in `profiles.ts` — iterate its `FieldMapping[]` and render a small table:

```
Source column     → Canonical field   Type
order_id          → orderId           identifier
pick_minutes      → pickMinutes       pick duration (min)
...
```

Show "unsupported" if `getMapping` returns null (warehouse_b on workers/plan). Do not show extra columns (unknown columns pass through; the engine will ignore them).

---

## Feature 3 — All 18 scenarios in the toolbar

### What to build

The current toolbar has three hardcoded buttons (S00, S01, S02). Replace with a dropdown or scrollable list showing all 18 scenarios from `scenarioList` (already exported from `loadScenario.ts`).

**Implementation detail:**
- Change `DEMO_SCENARIO_IDS` in `loadScenario.ts` from `['S00', 'S01', 'S02']` to the full list, or remove the constant and use `scenarioList` directly.
- The toolbar should show `scenario.id — scenario.title` for each entry.
- Keep S00 as the default (already the case via `BASELINE_SCENARIO_ID`).
- Keep "Reset to baseline (S00)" as a separate button.

The existing `selectScenario` action in `useOpsCheck.ts` already handles scenario switching correctly. No engine changes needed.

**Important:** Do not pass scenario IDs or titles into the engine. The engine result must not depend on which scenario is selected — it depends only on the CSV content.

---

## Feature 4 — Regression dashboard

### What to build

A separate panel (collapsible section or tab) that:
1. Has a "Run all 18 regression cases" button.
2. For each scenario, runs the engine against the bundled fixture inputs.
3. Compares the result to the frozen expected outcomes in `expected-results.json`.
4. Shows PASS / FAIL / MISMATCH per scenario in a table.
5. Shows aggregate counts.

### Where the oracle data lives

`web/src/fixtures/expected-results.json` — the frozen oracle. This file must not be edited to make a failing case pass.

`web/src/fixtures/loadScenario.ts` — `loadScenario(id)` returns a fresh `InputBundle` for any of the 18 scenario IDs.

### New module: `web/src/features/regression.ts`

Pure function, no React:

```ts
import expectedResults from '@/fixtures/expected-results.json';
import { evaluateBundle } from '@/domain/evaluateBundle';
import { loadScenario, scenarioList } from '@/fixtures/loadScenario';

export interface RegressionResult {
  scenarioId: string;
  title: string;
  status: 'PASS' | 'FAIL' | 'ERROR';
  detail: string;
}

export function runRegressionSuite(): RegressionResult[]
```

The comparison projection must match what the existing `fixture-oracles.test.ts` uses — check that test file before writing the comparison logic to keep them consistent.

**State:** Keep regression state separate from the main `useOpsCheck` state. A simple `useState` in a `useRegression` hook is sufficient.

**Important:** Regression runs use bundled SYNTHETIC fixtures only. They must not use or affect the user's current `bundle` in `useOpsCheck`. Running all 18 cases is a read from fixtures → engine → compare; it does not change the main workspace state.

**Do not run regression cases on upload.** The user triggers it explicitly.

### New component: `RegressionPanel.tsx`

Shows:
- Run button (disabled while running)
- Progress indicator
- Results table: scenario ID, title, PASS/FAIL/MISMATCH badge
- Aggregate: X/18 passed

---

## Feature 5 — JSON report export

### What to build

A "Download report" button that becomes active only when a current (non-stale) report exists.

**Never export a stale report.** The button must be disabled when `report === null` (i.e., when `reportRevision !== inputRevision`).

### New module: `web/src/features/exportReport.ts`

Pure function:

```ts
import type { EvaluationReport, InputBundle } from '@/domain/types';

export function buildExportPayload(bundle: InputBundle, report: EvaluationReport): object
export function downloadReportJson(bundle: InputBundle, report: EvaluationReport): void
```

`buildExportPayload` assembles: timestamp, origin, data status, plan status, check counts, the full checks array, and diagnostics. Do not include the raw CSV text in the export (it may be user-supplied data).

`downloadReportJson` creates a Blob, a temporary `<a>` element, triggers a click, and revokes the URL. This is standard browser download pattern.

Filename: `opscheck-report-<scenarioId or "custom">-<YYYYMMDDHHmm>.json`.

---

## What not to do

- Do not touch `web/src/domain/` — the engine is complete and frozen.
- Do not edit `web/src/fixtures/expected-results.json` to make tests pass.
- Do not edit `web/src/fixtures/scenarios.json` (must stay byte-identical to `seed-data/`).
- Do not add auto-inference of profiles from filenames.
- Do not read file content in domain code.
- Do not run plan rules on non-READY data (the engine already enforces this).
- Do not add a server, database, authentication, or external service.
- Do not add charting libraries, optimization, or AI mapping.

---

## Verification gates (run all before declaring done)

```bash
cd web
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

All must pass with no API key present. The 18 fixture oracle tests in `tests/fixture-oracles.test.ts` must still pass unchanged.

After browser checks: verify that uploading the sample files from `seed-data/import-examples/` produces the same engine result as the matching built-in scenario.

---

## Files to create

| File | Purpose |
|------|---------|
| `web/src/components/FileSlot.tsx` | Per-table file upload + profile selector + mapping preview |
| `web/src/components/RegressionPanel.tsx` | Regression dashboard UI |
| `web/src/features/regression.ts` | Pure regression runner |
| `web/src/features/exportReport.ts` | Report JSON assembly and download |

## Files to modify

| File | Change |
|------|--------|
| `web/src/features/useOpsCheck.ts` | Add `loadFile`, `clearFile`, `setProfile`, `fileReadError` actions |
| `web/src/components/Workspace.tsx` | Add upload section, regression panel, export button, expand scenario list |
| `web/src/fixtures/loadScenario.ts` | Expose full scenario list to toolbar (remove or expand `DEMO_SCENARIO_IDS`) |
| `web/tests/fixture-oracles.test.ts` | Confirm still covers all 18 cases (should need no change) |
