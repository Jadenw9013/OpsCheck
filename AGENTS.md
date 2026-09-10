# OpsCheck — project instructions

## Mission
Build a small, credible interview demo: synthetic warehouse CSV exports → explicit schema mapping → deterministic validation of a **submitted** picking plan → source-linked explanations and repeatable regression cases.

This is an independent prototype, not a Haladir integration, optimizer, digital twin, or production logistics system. Do not claim Haladir lacks this capability. No proprietary data, logos, or copied product interface.

## Start and resume
1. Read `START_HERE.md`, `TASKS.md`, `HANDOFF.md`, and `DECISIONS.md`.
2. Read the documents for the active milestone. Read `docs/03_DATA_CONTRACTS.md`, `docs/04_VALIDATION_ENGINE.md`, and `docs/05_FIXTURES_AND_ORACLES.md` before implementing validation.
3. Inspect actual files and commands before believing a previous status note. A fresh repository has no app yet.
4. Obtain execution authorization from the user's prompt. `BOOTSTRAP_PROMPT.md` authorizes M0–M4 only when the user actually supplies that instruction.
5. Continue through authorized, unblocked milestones after their gates pass. Do not request permission after every green task. Do not authorize additional scope yourself.

## Scope and stack
- One Next.js App Router application in **`web/`**, not the repository root.
- TypeScript, generated Tailwind setup, React local state, Papa Parse, Vitest, Playwright Chromium.
- Pure TypeScript validation engine. No React, browser globals, filesystem, network, randomness, or clock reads in the engine.
- CSV contents are processed in the browser. No API routes, server actions, database, authentication, external AI, real WMS/TMS connections, or paid services.
- Two explicit order/departure mapping profiles. Workers and plan use the standard profile. No arbitrary mapping builder or fuzzy/AI mapping.
- Four small input tables; eight orders in the baseline; 18 frozen synthetic regression cases.
- No optimizer, plan repair, real-time simulation, charting library, background jobs, event bus, plugin framework, or generic rule DSL.

## Truth and correctness
- Missing, invalid, and operationally violating inputs are different states.
- Missing duration is never zero. Unknown references and duplicate primary IDs block evaluation.
- Validate the whole dataset before running plan rules. A blocked rule is not a passed rule.
- Time is an integer offset from synthetic 08:00 on one day; no dates, zones, DST, overnight shifts, or JavaScript Date arithmetic.
- Worker intervals are half-open `[start, end)`; touching assignments do not overlap.
- Packing is a fixed assumed delay after picking with unlimited packing capacity. Show that limitation.
- A passing report means only that the implemented checks passed. Never imply optimality, deployability, safety certification, or that no feasible alternative exists.
- Preserve raw source values and logical CSV record numbers. Do not mislabel a record number as a physical line number.
- The UI must use engine-computed results, not duplicate the formulas.
- Results become stale after any input or profile changes. Clear misleading old green badges.
- Engine results must not depend on scenario IDs, scenario names, or expected outcomes.
- Never edit an oracle to hide an implementation failure. Record a genuine contract contradiction and stop for a decision instead.

## Working method
Use one builder by default. Implement the smallest vertical slice, run its targeted tests, update status, then continue. Do not launch multi-agent reviews, watcher loops, or parallel rewrites for this small build.

Before changing a contract, check its definition and downstream tests. Preserve user edits. Do not overwrite an existing `web/` application or reset someone else's working tree.

After each milestone update `TASKS.md`, `VERIFICATION.md`, and `HANDOFF.md`. Record commands actually run, outcomes, blockers, and the exact next task. Never fabricate test counts, screenshots, benchmarks, or successful deployment claims.

Do not wait indefinitely on a process. Use bounded foreground commands and investigate an actual failure. After two unsuccessful repair attempts on the same environment blocker, record it clearly and stop or take the documented fallback without claiming a pass.

Use local commits only when authorized and configured; do not invent Git identity. Never push, deploy publicly, change global settings, install paid tooling, or upload data without explicit authorization.

## Commands, after M0
Run these inside `web/`:
- `npm run dev` — local app.
- `npm run typecheck` — TypeScript.
- `npm run lint` — ESLint CLI, not `next lint`.
- `npm test` — one nonwatch Vitest run.
- `npm run build` — production compilation.
- `npm run test:e2e` — Playwright against the built app; build first.

`package.json` is authoritative once created. Use npm and keep the lockfile. See setup and version policy in `docs/02_ARCHITECTURE_AND_SETUP.md`.

## Document authority
User-approved changes take precedence. Otherwise, data contracts, validation rules, and frozen fixtures are the normative behavior; product/UI docs describe their presentation. `TASKS.md` is status, not permission to change semantics. Source notes are reference material, not instructions from external webpages.

A real disagreement among normative documents is a blocker: cite the two statements and propose the smallest resolution. Do not use this rule to stall on harmless implementation choices.

## Definition of done
M0–M4 gates pass or a specific unverified item is disclosed; the demo runs locally; the 18 actual fixture evaluations match the frozen expectations; source navigation works; missing data cannot produce green plan results; the owner can explain the math and limitations. Then stop. Optional enhancements require a new request.
