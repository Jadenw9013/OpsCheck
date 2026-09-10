# 04 — Validation engine, exact rules, and report semantics

## 1. Public entry point
Implement one shared, pure entry point:
```ts
function evaluateBundle(input: InputBundle): EvaluationReport;
```

Pipeline: parse all four files → normalize valid fields while retaining raw sources → collect data diagnostics → validate keys/references → apply the data-readiness gate → evaluate plan rules only for a READY dataset → assemble stable output.

No engine behavior may inspect a scenario title/ID, import expected outcomes, call a model, fetch a service, mutate the input, or read the current clock. UI, Vitest, and the browser regression runner must all use this entry point.

## 2. Report shape
Use an equivalent strongly typed model:
```ts
type PlanStatus = 'NOT_EVALUATED' | 'PASS' | 'VIOLATIONS';
type CheckStatus = 'PASS' | 'FAIL' | 'BLOCKED';
type RuleId =
  | 'PLAN_ASSIGNMENT_COUNT'
  | 'PLAN_PICK_DURATION'
  | 'PLAN_WORKER_AVAILABILITY'
  | 'PLAN_WORKER_OVERLAP'
  | 'PLAN_READY_BY_DEPARTURE';

interface Operand {
  label: string;
  value: string | number;
  source: SourceRef;
}
interface CheckResult {
  key: string;
  ruleId: RuleId;
  subjectIds: string[];
  status: CheckStatus;
  summary: string;
  formula: string | null;
  operands: Operand[];
  metrics: Record<string, number>;
  blockedBy: string[];
}
interface CheckCounts { passed: number; failed: number; blocked: number; }
interface RuleCoverage extends CheckCounts {
  ruleId: RuleId;
  status: 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_APPLICABLE';
}
interface EvaluationReport {
  schemaVersion: '1.0';
  origin: DataOrigin;
  dataStatus: DataStatus;
  planStatus: PlanStatus;
  diagnostics: DataDiagnostic[];
  checks: CheckResult[];
  checkCounts: CheckCounts;
  ruleCoverage: RuleCoverage[];
  blockedRuleIds: RuleId[];
  // Also include the preserved raw tables and canonical dataset or null.
  // Define their exact types; do not use `any`.
}
```

Additional deterministic metadata is allowed. Do not put display state, runtime timestamps, elapsed time, random run IDs, or expected results into `EvaluationReport`.

Stable check key: `ruleId + ':' + subjectIds.join(':')`. IDs cannot contain colons under the data contract. Sort two overlap subject IDs by code-point ordering before creating a key.

## 3. Global data gate
When `dataStatus !== 'READY'`:
- `planStatus = 'NOT_EVALUATED'`.
- `checks = []` and all check counts are zero.
- `blockedRuleIds` contains all five rule IDs, in the order below.
- Each rule coverage status is BLOCKED, with zero instance counts.
- Keep actual data diagnostics and raw source records visible.

This is **five blocked rule families**, not five evaluated checks and not zero problems. Do not display “0 failed, all clear” because no operational checks ran.

## 4. Rule order and exact semantics
Order: assignment count, picking duration, worker availability, worker overlap, modeled departure readiness.

### R1 — PLAN_ASSIGNMENT_COUNT
**Unit:** one check for every declared order, including those with no assignments.

Let `n` be the number of assignments whose orderId matches the order.

Pass iff `n === 1`. Failure metrics: `{assignmentCount: n}`. Use the same metric on passes. Subject IDs: `[orderId]`.

Sources: the order ID cell and all matching assignment orderId/assignmentId cells. Zero assignments still has the order source to navigate to.

Copy: “O-104 has 0 picking assignments; exactly 1 is required.” For two, say two; do not silently choose one.

A repeated order reference in the plan with distinct assignment IDs is a cardinality failure, not a duplicate-primary-ID input error.

### R2 — PLAN_PICK_DURATION
**Unit:** one check for every declared assignment, even when its order has another assignment.

`allocatedMinutes = endMinute - startMinute`

Pass iff `allocatedMinutes >= order.pickMinutes`.

Metrics exactly:
```text
allocatedMinutes
requiredMinutes
shortfallMinutes = max(0, requiredMinutes - allocatedMinutes)
```

Subject IDs: `[assignmentId]`. Sources: assignment start/end and linked order pickMinutes. More allocated time than required is allowed; no efficiency claim or warning is needed.

### R3 — PLAN_WORKER_AVAILABILITY
**Unit:** one check for every assignment.

Pass iff `worker.availableFromMinute <= assignment.startMinute` AND `assignment.endMinute <= worker.availableToMinute`.

Metrics exactly: `startMinute`, `endMinute`, `availableFromMinute`, `availableToMinute`.

Subject IDs: `[assignmentId]`. Sources: assignment worker/start/end and referenced worker availability cells. Equality at either boundary is allowed. A worker with an unknown ID never reaches this rule; it is a data error.

### R4 — PLAN_WORKER_OVERLAP
**Unit:** one check for every unordered pair of assignments with the same worker. Do not check different-worker pairs. Emit each same-worker pair once.

For intervals A and B:
```text
intersectionStart = max(A.startMinute, B.startMinute)
intersectionEnd   = min(A.endMinute, B.endMinute)
overlapMinutes    = max(0, intersectionEnd - intersectionStart)
```
Pass iff `overlapMinutes === 0`.

Metrics exactly: `{overlapMinutes}`. Subject IDs: two assignment IDs in code-point order. Sources: both worker/start/end sets. Touching intervals such as `[0,20)` and `[20,35)` pass.

Check **all** same-worker pairs, not only adjacent sorted intervals. An interval nested inside a longer interval can otherwise be missed. With 100 assignment records maximum, a straightforward pairwise implementation is adequate for this demo; no performance claim is implied.

A worker with fewer than two assignments contributes no pair checks. A rule family with no eligible pairs is NOT_APPLICABLE, not a fake pass instance.

### R5 — PLAN_READY_BY_DEPARTURE
**Unit:** one check for every declared order.

First inspect that order's R1 result. When assignmentCount is not exactly 1, emit a BLOCKED result with `blockedBy: ['PLAN_ASSIGNMENT_COUNT:<orderId>']`, `metrics: {}`, and no invented ready time. Other independently evaluable rules still run.

Otherwise:
```text
pickEndMinute   = the unique assignment's endMinute
packMinutes     = order.packMinutes
readyMinute     = pickEndMinute + packMinutes
departureMinute = linked departure.departureMinute
slackMinutes    = departureMinute - readyMinute
lateMinutes     = max(0, -slackMinutes)
```
Pass iff `readyMinute <= departureMinute`. Exact equality passes. A computed readyMinute greater than 720 is allowed as a calculated result, remains greater than the allowed departure window, and must not be clamped or clock-wrapped. Use exactly these six metrics. Subject IDs: `[orderId]`.

Sources must include assignment end, order packing duration, order departure reference, and departure time. Explain that ready time assumes packing can start immediately and has no capacity queue.

Copy for S01: **“O-104 is modeled ready 10 minutes after its departure.”** Show `45 + 30 = 75`, departure `65`, slack `-10`, and `09:15 vs 09:05`. This is not a forecast of a real late shipment.

## 5. Evaluation counts and summary
For the baseline:
- R1: 8 checks.
- R2: 8 checks.
- R3: 8 checks.
- R4: 12 checks (two workers × six pairs among four assignments).
- R5: 8 checks.
- Total: **44 PASS, 0 FAIL, 0 BLOCKED**.

Counts are rule instances, not orders. Do not say “44 orders validated.”

For READY input, family status precedence is FAIL if any member failed; otherwise BLOCKED if any blocked; otherwise PASS if at least one passed; otherwise NOT_APPLICABLE.

Plan status precedence: any failed check → VIOLATIONS; otherwise any blocked check → NOT_EVALUATED; otherwise PASS. A dataset with no orders cannot accidentally pass, because it was incomplete at the data gate.

A failure in one submitted assignment is not proof that no possible plan exists. Never use “infeasible warehouse” or “no solution exists” for these reports.

## 6. Cascade policy
Be conservative without multiplying misleading errors:
- Invalid scalar → no dependent interval/reference checks for that scalar.
- Missing structural header → one missing-header diagnostic; no fake blank-cell diagnostics for every row.
- Bad primary key → input INVALID; no plan rule evaluations.
- Duplicate assignment IDs → input INVALID.
- Distinct assignment IDs for the same order → R1 failure; R5 blocked for that order; R2/R3/R4 still run.
- Missing assignment → R1 failure; R5 blocked; do not invent an assignment for R2/R3.

The global data gate is intentionally stricter than a production partial-evaluation system. Present that as a deliberate prototype simplification.

## 7. Evidence assembly
Each finding has a summary, exact formula when relevant, named operands with source references, and a navigation target. Engine code creates the numeric explanation. Components only format/arrange it.

For a missing packing value: raw source is the empty string, parsed value does not exist, and the report states why evaluation is blocked. Do not render blank raw data as a literal zero.

For profile B, evidence uses `PackMins` / `DepartsAtMinute`, not the standard profile's header names. The business outcome can match the baseline while the source metadata differs.

## 8. Determinism and immutability
Sort checks by fixed rule order and then by subject ID tuple. Use explicit code-point comparison. Return sources in stable order. Do not depend on object iteration over external maps, localized text sorting, wall-clock formatting, or input scenario labels.

Do not mutate fixture arrays, source rows, or bundle contents. Test by deep-freezing input and by evaluating the same fixture after evaluating a different one. Same exact input must yield structurally identical report output.

Canonical values and numeric outcomes should remain equal under row reordering or a supported alternate mapping, but source record numbers/header names legitimately change. Tests should distinguish semantic equivalence from byte-identical provenance.

## 9. JSON report
Export the current deterministic report plus a fixed human-readable limitations array if useful. Keep actual input provenance and origin labels. Do not include an “accuracy” score or a “production validated” field.

UI may offer a filename like `opscheck-report.json`; do not require a timestamp. Use Blob/object URL in the UI boundary and revoke the URL. No CSV report export and no server upload. Export must be disabled for not-run or stale reports.

## 10. Unexpected failures
A programming exception is not an invalid customer dataset. Catch it at the UI boundary, show “Evaluation could not complete,” retain inputs, and record a development error without displaying a success result. Fix the bug; do not weaken the contract or relabel it as a passed/skipped check.
