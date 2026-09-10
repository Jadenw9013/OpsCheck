# Decisions — accepted MVP design

These are design choices for this prototype, not claims about Haladir's internal implementation.

| ID | Decision | Reason / consequence |
|---|---|---|
| D01 | One Next.js/TypeScript app in `web/` | Avoid a second backend and avoid scaffolding over this kit. |
| D02 | Pure browser-usable TypeScript engine | Same behavior in unit tests, the scenario runner, and the interface. |
| D03 | Local CSV inputs; no live integrations | Makes the demo self-contained and avoids access, privacy, and setup dependencies. |
| D04 | Explicit curated mapping profiles only | Demonstrates integration work without guessing business semantics. |
| D05 | Global data-readiness gate | Invalid/missing data prevents operational evaluation; simpler, conservative behavior. Affected-only evaluation is future scope. |
| D06 | Distinct data and plan statuses | Incomplete data is not a broken schedule, and no evaluation is not success. |
| D07 | Same-day integer relative minutes | Exact arithmetic, simple boundaries, and no false timezone/DST completeness. |
| D08 | Half-open worker intervals | Back-to-back assignments are valid; overlap has a precise definition. |
| D09 | Fixed immediate packing delay; no packing capacity | Keeps the example tiny. The resulting ready time is explicitly modeled, not guaranteed. |
| D10 | Every rule result retains source evidence | An operator or engineer can inspect the inputs behind the answer. |
| D11 | Evaluate a fixed submitted plan, never optimize | A failed candidate is not proof that the entire scheduling problem is infeasible. |
| D12 | 18 frozen fixtures and separately supplied expected results | Repeatable edge-case demonstrations and independent assertions. |
| D13 | All same-worker pairs, not just adjacent intervals | Correct for nested intervals; small input caps make quadratic checks acceptable. |
| D14 | JSON report export only | Avoid introducing CSV report escaping and spreadsheet execution risks. |
| D15 | No persistent user data | Refresh discards input replacements; a deliberate MVP limitation. |
| D16 | Stale results cannot masquerade as current | File/profile/scenario changes require reevaluation. |
| D17 | One builder; bounded repair attempts | Spend time on a working demonstration, not review coordination. |
| D18 | M2 is the emergency checkpoint; M4 is full MVP done | A partial demo is acceptable only when limitations and unrun checks are disclosed. |
| D19 | Stable dependencies chosen once, then lockfile | Do not hardcode assumed current patch versions or constantly upgrade mid-build. |
| D20 | No automatic public deployment or remote push | The owner decides what becomes public and when. |

## Changes
Append new decisions with context and the actual authorizing instruction. An implementation preference can be chosen locally; changing numeric semantics, fixture expectations, scope, or data-use rules requires explicit agreement when it contradicts this kit.
