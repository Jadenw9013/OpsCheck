# 08 — Verification plan and acceptance tests

## Principle
Test the contract, not the fixture name or the implementation's own assumptions. The supplied expected JSON is independent of `evaluateBundle`. A displayed pass counter is never evidence that tests ran.

Use Vitest in Node for domain/integration behavior and Playwright for actual browser interactions. No coverage-percentage target is required; named behavioral assertions matter more than an inflated test count.

## A. Seed/oracle integration — required in M1
For each of the 18 cases:
1. Load a fresh bundle from the original CSV text.
2. Evaluate with the shared entry point.
3. Project the actual report into the expected-result contract.
4. Assert deep equality of data/plan statuses, diagnostic signatures, failed-rule metrics, blocked dependencies, all counts, and globally blocked rule IDs.
5. Report the case ID and precise field on failure.

Do not compute expected values by calling the engine. Do not approve snapshots automatically. Keep expected-result imports out of the domain. Add a guard or review that a rule cannot branch on S00/S01/etc.

Explicitly assert S00 has 44 passed instances; S07 has 37/1/1; S08 has 48/1/1. Data-blocked cases have zero instances and five blocked families.

## B. CSV and mapping tests
| Behavior | Expected assertion |
|---|---|
| Standard baseline | Correct scalar values and source record/column references |
| Warehouse B | Same business values and numeric outcomes; actual alias headers retained in evidence |
| Wrong profile selected | Missing expected headers; no fuzzy correction |
| Quoted comma in ignored `note` column | One logical cell, no shifted mapping |
| Quoted newline in ignored column | Correct logical record indices; no physical-line claim |
| UTF-8 BOM at first header | Matching works while the source model remains coherent |
| CRLF vs LF | Equal business values and numeric checks |
| Empty/whitespace-only body record | Ignored without renumbering later records |
| Row `,,,` in orders | Valid-width row with missing values, not silently skipped |
| Trailing newline | No extra entity or changed prior record numbers |
| Duplicate normalized header | Invalid; no auto-renamed header accepted |
| Missing pack header | One header issue, no per-row cascade |
| Extra header with valid data width | Preserved and listed as ignored |
| Short/long row | Invalid width; no truncation |
| Malformed quote | Invalid CSV; no evaluation |
| Too many rows/columns/bytes | Limit error; no partial/truncated pass |
| Unsupported workers/profile pair | Explicit invalid-profile diagnostic |
| Missing file | Incomplete; no plan evaluation |
| Empty required entity table | Incomplete |
| Header-only plan | Data READY; cardinality failures and blocked deadlines |

For malformed CSV, assert the app's stable diagnostic code, not a third-party parser's exact English message.

## C. Scalar parsing and relation tests
Test blank/whitespace separately from zero. Packing zero is valid; picking zero is invalid. Test integers at 0/1/720 and just outside each field's bounds. Test `020` as valid 20.

Reject negative, decimal, exponent, plus sign, `20min`, `NaN`, `Infinity`, and unsafe integer strings. Trim a parsed ID without losing its raw source value. IDs are case-sensitive and follow the stated grammar.

Test duplicate primary IDs independently for orders, departures, workers, and assignments. Test a duplicate plan orderId with a distinct assignmentId as an operational cardinality failure instead.

Unknown order, worker, and departure references block all plan checks. Missing scalar identifiers should not also produce redundant unknown-reference errors. A missing target-table header should not trigger one unknown-reference error per referring row.

Reversed/equal assignment interval and reversed/equal availability interval are invalid inputs. Invalid endpoints must not produce duplicate dependent-interval diagnostics.

## D. Rule unit tests
### Assignment count
Zero, one, and two assignments. Exactly one passes. With zero/two, that order's deadline result is BLOCKED with the exact R1 key, not PASS or a calculation from an arbitrary row.

### Picking duration
Allocated less than, equal to, and greater than required. Validate exact shortfall. A duplicate order assignment does not suppress independently evaluable duration checks.

### Worker availability
Exact beginning/end boundaries pass. Starts one minute before availability or ends one minute after fail. A valid rule reports the actual worker source cells.

### Overlap
Disjoint, touching, one-minute overlap, fully identical, fully nested, and different-worker pairs. Emit one result per unordered same-worker pair.

**Nested trap:** same worker intervals `[0,100)`, `[10,20)`, `[30,40)` have two overlaps involving the long interval, not just one adjacent-pair overlap. Test this explicitly.

Changing only worker IDs to a different worker can remove an overlap but must not alter durations. Reverse the input row order and verify the same overlap subject pairs/metrics, allowing source record locations to change.

### Modeled readiness
Exact departure equality passes. One-minute early and one-minute late boundaries. Zero packing lag. A valid end time plus packing duration can produce readyMinute greater than 720: preserve that number, fail the departure check, and display “outside modeled window” without wrapping the clock. Validate all six numeric metrics and source references. Blank packing never reaches this rule. Do not assert that a modeled result proves operational feasibility.

## E. Report, state, and determinism tests
- Evaluate the same immutable input twice: structurally equal report.
- Deep-freeze the input: evaluation must not mutate it.
- Evaluate early departure, then baseline: baseline returns its original values.
- Row-reorder input: semantic values/outcomes equivalent after appropriate subject sorting, source record differences allowed.
- Warehouse B vs standard: numeric outcomes equivalent; source aliases differ.
- Mixed missing/invalid diagnostics: INVALID precedence but both diagnostics retained.
- Family coverage counts sum to global counts. Empty same-worker comparison family is NOT_APPLICABLE.
- No data errors and no operational failures/blocks is the only path to PASS.
- The comparison helper returns MISMATCH for a deliberately altered actual metric/status/count. Perform this alteration in test code only.
- Regression runs do not mutate the currently selected bundle/report.
- Export serialization uses actual current report and preserves origin/limitations; not expected data.
- File/profile/scenario actions increment revision or otherwise invalidate a current report.
- An older file-read result cannot overwrite a newer replacement or a reset.

## F. Browser checks — required for full MVP
Use the built app on the dedicated Playwright port. Add stable accessible labels and narrow test IDs where repeated table text would make selectors ambiguous. Test behavior rather than Tailwind class strings.

### E1: initial and baseline
Load `/`; find OpsCheck, synthetic label, scenario selector, and Run checks. Before running, no “Passed implemented checks” claim and export is disabled. Run S00; assert Inputs ready, passed implemented checks, and exact summary counts 44/0/0.

### E2: earlier departure and evidence
Select S01 and run. Assert O-104 finding, ten-minute miss, 09:15 ready vs 09:05 departure, and 43/1/0. Open each main source target and assert correct table, record, header, and raw value. A source-link button that does nothing must fail this test.

### E3: missing data
Select S02 and run. Assert missing packing duration, INCOMPLETE data, NOT_EVALUATED plan, five blocked families, and no current order-ready calculation. Open orders record 5 and inspect the empty pack cell.

### E4: actual uploads and mapping
Start baseline. Use browser file selection (`setInputFiles`) with the supplied Warehouse B order and departure CSVs. Explicitly choose the B profile on those slots. Run; assert READY/PASS with 44 checks. Mapping/evidence show the actual B headers. Workers/plan are unchanged.

Then replace orders with `orders_missing_pack.csv`, select standard for that slot, and set departure back to the standard fixture/profile as needed. Run and assert the actual uploaded filename and the missing-duration result. Do not merely change a displayed scenario title.

### E5: stale state, reset, and export
Run baseline; change a profile or replace a file; assert stale message, no current green claim, and export disabled. Rerun to get a new report. Download JSON using Playwright's download event and assert it contains actual statuses and origin. Reset and verify original fixture values return, pending file reads cannot reapply old data, and the report requires a new run.

### E6: regression and input isolation
Select/run S01. Run all cases. Assert 18 actual matches and expected-versus-actual detail. S01's current report/input remains selected and unchanged. An expected plan violation is shown as a matching regression case, not an app-test failure.

### E7: presentation smoke
At a laptop viewport and about 390px width, verify primary actions/statuses remain accessible, no page-wide clipping hides controls, tables can scroll, and keyboard focus is visible. Check browser console for uncaught application errors. Test the empty evidence selection and an invalid import state.

## G. Verification order and evidence
Inside `web/`:
```text
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Keep actual exit results and relevant assertion counts in VERIFICATION.md. When screenshots are generated, capture at least baseline, earlier departure/evidence, and missing-data states from the real app. No fabricated screenshot or mock rendering is evidence of browser behavior.

## H. Environment failures
Chromium download unavailable: record BLOCKED and use an actual installed browser/manual verification only when available and documented. A manual screenshot is not equivalent to the full automated suite; distinguish them. Production build failure: do not silently call a dev-only page production-verified.

Never weaken numeric assertions, skip a failing case, hide console errors, disable TypeScript, or update the expected-results file merely to get a green run. A limited emergency demo can be disclosed as such; a false pass cannot.
