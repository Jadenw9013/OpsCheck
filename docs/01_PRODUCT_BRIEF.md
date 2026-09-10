# 01 — Product brief and scope

## Product statement
**OpsCheck turns small operational exports and a proposed picking plan into an inspectable validation report.** It shows whether the inputs are usable, whether the modeled rules hold, and which original cells explain a problem.

The target user for this prototype is an implementation engineer or operations lead reviewing a synthetic warehouse example. This is not a production user-research finding.

## Why this is relevant to the interview
Haladir's engineering posting describes end-to-end work across integrations, decisioning, and operator interfaces [S1]. Its public platform describes customer-shaped operational data integration [S2]. Its Nomos material already describes traceable decisions and customer-specific validation [S3]. Sources and boundaries are in `10_SOURCE_NOTES.md`.

**Our hypothesis:** a compact data-to-explanation workflow could help discuss deployment debugging and regression testing. We have not verified an unmet need, access to an internal system, a cost saving, or demand for this exact tool.

Do not pitch this as replacing Nomos or discovering an obvious omission. Pitch the engineering judgment: explicit assumptions, understandable rules, source preservation, and an end-to-end interaction.

## The problem demonstrated
A spreadsheet-looking plan may fail for very different reasons:
- A needed input is absent, so the answer is not knowable from the file.
- A reference or value is invalid, so the dataset is not safe to evaluate.
- The data is well-formed, but the submitted plan violates a modeled rule.

A useful tool should distinguish these, avoid silently repairing the inputs, and show the source of each conclusion.

## Primary user journey
Load baseline → inspect mapping → run checks → change to an earlier-departure scenario → inspect the affected order and source cells → replace the orders export with one missing a duration → see evaluation blocked → rerun the frozen scenarios to verify expected behavior.

## MVP requirements
| ID | Requirement | Observable acceptance |
|---|---|---|
| P01 | Explicit CSV mapping | Both supported export profiles normalize to equivalent business values. |
| P02 | Data-readiness gate | Blank packing time produces INCOMPLETE, not zero or a plan pass. |
| P03 | Deterministic plan checks | Cardinality, picking duration, availability, overlap, and modeled departure readiness use the specified formulas. |
| P04 | Source-linked explanations | Selecting a result opens the exact file, logical record, and relevant column. |
| P05 | Repeatable regression runner | Each of 18 fixture bundles is actually evaluated and compared with independent expectations. |
| P06 | Local file replacement | Selecting a CSV changes the actual evaluated data rather than only the UI label. |
| P07 | Stale-state protection | Input/profile/scenario changes remove current-result claims until rerun. |
| P08 | Honest limitations | Synthetic/unverified origin, missing capabilities, and modeled assumptions remain visible. |
| P09 | Owner can defend the demo | The owner can explain one computation, one blocked case, one test, and one deliberate omission. |

## Fixed scope
Four tables, two curated mapping profiles for orders/departures, one profile for workers/plan, integer same-day times, one interval per worker, one worker per picking assignment, a fixed packing lag, a supplied plan, five operational rule families, one page.

Required inputs can be small local CSV files. All bundled cases are synthetic. Uploaded data is labeled user-supplied/unverified rather than falsely stamped synthetic.

## Non-goals
No logistics optimization, route planning, machine learning, cost minimization, event replay, uncertainty propagation, packing/staging resource model, shipping-capacity model, warehouse map, API integration, auto-fix, account system, persistence, billing, or cloud deployment.

A successful check does not prove the plan is executable in the real world. A failed candidate does not prove the scheduling problem is infeasible. Do not put either claim on the screen.

## What the side project demonstrates about the builder
| Behavior | Skill demonstrated | Business benefit to explore, not claim |
|---|---|---|
| Explicit mapping and input rejection | Integration discipline | Less ambiguity while onboarding operational exports |
| Exact, independently tested rules | Correctness and debugging | More reproducible defect reports |
| Source-linked results | Full-stack/product thinking | Easier review by an engineer or operator |
| Small complete workflow | Scope judgment and delivery | Ability to own a bounded product task |

## Success criteria
A viewer can identify the selected input, whether evaluation ran, what failed, why it failed, and where the input came from in under a minute. This is a design goal, not a measured usability result.

Keep the app visually focused on the data and findings. Do not add made-up throughput, savings, confidence scores, accuracy percentages, or “AI powered” decorations.
