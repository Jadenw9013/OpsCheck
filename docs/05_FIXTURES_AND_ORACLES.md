# 05 — Synthetic fixtures and independent oracles

## Supplied files
`../seed-data/scenarios.json` contains 18 complete four-file bundles as CSV text, plus labels. `../seed-data/expected-results.json` contains the separately specified expected outcomes. Seven standalone CSVs in `../seed-data/import-examples/` exercise actual local imports.

Do not invent or regenerate the fixtures from production rule code. Copy the two JSON files into `web/src/fixtures/` once during M0. Preserve equality with the originals. Tests and the browser runner evaluate the CSV text, not pre-normalized records.

All times and identifiers below are synthetic. No observed savings, throughput, or real logistics outcomes are represented.

## Baseline S00
Shift starts 08:00. D-1 departs at minute 120 (10:00), D-2 at minute 180 (11:00). Both workers are available from minute 0 to 180.

| Order | Pick minutes | Pack minutes | Departure | Assignment | Worker | Start | End | Modeled ready |
|---|---:|---:|---|---|---|---:|---:|---:|
| O-101 | 20 | 15 | D-1 | A-1 | W-1 | 0 | 20 | 35 |
| O-102 | 25 | 15 | D-1 | A-2 | W-2 | 0 | 25 | 40 |
| O-103 | 15 | 10 | D-1 | A-3 | W-1 | 20 | 35 | 45 |
| O-104 | 20 | 30 | D-1 | A-4 | W-2 | 25 | 45 | 75 |
| O-105 | 30 | 15 | D-2 | A-5 | W-1 | 35 | 65 | 80 |
| O-106 | 25 | 20 | D-2 | A-6 | W-2 | 45 | 70 | 90 |
| O-107 | 20 | 10 | D-2 | A-7 | W-1 | 65 | 85 | 95 |
| O-108 | 25 | 15 | D-2 | A-8 | W-2 | 70 | 95 | 110 |

Each worker has four non-overlapping, back-to-back assignments. All picking intervals meet their required duration. All eight modeled ready times meet their assigned departure. Exactly 44 check instances pass.

## Frozen scenario matrix
Counts are **passed / failed / blocked individual plan checks**. Data-blocked cases have zero instances and five blocked rule families.

| ID | Scenario | Data | Plan | Checks P/F/B | Expected finding |
|---|---|---|---|---|---|
| S00 | Baseline | READY | PASS | 44 / 0 / 0 | None |
| S01 | Earlier departure | READY | VIOLATIONS | 43 / 1 / 0 | PLAN_READY_BY_DEPARTURE |
| S02 | Missing packing duration | INCOMPLETE | NOT_EVALUATED | 0 / 0 / 0 | DATA_MISSING_VALUE |
| S03 | Worker overlap | READY | VIOLATIONS | 43 / 1 / 0 | PLAN_WORKER_OVERLAP |
| S04 | Worker unavailable | READY | VIOLATIONS | 43 / 1 / 0 | PLAN_WORKER_AVAILABILITY |
| S05 | Exact deadline | READY | PASS | 44 / 0 / 0 | None |
| S06 | Insufficient picking time | READY | VIOLATIONS | 43 / 1 / 0 | PLAN_PICK_DURATION |
| S07 | Unassigned order | READY | VIOLATIONS | 37 / 1 / 1 | PLAN_ASSIGNMENT_COUNT |
| S08 | Duplicate order assignment | READY | VIOLATIONS | 48 / 1 / 1 | PLAN_ASSIGNMENT_COUNT |
| S09 | Unknown worker | INVALID | NOT_EVALUATED | 0 / 0 / 0 | DATA_UNKNOWN_REFERENCE |
| S10 | Negative duration | INVALID | NOT_EVALUATED | 0 / 0 / 0 | DATA_INVALID_NUMBER |
| S11 | Duplicate order identifier | INVALID | NOT_EVALUATED | 0 / 0 / 0 | DATA_DUPLICATE_ID |
| S12 | Unknown departure | INVALID | NOT_EVALUATED | 0 / 0 / 0 | DATA_UNKNOWN_REFERENCE |
| S13 | Non-numeric duration | INVALID | NOT_EVALUATED | 0 / 0 / 0 | DATA_INVALID_NUMBER |
| S14 | Reversed interval | INVALID | NOT_EVALUATED | 0 / 0 / 0 | DATA_INVALID_INTERVAL |
| S15 | Missing mapped header | INCOMPLETE | NOT_EVALUATED | 0 / 0 / 0 | DATA_MISSING_HEADER |
| S16 | Warehouse B mapping | READY | PASS | 44 / 0 / 0 | None |
| S17 | Missing and invalid inputs | INVALID | NOT_EVALUATED | 0 / 0 / 0 | DATA_MISSING_VALUE, DATA_UNKNOWN_REFERENCE |

## Important non-obvious outcomes
### S01: ten-minute miss
Only D-1 changes, from 120 to 65. O-104 ends picking at 45 and has a 30-minute packing lag: `45 + 30 = 75`. It is ten minutes beyond minute 65. Other D-1 orders are ready at 35, 40, and 45, so only one deadline check fails. Expected: 43 pass, one fail.

Required evidence: `plan.csv` record 5 `end_minute = '45'`; `orders.csv` record 5 `pack_minutes = '30'`; `departures.csv` record 2 `departure_minute = '65'`.

### S02: blank is not zero
Only the O-104 packing cell is blank. Expected one `DATA_MISSING_VALUE` at orders record 5 / pack_minutes, data INCOMPLETE, plan NOT_EVALUATED, zero instances, five blocked families. No synthetic deadline result is permitted.

### S03: preserve duration when moving the interval
A-3 becomes `[15,30)`, still 15 minutes long. It overlaps A-1 `[0,20)` by five minutes. No new picking-duration failure should appear.

### S05: equality is valid
D-1 moves to 75, exactly O-104's modeled ready time. All 44 checks pass. No epsilon or floating-point comparison is needed.

### S07: no assignment
Remove A-4. There are eight cardinality checks, seven duration checks, seven availability checks, nine overlap-pair checks, and eight deadline checks. One cardinality failure and one blocked deadline produce **37 pass, 1 fail, 1 blocked**.

### S08: duplicate order assignment, not duplicate key
Add A-9, assigning O-101 to W-2 from 120 to 140. A-9 has a distinct primary ID, sufficient duration, valid availability, and no worker overlap. O-101 now has two assignments. Its deadline check is BLOCKED rather than calculated from an arbitrarily selected assignment. Totals: **48 pass, 1 fail, 1 blocked** across 50 instances.

### S11: duplicate primary ID
Append a second O-101 order row. One `DATA_DUPLICATE_ID` is anchored at record 10 and has `relatedRecordNumbers: [2,10]`. Do not pick a winner or evaluate the plan.

### S15: missing column
Remove `pack_minutes` from the orders header and each data row. Emit one missing-header diagnostic at record 1. Do not emit eight missing-value errors; the schema itself is incomplete.

### S16: same values, different source headers
Warehouse B order headers are `OrderRef,PickMins,PackMins,TruckRef`. Departure headers are `TruckRef,DepartsAtMinute`. Each file explicitly selects `warehouse_b`. Workers and plan remain standard. Outcomes match S00; source-header metadata intentionally does not.

### S17: precedence without hiding information
Missing O-104 packing time and unknown W-9 on A-1 coexist. Emit both diagnostics; overall data INVALID takes precedence over INCOMPLETE. No plan evaluation runs.

## Expected-result projection
The independent expected JSON specifies these fields for each scenario:
```text
scenarioId                 // comparison metadata, not passed to the engine
dataStatus
planStatus
diagnostics[]              // code, table, recordNumber, column,
                           // relatedRecordNumbers only when present
failedChecks[]             // ruleId, subjectIds, exact normative metrics
blockedChecks[]            // ruleId, subjectIds, blockedBy
checkCounts                // passed, failed, blocked
blockedRuleIds[]
```

Implement a projection of the **actual** report into this shape. Omit absent optional diagnostic properties rather than setting them to undefined in serialized fixtures. Preserve stable sorting. Compare all specified fields deeply; do not compare only the top-level status or a screenshot.

`scenarioId` is attached by the regression runner, not returned by `evaluateBundle`. Human explanation wording need not exactly match fixture JSON, but source targets, numeric metrics, statuses, and counts must.

## Browser regression runner
For each fixture: create a fresh input bundle → call the same engine → project actual result → compare with independent expectation → store actual and expected values. A mismatch must show the differing field.

The regression outcome is **MATCH / MISMATCH**, separate from the modeled plan outcome. S01 is a successful regression match when the engine correctly finds its expected violation. Do not label expected operational violations as broken software tests.

Before running, show “Not run.” Never hardcode an “18/18” badge. Results only appear after actual synchronous fixture evaluation. Running the suite must not mutate the currently selected user inputs or their report.

## Additional tests beyond saved scenarios
The unit test plan includes empty tables, integer parsing boundaries, nested overlaps, malformed CSV, duplicate keys in other tables, quoted multiline cells, upload size limits, and semantic-equivalence checks. These do not require expanding the 18-case demo selector.

## Changing a fixture
Do not change data, metrics, or expected statuses to accommodate a buggy implementation. When a genuine specification contradiction is found, record the exact issue and seek a bounded contract decision. Fixture changes require intentional updates to both the source blueprint and copied files, plus an explanation in DECISIONS.md.
