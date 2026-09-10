# 06 — Interface and interaction specification

## Design objective
A compact engineering tool, not a sales landing page. Within the first laptop viewport, the user should see the input/scenario, the action to run, the data state, the plan state, and any headline finding.

Use the project name **OpsCheck** with subtitle **“Trace a plan finding back to its source.”** No Haladir logo, endorsement, copied brand treatment, hero stock image, warehouse animation, fake KPIs, or chatbot.

## Page structure
```text
OpsCheck                         Independent demo | Synthetic inputs
Trace a plan finding back to its source.

[Scenario: Baseline                 v] [Run checks] [Reset baseline]
[Inputs & mapping] [Plan & findings] [Regression cases]

DATA: Not checked      PLAN: Not evaluated      INPUT: 8 orders / 2 workers

Main content (~60%)                      Evidence (~40%)
Plan rows / findings                     Select a finding to inspect inputs.
O-101 ...                                Formula and named operands
O-104 ...                                [Open source record]

[Source viewer: orders | departures | workers | plan]
Actual CSV headers; record numbers; highlighted source cell

Assumptions: same-day minutes; immediate fixed packing lag; no packing capacity.
Passed checks are not proof of real-world feasibility or optimality.
```

This is a text layout specification, not a requirement to render a diagram. Use standard accessible tabs/buttons or an equally simple layout. No multi-page navigation is necessary.

## Visual treatment
A light neutral canvas, clear text contrast, restrained borders, one primary action color, and distinct neutral/amber/red/green status treatments **with text and icons or labels**, never color alone. Use system fonts and monospace for IDs/numeric source values. Avoid ornamental gradients and oversized empty cards.

Aim for a useful layout around 1366×768 or 1440×900. Scrolling in a source table is fine; primary status/action must not be buried below it. Around 390px width, stack the evidence panel below results and allow horizontal table scrolling without clipping the entire page.

Do not spend more than roughly 20 minutes polishing typography before the first correct scenario flow works. This is a planning budget, not a benchmark.

## Status copy
| Engine/UI state | Display |
|---|---|
| No evaluation yet | “Ready to check” / “Plan not evaluated” |
| File being read | “Reading local file…”; disable evaluation |
| Changed input | “Inputs changed. Run checks again.”; old report is not current |
| Data READY | “Inputs ready” |
| Data INCOMPLETE | “Missing required data” |
| Data INVALID | “Invalid input data” |
| Data not READY | “Plan not evaluated — resolve the input issues first” |
| Plan PASS | “Passed implemented checks” |
| Plan VIOLATIONS | “Submitted plan has modeled violations” |
| Rule BLOCKED | “Not evaluated” plus dependency/reason |
| Rule NOT_APPLICABLE | “No applicable comparisons” |
| Unexpected exception | “Evaluation could not complete” — no success state |

Keep data diagnostics and operational findings distinct. Do not call data incompleteness an operational failure or style no evaluation as a successful green result.

## Scenario toolbar
Preload S00 input values but do not preclaim a pass. The first action is “Run checks.” Provide all 18 cases in a labeled selector, with S00 baseline, S01 earlier departure, and S02 missing packing easy to reach.

Selecting a case replaces the entire four-file bundle with a fresh clone, sets each profile, clears upload errors and selected evidence, increments revision, and marks results not current. “Reset baseline” does the same for S00. Do not silently auto-run some changes while requiring explicit runs for others.

Selecting a built-in case discards current local replacements; explain that near Reset. Do not persist files on refresh.

## Input and mapping panel
Four file slots: orders, departures, workers, plan. Show actual filename, source record count after parsing, profile, and local file-selection control. Native labeled file inputs are sufficient; drag-and-drop is not required.

Orders/departures have `standard` and `warehouse_b` profile selectors. Workers/plan remain visibly standard. Changing a profile marks the report stale and does not transform the file content.

Mapping preview shows actual source header → canonical field → unit/type. Highlight absent required headers and explicitly list ignored extra columns. This is a curated mapping preview, not an arbitrary user mapping editor.

Reject files over the configured cap before reading; also enforce domain limits after parsing. Show read/size/profile errors near the affected slot. Do not treat `.csv` filename or MIME type as proof of content validity.

## Plan table
For READY data, show assignment, order, worker, start, end, pick requirement, assumed packing minutes, linked departure, modeled ready time, and row findings where practical. Avoid cramming all columns into the first viewport; a compact subset plus evidence is acceptable.

Every displayed ready time, slack, or overlap comes from an evaluated rule result. Derived offsets beyond minute 720 display as the exact minute value plus “outside modeled window,” not a wrapped or fictitious clock time. Before evaluation or when that order's rule is blocked, show “Not evaluated,” not an inferred result. When there are duplicate order assignments, never pick one implicitly to show a ready time.

Raw source tables remain available even when the canonical dataset cannot be built.

## Findings list and evidence panel
Show input diagnostics first when data is not READY. For evaluated plans, show FAIL and BLOCKED results before passes, with stable order within each group. Make the passed-check inventory collapsible.

Selecting a finding reveals:
- Plain-language summary, status, rule ID or data diagnostic code.
- Exact formula and named numeric operands where applicable.
- Source file, logical record number, source column, raw value, and parsed value where one exists.
- Buttons to open the corresponding source cells.
- The modeling caveat when relevant.

### Exact S01 panel
Heading: “O-104 is modeled ready 10 minutes after departure.”

```text
Picking ends          45 min  (08:45)
Assumed packing       30 min
Modeled ready         75 min  (09:15)
Departure             65 min  (09:05)
Slack                -10 min

45 + 30 = 75; 75 > 65
```

Include the three main source links specified in `05_FIXTURES_AND_ORACLES.md`. Explain that packing is an immediate fixed lag, with no capacity queue modeled.

### Exact S02 panel
Heading: “O-104 is missing a packing duration.”

```text
orders.csv · record 5 · pack_minutes
Raw value: [empty]
No duration was assumed. All five plan rule families are blocked.
```

Do not show an O-104 departure pass behind this panel.

## Source viewer
Tabs correspond to the four raw tables. First column displays logical record number; the header is identified as record 1. Retain source headers, including Warehouse B aliases and ignored columns.

A source-navigation action changes the selected table, reveals the record, scrolls it into view when necessary, and visibly highlights the relevant cell. Keyboard focus should move predictably to the source region or targeted button. Provide a caption explaining “record number, not physical line number.”

For a missing column, highlight the header region and show the absent expected column in the diagnostic; do not pretend an actual cell exists. Blank values display `[empty]` in evidence but may remain visually blank in the source table with an accessible label.

Render all CSV text through normal React text interpolation. Never use `dangerouslySetInnerHTML` for source content.

## Regression panel
Button: “Run 18 regression cases.” Initial state: “Not run.” After actual evaluation, show “18/18 matching expected behavior” only when true. Include each case's expected data/plan status, actual status, and MATCH/MISMATCH.

A case with an expected plan violation can still MATCH. Use text explaining this distinction. On mismatch, show at least the differing field and expected/actual value. Running regression cases must not overwrite the current selected bundle or its report.

## Export
Button: “Export current report (JSON).” Disabled when no current completed report exists or a file is being read. Export actual report content and limitations, never an HTML screenshot or fabricated summary.

## Origin, limitations, and privacy
Bundled fixture banner: “Synthetic data · Independent prototype · No live integration.”

After any local upload: “User-supplied data · Provenance unverified · Local demo only.” Never assert an uploaded file is synthetic based on its name. Include “Do not use confidential or production data in this demo.”

Persistent limitations: same-day relative minutes; supplied plan only; no optimization; immediate fixed packing lag; no packing/staging/loading capacity; no dates or time zones; no persistence; only implemented checks were evaluated.

## Accessibility and empty states
Use labeled controls, visible keyboard focus, semantic headings/tables, meaningful button names, and a polite live region for run completion/errors. Do not auto-move keyboard focus on every keystroke. Handle no finding selected, empty plan, no report, malformed import, blocked evaluation, and unexpected execution failure deliberately.
