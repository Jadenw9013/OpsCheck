# Start here — OpsCheck build kit

**What you are building:** a small warehouse-data and fixed-plan validation tool that makes problems visible from the original CSV cell to the user-facing explanation.

**What this folder contains:** implementation instructions and synthetic seed data. It does **not** contain a built application. Claude Code will create the application under `web/`.

## Start in a greenfield folder
Extract this kit into the folder you intend to use as the repository. You should see `CLAUDE.md`, `TASKS.md`, `docs/`, and `seed-data/` at its root. Open Claude Code **in that root**, not inside `docs/`.

Paste the complete contents of `BOOTSTRAP_PROMPT.md` into Claude Code. That prompt supplies bounded execution authorization for M0–M4. No API keys, cloud accounts, or company access are needed.

Do not run `create-next-app .` over these documents. The scaffold belongs in the currently absent `web/` child directory. Exact setup instructions are in `docs/02_ARCHITECTURE_AND_SETUP.md`.

## The demo in one minute
1. Run the baseline: the modeled checks pass.
2. Load “Earlier departure”: O-104 is modeled ready at minute 75 while its departure is minute 65. Show the ten-minute miss and the source cells.
3. Load “Missing packing duration”: the tool says the data is incomplete and does not evaluate the plan.
4. Show the second explicit export mapping and the real fixture-regression results if time permits.

The central story is **not** “I built an optimizer.” It is “I can connect messy operational inputs, defensible logic, and a useful interface, and show where the answer came from.”

## Read by purpose
| Need | Document |
|---|---|
| Give Claude the initial instruction | `BOOTSTRAP_PROMPT.md` |
| Always-on boundaries | `CLAUDE.md` |
| Product, scope, value hypothesis | `docs/01_PRODUCT_BRIEF.md` |
| Stack, folder layout, setup, commands | `docs/02_ARCHITECTURE_AND_SETUP.md` |
| CSV schemas, mapping, types, provenance | `docs/03_DATA_CONTRACTS.md` |
| Exact formulas, statuses, dependencies | `docs/04_VALIDATION_ENGINE.md` |
| Baseline, scenario truth, seed usage | `docs/05_FIXTURES_AND_ORACLES.md` |
| Screen layout, behavior, exact copy | `docs/06_INTERFACE_SPEC.md` |
| Milestone tasks and exit gates | `docs/07_IMPLEMENTATION_PLAN.md` |
| Unit, integration, browser, boundary tests | `docs/08_TEST_PLAN.md` |
| Interview walkthrough and likely questions | `docs/09_DEMO_AND_HANDOFF.md` |
| Primary sources and unknowns | `docs/10_SOURCE_NOTES.md` |
| Current progress and next work | `TASKS.md`, `HANDOFF.md` |
| Fixed tradeoffs and verification evidence | `DECISIONS.md`, `VERIFICATION.md` |

## Time and stopping policy
Planning estimate, not a promise: approximately **3–5 focused hours** for the full M0–M4 demo, depending on environment and debugging. Aim for a usable built-in-scenario screen at M2; that is the emergency presentation checkpoint. Spend remaining time on imports, regression reporting, and verification rather than a bigger interface.

When time is tight, use the explicit checkpoint prompt below. Do not silently pretend deferred features were built. Never trade away missing-data semantics, truthful results, or source attribution to add polish.

### Emergency checkpoint prompt
```text
Stop adding scope. Finish the smallest reliable built-in-scenario demo through M2.
Preserve the fixed validation contracts. Mark M3/M4 features that were not completed
as deferred or not run. Verify the demo route, record actual evidence, update
TASKS.md and HANDOFF.md, and give me the exact local command and a 60-second script.
Do not claim the full MVP or all browser checks passed.
```

### Resume prompt
```text
Read CLAUDE.md, TASKS.md, HANDOFF.md, and the latest VERIFICATION.md entry.
Inspect the actual repository and current command results. Continue from the first
unfinished task within the authorization already recorded from my bootstrap prompt.
Do not restart completed milestones, expand scope, or repeat broad reviews.
```

## Intended first output from Claude
A brief statement of the active milestone and any genuine environment issue, followed by implementation. It should not respond with a second giant plan and wait for an unnecessary approval. The detailed plan is already in this folder.

## Launch after implementation
From the repository root:
```text
cd web
npm run dev
```
Open the local address printed by Next.js, normally `http://localhost:3000`. For the interview, a verified production build (`npm run build`, then `npm run start`) is preferable to making last-minute code changes while presenting.

## Seed data
`seed-data/scenarios.json` contains the full CSV text for 18 synthetic inputs. `seed-data/expected-results.json` contains the independent expected results. `seed-data/import-examples/` contains seven ready-to-select CSV files for demonstrating uploads. Nothing in this folder is a real customer export.

## Honest completion
The kit's author checked the seed structure and specified arithmetic separately. That is not evidence that your future TypeScript app works. Claude must implement and run the project tests, then record its own outcomes in `VERIFICATION.md`.
