# OpsCheck

OpsCheck is a synthetic warehouse-plan validation prototype that checks a submitted operational plan against deterministic rules, explains problems with Claude, and traces every important result back to its source data.

A recruiter or engineer can load one of the built-in demo scenarios, click **Run checks**, and see exactly which orders miss their departures, which workers are double-booked, and why — down to the CSV row and column.

---

## In one example

**Scenario S01 — Earlier departure**

```
Picking ends:     minute 45  (09:45)
Assumed packing: +30 min
Modeled ready:    minute 75  (09:15)
Departure D-1:    minute 65  (09:05)
Miss:             10 minutes late
```

The deterministic engine owns that calculation and issues the verdict.
Claude turns the finding into readable prose.
The LLM does not decide whether the plan passes or fails.

---

## Why this exists

Operational plans combine orders, workers, timing assumptions, and departure schedules. A plan can look reasonable in a spreadsheet while containing conflicts, missed deadlines, or missing information that would silently corrupt a calculation.

OpsCheck demonstrates how to:

- check those rules deterministically, with an explicit formula for every result,
- make failures visible and traceable to their source data,
- explain findings to a non-technical audience using an LLM,
- and keep the LLM outside the source-of-truth boundary entirely.

---

## Demo scenarios

All scenarios use synthetic data. There are 18 in total; three are shown here.

### S00 — Baseline

Eight synthetic orders, two workers, two departures. The plan satisfies every implemented constraint. All checks pass.

### S01 — Earlier departure

Departure D-1 moves from minute 120 to minute 65. Order O-104 finishes picking at minute 45, requires 30 minutes of assumed packing, and is modeled ready at minute 75 — ten minutes after departure. The engine catches the miss and reports it. The departure and packing duration cells are linked so you can inspect them.

### S02 — Missing packing duration

Order O-104 has a blank packing duration cell. A blank cell is never read as zero. OpsCheck marks the dataset incomplete and refuses to run any plan rules, because the ready time cannot be computed without a packing duration.

Other scenarios cover: worker overlap, worker unavailability, insufficient picking time, unassigned orders, duplicate assignments, unknown references, negative durations, reversed intervals, missing headers, and a second explicit column-mapping profile (Warehouse B).

---

## How it works

```
Synthetic CSV input (4 tables)
           |
    Parsing + column mapping
    (Standard or Warehouse B profile)
           |
    Data-readiness validation
    (missing, invalid, unknown references, duplicates)
           |
         READY?
        /       \
      NO         YES
      |           |
  Report        Plan rules R1–R5
  diagnostics   (assignment count, pick duration,
                 worker availability, worker overlap,
                 ready-by-departure)
           |
    Plan result + per-check evidence
           |
    Bounded evidence catalog
    (synthetic facts only — no free text from the engine)
           |
    Claude API call
    (structured JSON response)
           |
    Deterministic publication gates (7 gates)
    (schema, snapshot match, catalog membership,
     finding completeness, provenance, verdict consistency,
     scope and review)
           |
    Verified report published  OR  Report withheld
```

**Parsing + mapping:** Papa Parse reads each CSV; a named profile maps column names to canonical fields. Two profiles are implemented — `standard` and `warehouse_b`.

**Data-readiness validation:** Missing values, invalid types, reversed intervals, duplicate primary IDs, and unknown cross-table references all produce diagnostics with source references. INVALID problems take precedence over MISSING; the plan rules do not run unless the dataset status is READY.

**Plan rules R1–R5:** Each check produces a formula, individual operands, and links to the exact source cells used in the calculation. A blocked check (e.g. departure readiness when the assignment count is wrong) is explicitly marked BLOCKED, not silently skipped or counted as passed.

**Evidence catalog:** Before calling Claude, the engine assembles a bounded set of synthetic fact templates. The model selects from this catalog; it cannot introduce unsourced claims.

**Publication gates:** After Claude responds, seven deterministic gates verify the payload — JSON schema, snapshot fingerprint, catalog membership, required-finding completeness, source provenance, verdict consistency, and review-step applicability. A failure at any gate withholds the report and shows which gate failed.

---

## Deterministic vs non-deterministic

**Deterministic (engine-owned):**
- CSV parsing and column mapping
- Data-readiness checks (missing, invalid, unknown reference, duplicate ID)
- Plan rules R1–R5 and their calculations
- Plan verdict (PASS / VIOLATIONS / NOT_EVALUATED)
- Per-check formulas and source evidence
- Publication gate decisions

**Non-deterministic (LLM):**
- Claude's natural-language explanation of the findings

The same input data will produce the same engine result every time. Claude may phrase an explanation differently between runs.

**The LLM does not decide whether the plan passes or fails.**

---

## AI report and validation

When the API key is configured, OpsCheck:

1. Builds a bounded evidence catalog from the engine results.
2. Sends the catalog and a structured prompt to Claude.
3. Receives a JSON selection (not free text).
4. Runs seven deterministic publication gates against the response.
5. Either publishes the verified report or withholds it with an explanation of which gate failed.

The UI shows:

| Metric | What it means |
|--------|---------------|
| Engine-fact traceability | Each factual statement in the report links back to an engine result and source cell |
| Required findings | The findings the engine demanded the report include |
| Evidence checks passed | How many of the 7 publication gates passed |
| Explanation references | Factual statements the model selected from the catalog |

**"Verified against this run"** means the report passed all seven publication gates for this specific input snapshot. It does not mean real-world correctness is guaranteed, the plan is optimal, all warehouse constraints are modeled, or the LLM cannot make a mistake.

Narrative factual confidence is intentionally shown as **"Not calibrated"** rather than inventing a 95% or 99% confidence score.

---

## What OpsCheck checks

Five plan rules run when the dataset is READY:

| Rule | What it checks |
|------|----------------|
| **R1 — Assignment count** | Every declared order has exactly one picking assignment |
| **R2 — Pick duration** | The allocated time window covers the order's required picking duration |
| **R3 — Worker availability** | Each assignment falls within the assigned worker's availability window |
| **R4 — Worker overlap** | No worker is assigned two overlapping tasks (half-open intervals; touching is allowed) |
| **R5 — Ready by departure** | Picking end + assumed packing ≤ departure time (blocked if R1 fails for that order) |

Data-readiness checks run first and cover: missing files, missing headers, missing values, invalid IDs, invalid numbers, reversed intervals, duplicate primary IDs, and unknown cross-table references.

---

## Traceability

Every engine result carries source references to the CSV row and column it came from. For the S01 finding on O-104:

```
O-104 is 10 minutes late
  └─ Ready time = 75
       ├─ Pick end = 45  ← plan.csv, record 4, column end_minute
       └─ Pack duration = 30  ← orders.csv, record 4, column pack_minutes
  └─ Departure = 65  ← departures.csv, record 1, column departure_minute
```

You can click any operand in the Evidence panel to jump to the raw source record. If someone challenges a result, you can show exactly where each value came from.

---

## Interface

- **Scenario controls** — load one of the 18 built-in synthetic scenarios or provide your own CSVs.
- **Plan status** — PASS / VIOLATIONS / NOT_EVALUATED shown prominently after running checks.
- **Order timeline** — visual schedule of picking assignments and departure deadlines.
- **Findings list** — each failed or blocked check with its formula and status.
- **Evidence panel** — operands and source references for a selected check.
- **AI report** — Claude's narrative explanation, gate results, and verification status.
- **Raw source viewer** — the actual CSV records behind any cited value.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS 4 |
| CSV parsing | Papa Parse 5 |
| Schema validation | Zod 4 |
| AI provider | Anthropic TypeScript SDK (`@anthropic-ai/sdk`) |
| Unit / integration tests | Vitest 5 |
| End-to-end tests | Playwright |

---

## Running locally

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For a production build:

```bash
npm run build
npm start
```

---

## Optional Anthropic setup

Copy `.env.example` to `.env.local` and fill in:

```
OPSCHECK_AI_ENABLED=true
ANTHROPIC_API_KEY=your-key-here
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
```

The core deterministic checks, build, and all standard tests work without an API key.

Default automated tests must not make paid provider calls. The live AI smoke test is separate:

```bash
npm run smoke:ai
```

---

## Testing

Run inside `web/`:

| Command | What it runs |
|---------|-------------|
| `npm test` | Vitest — domain logic, fixture oracles, briefing gates, all without an API key |
| `npm run test:e2e` | Playwright browser tests (build first with `npm run build`) |
| `npm run smoke:ai` | Live API smoke test — makes a real Anthropic call; requires `ANTHROPIC_API_KEY` |
| `npm run typecheck` | TypeScript type check |
| `npm run lint` | ESLint |

The fixture oracle tests load all 18 synthetic scenarios and compare engine results against frozen expected outcomes.

---

## Scope and limitations

OpsCheck:

- validates a submitted plan — it does not generate or optimize one,
- models only the five implemented constraints (R1–R5),
- uses entirely synthetic data — it is not connected to a real warehouse,
- is an independent prototype — not a production dispatch or safety system,
- models packing as a fixed assumed delay per order with no concurrency limit (packing capacity is unlimited in the current model),
- evaluates one-day synthetic schedules using integer minute offsets from 08:00 — no dates, timezones, or overnight shifts.

A passing report means the implemented checks passed for the submitted inputs. It does not imply the plan is optimal, complete, or safe for real-world use.

---

## Why this project is interesting

The core question OpsCheck explores is: **where should the trust boundary sit between deterministic software and an LLM?**

The engine owns every operational fact, formula, and verdict. The LLM is used for communication — turning structured results into readable prose — not for authority over outcomes. The publication gates enforce this boundary: if the model's response cannot be traced back to the engine's evidence, the report is withheld rather than published with a caveat.

Traceability is the other interesting piece. Every number in the UI can be followed to its source CSV cell, which means a challenged result can be inspected rather than dismissed or blindly trusted.

---

## Repository structure

```
.
├── docs/                        # Specs: data contracts, validation rules, interface, test plan
├── seed-data/                   # Synthetic CSV examples and expected-result oracles
└── web/
    ├── src/
    │   ├── app/                 # Next.js App Router (page, layout, API route)
    │   ├── app/api/briefing/    # Server-side Anthropic call and publication gates
    │   ├── components/          # React UI components
    │   ├── domain/              # Pure-TypeScript validation engine (no browser globals)
    │   ├── briefing/            # Evidence catalog, templates, gate logic
    │   ├── features/            # React hooks, view-model adapters
    │   └── fixtures/            # 18 frozen regression scenarios + oracle results
    └── tests/                   # Vitest unit and oracle tests
```

---

## Status

Interview demo — functional prototype with synthetic data, deterministic engine, and verified AI narrative layer. Not production software.
