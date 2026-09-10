# 09 — Demo script, value story, and owner handoff

## Positioning
This project is an independent exploration of an operational data-validation workflow. It is not a Haladir integration and does not establish a missing internal capability or measured customer benefit. Public materials already describe integration and decision traceability [S1–S3].

The demonstrated skill is the whole path: interpreting inputs, modeling a small set of rules, testing the behavior, and explaining the result through an interface.

## Before the call
Use only synthetic/publicly shareable inputs. Do not show Boeing code, private screens, or flight data without explicit permission. Verify the local app before the call; keep a working tab open. Do not deploy or change dependencies at the last minute.

Read the actual final VERIFICATION.md. Know what passed, what was not run, and what the tool does not model. Do not say “18 tests passed” merely because there are 18 example cases; use the actual engine/browser results.

## 15-second introduction
“I wanted to understand the integration and validation side more concretely, so I built a small tool with synthetic warehouse data. It checks a submitted plan and lets you trace a finding back to the original CSV cells. I’m not assuming you’re missing this internally; I thought it would be a useful way to explore the problem.”

Ask permission for a quick walkthrough. A hiring intro is not automatically a product-demo meeting.

## One-minute walkthrough
**0–10 seconds: baseline.** Select Baseline and Run checks. “These four exports describe orders, departures, workers, and a proposed picking plan. The tool checks that the inputs are usable before checking the plan.”

**10–30 seconds: one concrete failure.** Select Earlier departure and run. “This order finishes picking at 08:45. With the assumed 30-minute packing lag, it is modeled ready at 09:15. The departure moved to 09:05, so this submitted plan misses the modeled cutoff by ten minutes.” Open one or two exact source cells.

**30–45 seconds: uncertainty instead of fake confidence.** Select Missing packing duration and run. “Here the required duration is absent. I do not assume zero or show a green result; the data issue blocks the plan checks.” Show the blank source cell.

**45–60 seconds: reusable engineering.** “The same engine runs against a set of frozen edge cases, including alternate export headers, overlaps, and duplicate records. I kept the scope small so every result has a testable rule and an inspectable source.” Show the actual regression result only after running it.

## Longer follow-up, only when there is interest
Show Warehouse B's explicit mapping. Explain that the numeric result can be identical while field names and provenance differ. Show one expected-versus-actual regression comparison. Then ask about their real workflow rather than guessing it.

Useful question: “When onboarding a customer, what takes the most effort right now: getting their data into shape, capturing their operational rules, or making the result useful to the operator?”

## Questions the owner should be able to answer
### Why no LLM?
“These checks and explanations are exact calculations over known fields. A model would add an unnecessary failure mode to this particular workflow. A future semantic-mapping assistant would still need explicit approval and deterministic validation.”

### Why no optimizer?
“I wanted a small complete engineering example. This checks a proposed candidate; it does not search for a better one. A failed candidate does not prove no solution exists.”

### Why block everything for one missing value?
“That is a conservative simplification for the prototype. A production system could evaluate unaffected parts using explicit dependency tracking, but it must still distinguish blocked from passed results.”

### What is the biggest modeling limitation?
“Packing is an immediate fixed delay with no capacity queue. I also exclude staging, loading, travel, resource compatibility, multi-day time, and uncertain forecasts. Passing these checks is not proof of real-world feasibility.”

### How would it connect to a real system?
“I would first learn the actual data contract, identifier meanings, timing semantics, and workflow. Then I would add a narrow adapter and historical examples. This demo has no real connector or access.”

### Did AI write this?
“I used Claude Code to accelerate implementation. I supplied the scope, data contracts, independent scenarios, and verification requirements. The parts I can defend are the formulas, source tracing, limitations, and actual test outcomes.” Adjust this to match what you actually did; do not claim personal review of code you have not read.

### What value does it prove?
“It demonstrates that I can own a small workflow from schema to interface and make failures inspectable. Whether this exact tool would help your team depends on your current needs.” Do not invent saved hours or revenue.

## Ready-to-present checklist
Know the three core scenarios, the ten-minute calculation, the difference between data and plan status, the half-open interval rule, the no-packing-capacity assumption, and the actual verification status. Open the specific implementation and one test so you can explain them if asked.

## Final implementation handoff
Claude should provide the actual launch commands, implemented feature list, command outcomes, browser verification status, known omissions, and this demo script. If only M2 was completed, call it a built-in-scenario demo, not the full CSV-import/regression MVP.
