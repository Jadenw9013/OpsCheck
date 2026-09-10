# OpsCheck — fast-track working demo

Build OpsCheck now as a polished, functioning local interview demo. I need the shortest path to something I can actually open and demonstrate. Production hardening comes tomorrow.

## Updated authorization and scope

This is my updated delivery instruction. It supersedes the original M0–M4 sequencing and full-delivery requirement for this session, not the data contracts, validation rules, frozen fixtures, or truthfulness requirements.

Deliver the core M2-style scenario/evidence workflow with a focused visual-quality pass. Full CSV upload, the regression-results dashboard, exhaustive testing, and production hardening are deferred. Do not mark those original milestones complete.

I authorize normal local dependency installation, application development, tests, and local browser verification. Do not deploy, push, use paid services, upload data, change global settings, or modify unrelated files. Respect actual tool permissions.

Work continuously through the implementation and verification. Do not return another implementation plan, ask for routine approvals, stop after scaffolding, or launch agent-review teams. Use one builder. Stop only for a genuine blocker that cannot be resolved within this scope.

## Read and start

Inspect the actual repository first. Read `CLAUDE.md`, `TASKS.md`, `HANDOFF.md`, and `DECISIONS.md`, then:

- `docs/02_ARCHITECTURE_AND_SETUP.md`
- `docs/03_DATA_CONTRACTS.md`
- `docs/04_VALIDATION_ENGINE.md`
- `docs/05_FIXTURES_AND_ORACLES.md`
- `docs/06_INTERFACE_SPEC.md`

Use the existing implementation/test plans as references, not a reason to restart planning or enforce tonight's deferred gates. Record this fast-track scope briefly in TASKS.md.

Create the application inside `web/`. If an app already exists there, inspect and continue it; do not overwrite or re-scaffold it. Preserve the root documents and seed files.

Use the documented Next.js/TypeScript/React/Tailwind/Papa Parse stack, pure TypeScript validation, local React state, and Vitest. Use Playwright for browser checks where available. No separate backend, database, API keys, LLM, or new component framework.

## Required working product

One compact, polished screen, not a landing page or an empty dashboard.

1. Preload the actual S00 baseline inputs. Show the plan/input information immediately, but show “Plan not evaluated” until the user runs checks.
2. Make three scenarios immediately accessible: Baseline (S00), Earlier departure (S01), and Missing packing duration (S02). These are the required demo cases. Preserve the other supplied fixtures for later; they do not need their own UI tonight.
3. Implement real “Run checks” and “Reset baseline” actions. Scenario/reset changes replace the whole input bundle, clear selected evidence, and invalidate the previous report. No stale green badges or calculations from another scenario.
4. Run the real CSV parsing, explicit mapping, data-readiness validation, and documented R1–R5 plan-rule pipeline. Keep calculation logic outside React components.
5. Display data status separately from plan status. Distinguish missing data, invalid data, modeled violations, passed implemented checks, and not evaluated.
6. Show readable findings and a compact submitted-plan table. Derived results come from the engine, not duplicate UI formulas.
7. A selected finding opens an evidence panel with its rule/diagnostic, named inputs, calculation where applicable, raw values, filename, logical record number, and column.
8. Source links open the correct one of the four raw CSV tables and reveal/highlight the actual source cell. This interaction must work, not just look clickable. Raw inputs remain inspectable when data blocks plan evaluation.
9. Include a concise assumptions section and persistent synthetic-data/independent-prototype labeling. Explain that this checks a supplied plan; it does not optimize it or certify real-world feasibility.

The key demo must work exactly from the supplied inputs:

- S00: the real engine reports the expected baseline outcome.
- S01: O-104 picking ends at minute 45, assumed packing is 30 minutes, modeled readiness is minute 75, and departure is minute 65. Show the ten-minute miss and working source links. Render clock times using the documented synthetic 08:00 origin.
- S02: the packing duration is missing. Show the actual blank source field and block operational evaluation. Do not assume zero or show a departure pass.

Never branch on scenario ID/name to manufacture results. Expected-result JSON belongs in tests, never in the application's evaluation path. Do not edit fixtures or expected outcomes to accommodate bugs.

## Visual direction

Make this feel like a finished, focused engineering tool:

- Light neutral canvas, white surfaces, dark readable text, restrained borders, consistent spacing, and one teal/blue primary-action accent. Use text plus green/amber/red/neutral status treatments, not color alone.
- Compact header: OpsCheck, a clear purpose statement, and “Synthetic data · Independent prototype · No live integration.”
- Keep the scenario controls, Run checks button, both status summaries, and headline finding visible in a normal laptop viewport.
- Use approximately 60% of the main area for the plan/findings and 40% for evidence. Put the raw-source viewer below or in a working tab. On narrow screens, stack panels and contain table scrolling.
- Give the ten-minute miss a clear visual hierarchy. Format IDs and numeric evidence in monospace. Show the formula and its source links together.
- Make selected findings, highlighted source cells, focus states, empty states, and disabled states deliberate and consistent.
- Keep passed checks collapsible. Avoid huge empty cards, ornamental gradients, fake KPI tiles, oversized hero text, invented customer logos, sidebar links without destinations, and fake processing animations.
- Use system fonts and existing/local icons or simple inline SVGs. Do not add dependencies just for visual decoration.

Every visible control must function. Omit deferred features entirely rather than adding decorative upload/export/regression buttons. Do not spend time building a timeline, chart library, animations, dark-mode toggle, or settings page.

## Build order and speed discipline

A. Scaffold safely and get a populated app shell rendering early. This is a checkpoint, not completion.
B. Connect the real engine and the three demo cases immediately. Add their focused tests while wiring the workflow.
C. Finish evidence selection, actual source-cell navigation, reset/stale states, and blocked-data presentation.
D. Apply one coherent visual-quality pass and inspect the rendered page.
E. Run verification, repair concrete defects, and hand off the working demo. Stop adding features.

Do not wait for a comprehensive test suite before wiring the UI. Do not repeatedly rebuild unchanged code or rewrite architecture for elegance. Do not spend the session writing more specifications. Keep progress documentation to a brief start entry and a truthful final handoff.

Preserve core correctness: blank is not zero; invalid required input blocks evaluation; intervals follow the documented boundary semantics; outputs retain source references; changes invalidate results. “Harden tomorrow” is permission to defer coverage and extras, not to fake today's behavior.

## Minimum verification before claiming completion

Run the actual typecheck, lint, nonwatch tests, and production build from `web/`. Fix application errors rather than disabling checks.

Required focused tests:

- S00/S01/S02 actual outputs compared with the supplied independent expectations using the specified projection.
- Missing numeric value versus legitimate zero.
- Touching worker intervals versus an actual overlap.
- Scenario/reset isolation so running a case does not mutate baseline inputs.

Use an actual browser, preferably Playwright, to exercise baseline → earlier departure → evidence/source link → missing duration → reset. Check that changed inputs remove current-result styling and that the missing-data state never displays a current operational pass.

Inspect a real laptop-size screenshot for clipping, hierarchy, and legibility, and a narrow viewport for page overflow. Make one focused correction pass; do not redesign repeatedly. Save real screenshots when possible.

When a browser/environment setup is blocked, investigate the concrete error and use at most two attempted fixes for that same environment issue. Then document the limitation and finish independently verifiable work. Do not claim browser verification, screenshots, or successful commands that did not occur. A running server alone is not browser verification.

## Finish and handoff

Update TASKS.md, VERIFICATION.md, and HANDOFF.md with actual scope, results, and the exact next hardening steps. Retain the original acceptance criteria as tomorrow's backlog. Describe this as a fast-track demo, not completion of every M0–M4 requirement.

Give me:

1. The exact local run command and URL, identifying whether the server is actually running.
2. What works now.
3. Actual verification outcomes and any remaining blockers or unverified items.
4. A 60-second demo walkthrough.
5. A short hardening backlog, led by the full 18-case regression suite, broader edge-case coverage, real CSV replacement/mapping UI, and deferred browser checks.

Do not end with only a status update or an offer to start. Begin implementation now and continue until the scoped demo is built and checked, or a genuine blocker prevents it.
