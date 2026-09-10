# Verification — actual evidence only

## Scope of this record
This page records two passes on 2026-09-10:

1. the **fast-track demo** pass, and
2. the later **visual upgrade** pass (order schedule and linked evidence inspector).

Neither closes a milestone, and this is not evidence that M0–M4 are complete. Checks not attempted
are recorded as NOT RUN, and deliberately deferred work is recorded as DEFERRED. No passing count on
this page includes a check that did not run.

**Read `Current status` below for what holds now.** Sections marked *first pass* are retained as
accurate historical evidence of what was run at the time; they describe superseded suites and, in
one case, UI that no longer exists. Do not read them as current.

## Presentation redesign, 2026-09-10
A bounded design retrofit against `opscheck-design-system/`. No engine, contract, fixture, AI
protocol, model, or provider behaviour changed. **No live Anthropic call was made in this pass.**

### Measured type roles, before and after
Computed styles at 1366x768, default 16px root, S01 after Run checks.

| Role | Before | After | Target |
|---|---:|---:|---:|
| Product title (h1) | 18 / 26.1 | **32 / 40** | 32 / 40 |
| Tagline | 13 / 18.9 | **16 / 24** | 16 / 24 |
| Main outcome | not present | **24 / 32** | 24 / 32 |
| Panel heading | 13 / 18.9 | **20 / 28** | 20 / 28 |
| Evidence conclusion | 15 / 20.6 | **24 / 32** | 24 / 32 |
| AI narrative prose | 12.5 / 18.1 | **18 / 28** | 18 / 28 |
| Body, tabs, statuses | 12.5-13 | **16 / 24** | >=16 |
| Submitted-plan cell | 12.5 / 18.1 | **16 / 24** | 16 |
| Order id | 14 / 20.3 | **16 / 24** | 16 |
| Axis tick | 10 / 14.5 | **14 / 20** | >=14 |
| Source metadata | 11.5 / 16.7 | **14 / 20** | >=14 |

Nothing visible renders below 14px. The root stays at 16px; no page transform or zoom was used.

### Measured target sizes
| Control | Before | After | Requirement |
|---|---:|---:|---:|
| Run checks | 31px high | **48px** | >=48 |
| Reset | 32px | **44px** | >=44 |
| Scenario control | 33px | **44px** | >=44 |
| AI switch | n/a | **44px** | >=44 |
| Inspector tab | n/a | **44px** | >=44 |
| Schedule row | 41px | **60px** | >=56 |
| Disclosure header | n/a | **60px** | >=44 |
| Source chip | 26px | **44px** | >=44 |

### Commands actually run
```text
npm run typecheck                              -> PASSED
npm run lint                                   -> PASSED (0 errors, 0 warnings)
npm test                                       -> PASSED (6 files, 128 tests)
npm run build                                  -> PASSED
npx playwright test                            -> PASSED (31 tests)
node opscheck-design-system/check-contrast.mjs -> PASSED (34/34 token pairs)
seed sha256                                    -> IDENTICAL for both fixtures
```

**T02 scope:** the contrast script validates the declared solid token pairs only. It is not a
rendered-page audit, and the app's live computed pairs were not exhaustively re-measured in every
state. **T03 (automated axe scan) was NOT RUN** - `@axe-core/playwright` was not installed, so no
automated accessibility scan was performed in this pass. **T05 text-enlargement to 200% and the
user text-spacing override stylesheet were NOT RUN.** Keyboard traversal (T04) was not exercised
end to end. These remain open.

### Layout changes
Header -> toolbar -> current plan result -> schedule/inspector workspace -> secondary disclosures.
The plan status moved out of the toolbar into a dedicated "Current plan result" region using plain
language ("1 modeled violation", "Cannot evaluate this plan.") instead of uppercase status pills.
The workspace is a 1.25:1 grid with a 432px minimum inspector, stacking below 1280px. Submitted
plan, raw sources and assumptions became native `<details>` disclosures, removing a nested card
level. Panels use 24px padding, one 12px radius and one subtle shadow.

### Defects found and fixed during this pass
1. **Axis tick anchors collapsed at narrow width.** The old narrow-screen rule hid the tick
   *anchor* rather than its label, so that time position measured at x=0 and the geometry check
   failed by 168px. The rule was removed: tick density is lower and the timeline scrolls locally,
   so every label stays at 14px. The alignment fix and all 8 geometry checks still pass.
2. **Source chips were 26px high**, below the 44px standalone-control requirement.
3. **320px page overflow of 8px** from a non-wrapping calculation row.
4. **Axis labels collided** at the new 14px size; tick density was reduced from <=8 to <=5
   intervals.
5. Synthetic-data badge was amber, reading as an error; it is now a neutral provenance label.

### Test selectors updated, not weakened
Ten browser assertions targeted status text that legitimately moved from the toolbar to the new
result region and changed to plain language. Each was retargeted to the same behavioural meaning
(for example `Submitted plan has modeled violations` -> `1 modeled violation` inside
`Current plan result`). No assertion was deleted or loosened, and no fixture or expected engine
output was touched.

### Screenshots
Before: `web/artifacts/before/` (1366, 1440, 1024, 390, 320 - S01 after Run checks).
After: `web/artifacts/after/` same viewports plus `1440-s00-passed.png`, `1440-s02-blocked.png`.
`1366-s01-ai-report-MOCKED.png` and `1440-s01-ai-report-MOCKED.png` use a **mocked provider**; they
are not new live-model evidence. All other after-shots ran against a server started with
`OPSCHECK_AI_ENABLED=false` and an empty key, with a request guard that fails on any provider POST.

### Honest status
Selected accessibility and design checks passed: measured type roles, measured target sizes,
declared token-pair contrast, reflow at 320/390/1024, and the geometry regression suite. This is
**not** a WCAG conformance assessment. No automated accessibility scan, no 200% text-enlargement
test, no text-spacing override test, and no keyboard-only traversal were run.

## Visible Claude report (V2 envelope), 2026-09-10
Run checks now optionally produces a model-authored explanation in a chat-style report, alongside
the unchanged deterministic result. The V1 evidence contract and its gates are untouched and still
authoritative.

### Two scopes, kept separate
- **Engine evidence manifest:** application-owned templates rendered from engine results, checked by
  the seven V1 gates. Carries the "Evidence checks passed" label.
- **Claude narrative:** the provider's actual words. Four structural/reference checks confirm the
  envelope is bounded, cites only displayed evidence, explains exactly the engine's required finding
  set, and refers only to selected review steps. These are **not** semantic proof. The UI always
  shows: "AI-written explanation. Evidence references checked; wording requires review." Narrative
  factual confidence is displayed as **"Not calibrated"**, never a percentage.

### Offline results

```text
npm run typecheck   -> PASSED
npm run lint        -> PASSED
npm test            -> PASSED (6 files, 128 tests)
npm run build       -> PASSED, with no API key required
npx playwright test -> PASSED (31 tests: 19 prior + 12 AI report)
seed sha256         -> IDENTICAL for scenarios.json and expected-results.json
```

New offline coverage: `tests/briefing-narrative.test.ts` (22 tests) proves the provider's exact words
survive into the report rather than being swapped for a template; that flawless prose cannot rescue a
failed V1 selection; and that unknown references, omitted/extra/duplicate finding explanations,
unselected review steps, empty or oversized text, and model-owned `confidence`/`approved`/`url`
fields are each rejected. One test deliberately supplies a legitimately cited but **semantically
dubious** paraphrase and asserts it still passes the structural checks while carrying no verification
or confidence claim — the checks are structural by design.

`tests/briefing-gates.test.ts` retains all V1 cases. One pipeline test was updated, not weakened: a
bare V1 selection with no narrative is now correctly **withheld** at the narrative stage while the
deterministic evidence still publishes.

Browser checks (`e2e/ai-report.spec.ts`, **mocked provider**) cover: AI disabled sends zero requests;
one Run checks click sends exactly one, and mount/rerender/scenario-change/tab-switch send none;
deterministic timeline and status update before the response arrives; real prose, scoped labels, and
a citation that opens the actual source cell; missing data reported with no readiness estimate or
approval; a withheld narrative naming its failed check; an API failure leaving the app usable with
one explicit retry; a late response unable to steal the tab after the user chooses Evidence;
invalidation on scenario change, on A->B->A, and on re-running the same scenario; and narrow layout.

### Live V2 acceptance: RUN and PASSED
Three calls total, one per scenario, driven through the actual UI (one Run checks click each), no
retries. Browser-side request counter confirmed exactly **3** provider-bound POSTs.

| Scenario | Outcome | Model | Stop | Latency | Tokens in/out | V1 gates | Refs | Prose |
|---|---|---|---|---|---|---|---|---|
| S00 | verified | claude-haiku-4-5-20251001 | end_turn | 13.1s | 1494 / 249 | 7/7 | 3/3 | 267 chars |
| S01 | verified | claude-haiku-4-5-20251001 | end_turn | 10.4s | 1564 / 375 | 5/5 refs, 7/7 gates | 5/5 | 247 chars |
| S02 | verified | claude-haiku-4-5-20251001 | end_turn | 11.3s | 1576 / 399 | 7/7 | 5/5 | 405 chars |

Metrics rendered with correct scope in every case: S00 showed "Required findings displayed: N/A —
none required" rather than 100% from 0/0; S01 and S02 showed 1/1. All three showed "Narrative factual
confidence: Not calibrated".

The S02 narrative correctly distinguished missing data from a failed plan, opening with "OpsCheck
evaluation stopped before plan assessment because required input data is missing."

Live screenshot: `web/artifacts/40-s01-live-ai-report.png` — **live provider**, not mocked.

### Disclosure: unintended live calls during one test run
Before the Playwright web server was pinned to an AI-disabled environment, one browser suite ran
against a server that loaded `.env.local`, where the AI switch defaults on. The non-mocked specs
click Run checks, so that run made **an estimated 4-6 unintended billable calls** (bounded by the
route's 3-per-60s cap and single-flight lock over roughly 96 seconds; the remainder returned 429).
This was a test-configuration oversight, not intended acceptance testing, and it is separate from
the three authorized acceptance calls recorded above.

Fixed in `playwright.config.ts`: the web server under test now runs with `OPSCHECK_AI_ENABLED=false`
and an empty key, so **no default test run can reach Anthropic**. Checks that need a configured app
mock the config endpoint themselves.

### Limitations
Reference resolution is not entailment. A paragraph can cite the right ids, quote the right numbers,
and still misstate a relationship; nothing here detects that. Three successful live calls confirm the
path works, not that the model is reliable. The browser AI checks use a mocked provider, so the live
path has no automated regression coverage.

## Presentation-correctness fix, 2026-09-10 (timeline alignment)
Narrowly scoped fix to the schedule's time axis. No engine value, operational rule, frozen
expectation, or AI integration behaviour changed.

**Confirmed cause, measured in the rendered DOM before any edit:** the axis header and the order
rows used different plotting areas.

| Element | left | width |
|---|---|---|
| Axis header track (before) | 143.0 | 788.7 |
| Order row track (before) | 146.0 | 677.7 |

Two independent faults: the axis header's `flex-1` had **no status-column spacer**, making it 111px
wider (96px status + 8px gap + 4px right padding), and it lacked the row's `border-l-[3px]`, shifting
its origin 3px. A 10:00 departure marker therefore drew about 71px left of its own 10:00 tick, and
the 11:00 label extended past the tracks into the status column.

**Fix:** the axis header and every row now render through one shared `ROW_SHELL` constant with the
same border, label column, gap, plotting area, and status column, so they cannot drift. Time
positions render as zero-width `data-time-anchor` elements at the exact percentage; visible labels
and bars are shifted relative to their anchor for legibility, which never moves the anchor. Measured
after the fix at 1440, 1366 and 390: **maximum axis-to-row delta 0.0px on both origin and width**,
0px page overflow.

Also fixed: narrow picking bars showed a clipped `p...`; the decorative label is now dropped below a
documented width threshold, with the legend and the row's accessible name (which states the actual
times) unchanged. Scenario subtitles now describe the input change rather than announcing the
expected outcome - `scenarios.json` is a frozen fixture and was **not** edited, so the presentation
copy lives in the component and the fixture stays byte-identical to `seed-data/`.

New browser regression: `e2e/timeline-geometry.spec.ts`, 8 checks measuring real bounding boxes with
a documented 1.5px tolerance. It fits `x = a + b * minute` from the axis anchors and asserts every
row anchor against that mapping, so it validates the mapping independently of the application's own
percentage arithmetic. Covers shared origin/width per row, label and status columns outside the plot
area, departure markers at authoritative positions, tick-versus-marker equality at shared minutes,
all bars inside the plot area, desktop and narrow layouts, the dropped narrow label, and the
scenario copy.

Commands re-run against a freshly built app (the stale detached server was stopped first):

```text
npm run typecheck   -> PASSED
npm run lint        -> PASSED
npm test            -> PASSED (5 files, 106 tests)
npm run build       -> PASSED
npx playwright test -> PASSED (27 tests: 19 existing + 8 new geometry)
seed sha256         -> IDENTICAL for scenarios.json and expected-results.json
```

One existing briefing check was made deterministic rather than left broken: it asserted the
unconfigured AI panel by reading the machine's real environment, which now has a key. It mocks the
unconfigured config response instead, so it asserts the same behaviour on any machine.

Fresh screenshots: `30-baseline-passed-1440.png`, `31-s01-aligned-1440.png`,
`32-s01-laptop-1366.png`, `33-s01-narrow-390.png`.

## AI briefing pass, 2026-09-10 (bounded extension)
Adds an optional, server-only Anthropic integration. The deterministic engine remains authoritative:
Claude selects catalog ids and an ordering, and the application owns every publishable sentence,
number, verdict, assumption, and review action.

Commands actually run after implementation:

```text
npm run typecheck   -> PASSED (exit 0)
npm run lint        -> PASSED (exit 0)
npm test            -> PASSED (5 files, 106 tests)
npm run build       -> PASSED, with NO API key present
npx playwright test -> PASSED (18 tests, chromium, production build)
npm run smoke:ai    -> PASSED, LIVE (3 real calls, no retries) - see below
```

**Engine baseline widened:** `tests/fixture-oracles.test.ts` now asserts **all 18** frozen fixtures
against the supplied expectations through the documented projection, not just S00/S01/S02. All 18
pass. No fixture or expected outcome was edited. Passing them is evidence about those cases only and
is not a model-confidence figure.

**Adversarial publication-gate coverage** (`tests/briefing-gates.test.ts`), all offline, no provider
call: accepted briefings for S00/S01/S02 built from real engine results; correct units and preserved
assumption labels; source chips resolving into the real snapshot; and rejection of an unknown fact
id, a wrong-section id, an omitted mandatory finding, a duplicated finding, a pass-themed lead on a
failed plan and on a blocked-data plan, added free text, an invented number, an attempted verdict
override, a self-scored `confidence` property, an unsupported review-step id, a real review step
whose applicability predicate is false, non-resolving evidence, a mismatched raw value, a stale
fingerprint, refusal, truncation, malformed JSON, and an unsupported stop reason. Metrics tests
confirm an empty manifest cannot score 100%, a missing required finding cannot be offset, and a
failed gate is never publishable.

**Route boundary** (`tests/briefing-route.test.ts`): non-loopback host, cross-origin POST, wrong
content type, oversized body, invalid JSON, unsupported scenario id, and extra request keys
(including a client-supplied model, verdict, or evidence catalog) are all rejected before anything
billable. `GET` returns only `{enabled, configured, model}` and never a key.

**Browser checks** (`e2e/briefing.spec.ts`) are **mocked-provider checks**: the route response is
stubbed, so they verify the client lifecycle, not the gate logic. Real gate logic is exercised by the
offline suite above, which feeds untrusted model-shaped payloads through the actual validator.
Covered: honest unavailable state when unconfigured; no auto-generation on load, rerender, scenario
change, or Run checks; generation gated behind a completed run and one deliberate click; a verified
report rendering with working source navigation; a withheld report showing the failed gate with no
green badge; an API failure never becoming a fabricated report; invalidation on scenario change,
including the S01 -> S00 -> S01 case where the fingerprint repeats; invalidation on a new engine run;
and the original timeline/evidence flow still working.

**Live API: RUN on 2026-09-10.** The owner supplied a key in `web/.env.local` (never read, printed,
or committed). `npm run smoke:ai` made exactly **three** deliberate calls, one per authorized
scenario, with `maxRetries: 0` and no automatic retries. Recorded results, verbatim from the run:

| Scenario | Outcome | Model | Stop reason | Tokens in/out | Gates | Traceability | Required findings |
|---|---|---|---|---|---|---|---|
| S00 | verified | claude-haiku-4-5-20251001 | end_turn | 802 / 119 | 7/7 PASSED | 2/2 | 0/0 (none required) |
| S01 | verified | claude-haiku-4-5-20251001 | end_turn | 872 / 143 | 7/7 PASSED | 3/3 | 1/1 |
| S02 | verified | claude-haiku-4-5-20251001 | end_turn | 884 / 139 | 7/7 PASSED | 3/3 | 1/1 |

The real model returned selections that satisfied every gate, including leading S02 with its data
diagnostic rather than a run summary, and including the single required finding on S01 and S02.

**What this does and does not establish.** It confirms that the configured model is reachable on
this account, that the structured-output path returns a payload the strict schema accepts, and that
the full pipeline reaches a recorded decision end to end. Three successful calls are **not**
statistical calibration, not evidence of model reliability, and not evidence that a future response
would pass. The gates exist precisely because a well-formed response can still be wrong; their
adversarial coverage remains the offline suite in `tests/briefing-gates.test.ts`.

No fourth call was made: the browser demo click is left to the owner.

Screenshots (mocked provider, labelled as such): `20-briefing-verified-1440.png`,
`21-briefing-withheld-1440.png`, `22-briefing-laptop-1366.png`, `23-briefing-narrow-390.png`.
Measured horizontal overflow 0px at 1440, 1366 and 390.

Defect found and fixed during this pass: catalog ids built from engine keys embedded `|` separators
and column names, which broke the strict id grammar and would have leaked internals into the provider
payload. Catalog ids are now short opaque handles, with the authoritative engine key retained in
`resultRef` so provenance is unaffected.

## Current status, as of the visual upgrade pass
The feature set is frozen. Last actually-run results:

| Check | Status | Evidence |
|---|---|---|
| TypeScript (`npm run typecheck`) | PASSED | exit 0 |
| ESLint (`npm run lint`) | PASSED | exit 0 |
| Vitest (`npm test`) | PASSED | 128 tests, 6 files |
| Production build (`npm run build`) | PASSED | compiled; `/` and `/_not-found` static |
| Playwright Chromium (`npx playwright test`) | PASSED | 31 tests, production build |
| Seed copies byte-identical to `seed-data/` | PASSED | sha256 pairs below |
| Full 18-case regression parity | PASSED | all 18 frozen fixtures asserted in `fixture-oracles.test.ts` |
| Live Anthropic API call (V1 smoke) | PASSED | 3 calls via `npm run smoke:ai`; all verified, 7/7 gates each |
| Live Anthropic API call (V2 UI) | PASSED | 3 calls through the UI; all verified with real prose |
| **Keyboard-only traversal, end to end** | **NOT RUN** | rows/controls are real buttons and focus styling exists, but no end-to-end keyboard run was performed |
| **Assistive-technology / screen-reader pass** | **NOT RUN** | ARIA roles and labels are present; no assistive technology was used |

The three NOT RUN rows above have not been performed in either pass. Nothing in this document should
be read as evidence for them.

## Status vocabulary
- PASSED: ran and met its specified assertions.
- FAILED: ran and found a defect.
- NOT RUN: not attempted.
- BLOCKED: could not run because a named dependency or environment condition prevented it.
- DEFERRED: deliberately removed from the current presentation checkpoint with the owner's agreement.

Never combine BLOCKED/NOT RUN with passing counts.

## Environment record
| Item | Observed value |
|---|---|
| OS / shell | Windows 11 Home 10.0.26200; PowerShell + Git Bash |
| Node | v22.16.0 |
| npm | 11.6.2 |
| Next.js / React | 16.3.4 / 19.2.8 |
| TypeScript / Vitest / Playwright | 5.9.3 / 5.0.0 / 1.63.0 |
| Lockfile | `web/package-lock.json` present |
| Browser used | Playwright Chromium 1.63.0, headless, against the production build |

## Visual upgrade pass, 2026-09-10 (later session)
Commands re-run after adding the order timeline and linked evidence inspector:

```text
npm run typecheck   -> PASSED (exit 0)
npm run lint        -> PASSED (exit 0)
npm test            -> PASSED (3 files, 37 tests)
npm run build       -> PASSED
npx playwright test -> PASSED (10 tests, chromium, production build)
```

Seed copies re-checked and still byte-identical to `seed-data/` (sha256 unchanged).

New focused unit coverage, `web/tests/timeline-adapter.test.ts` (14 tests): before evaluation the
adapter plots only the submitted picking interval and leaves packing, readiness, departure,
lateness and status empty; S01 runs packing from the submitted picking end to the engine's ready
minute, marks the 65->75 overrun, reports `lateMinutes` 10, and marks exactly one late order; S02
reports blocked with no modeled band anywhere; and the geometry stays finite for an empty model, a
zero-width axis, and out-of-range positions.

New browser checks: the schedule draws nothing derived before a run; selecting an order in the
schedule drives the inspector; selecting a finding highlights the matching schedule row; the
compact source chip opens its own cell; the departure marker actually renders with non-zero size;
changing scenario removes every derived overlay.

Defects found and fixed in this pass:
1. Departure markers rendered at **zero width** - a `w-[2px]` flex child inside a `w-0` flex parent
   shrinks to nothing - so a required marker was invisible. Now positioned directly, and an e2e
   check asserts a non-zero bounding box.
2. Clicking a failing order selected an unrelated **passed** check, because row finding ids were in
   engine order. `buildPlanRows` now orders them FAIL, then BLOCKED, then PASS.
3. The schedule legend sat in the panel's `shrink-0` actions slot and widened the page by 35px at
   390px. Moved into the panel body.
4. Axis and readiness labels centred on the 0%/100% edge hung outside the track; end labels are now
   anchored instead of centred.
5. Tick labels collided at 390px; alternate labels are hidden below 640px, gridlines unchanged.

Screenshots re-captured at 2x from the running production build: `10-notrun-1440.png`,
`11-baseline-passed-1440.png`, `12-s01-o104-selected-1440.png`, `13-s01-source-cell-1440.png`,
`14-blocked-1440.png`, `15-s01-laptop-1366.png`, `16-s01-narrow-390.png`. Measured horizontal
overflow 0px at 1440, 1366 and 390. Earlier screenshots in this directory were captured
mid-transition and showed the previously active scenario button still tinted; the current set adds
a settle delay and parks the pointer, so it reflects the real rendered state.

Not verified in this pass: full 18-case regression parity (still only S00/S01/S02), keyboard-only
traversal end to end, and any assistive-technology run.

## Commands actually run, first pass (superseded counts)
These were the results **before** the visual upgrade. The counts below (23 unit tests, 8 browser
checks) are historical; the current counts are 37 and 10, recorded above. The seed-copy hashes are
unchanged and still current.

Working directory `C:\Dev\haladir\web` unless stated otherwise.

```text
npm run typecheck      → PASSED (exit 0, no diagnostics)
npm run lint           → PASSED (exit 0, no errors, no warnings)
npm test               → PASSED (2 files, 23 tests)
npm run build          → PASSED (compiled; / and /_not-found prerendered static)
npx playwright test    → PASSED (8 tests, chromium, against `npm run start`)
```

Seed-copy equality, run from the repository root with `sha256sum`:

```text
seed-data/scenarios.json        == web/src/fixtures/scenarios.json
  388ebf9c0ce4a26ad1186740a8ad1b4d61325182f2d44ca472ca90bdb7d6aada
seed-data/expected-results.json == web/src/fixtures/expected-results.json
  4a029d5c7e09151c2cc7fa9bc71799ee5e4c115cd3e19369af628ff07ec0779e
```

## Unit and integration coverage actually asserted (first pass)
The assertions below all still exist and still pass; the visual upgrade added
`web/tests/timeline-adapter.test.ts` on top of them.
`web/tests/fixture-oracles.test.ts`
- S00, S01, S02 actual `evaluateBundle` output compared with the supplied
  `expected-results.json` expectations through `projectReport`, using `toStrictEqual`. PASSED.
- S01 produces exactly one FAIL on `PLAN_READY_BY_DEPARTURE` for `O-104`, with metrics
  `{pickEndMinute:45, packMinutes:30, readyMinute:75, departureMinute:65, slackMinutes:-10,
  lateMinutes:10}`. PASSED.
- S01 operands point at `plan.csv` record 5 `end_minute`, `orders.csv` record 5 `pack_minutes`,
  and `departures.csv` record 2 `departure_minute`. PASSED.
- S01 operand units: packing is `DURATION_MINUTES`, picking end and departure are
  `MINUTE_OFFSET`, identifiers carry no unit. PASSED.
- S02 reports `dataStatus=INCOMPLETE`, `planStatus=NOT_EVALUATED`, zero checks, all five rule
  families blocked, one `DATA_MISSING_VALUE` at `orders.csv` record 5 `pack_minutes` with
  `rawValue: ''`, and all four raw tables still readable. PASSED.

`web/tests/core-semantics.test.ts`
- Blank versus legitimate zero, including that a real `0` packing duration evaluates while a blank
  one blocks, and that a zero picking duration is rejected. PASSED.
- Half-open intervals: `[0,20)` and `[20,35)` touch and pass; `[0,20)` and `[19,35)` overlap and
  fail; a nested interval an adjacent-pairs-only check would miss is caught. PASSED.
- Scenario/reset isolation: evaluating one case cannot mutate the baseline fixture, every
  `loadScenario` call returns an independent deep clone, a deep-frozen bundle is not mutated, and
  the same input evaluated twice is structurally identical. PASSED.

**These 23 tests were the suite before the visual upgrade, which added 14 timeline-adapter tests
for a current total of 37. They are not 18-case regression parity.** Only S00, S01, and S02 are compared
with the frozen expectations. The other fifteen frozen cases are present in
`web/src/fixtures/scenarios.json` but are NOT asserted. See the hardening backlog.

## Browser checks, first pass (superseded)
These 8 checks were the suite **before** the visual upgrade; the current suite is the 10 checks
recorded above. The row mentioning a "headline" element describes UI that the upgrade replaced with
the schedule and inspector. Kept as a record of what was actually run at the time:

`npx playwright test` against the production build on `http://127.0.0.1:3100`, Chromium, viewport
1440×900 unless the test resizes it. 8 passed:

| Check | Result |
|---|---|
| Inputs preloaded; nothing claims evaluation before a run; all four raw tabs present | PASSED |
| S00 reports a pass only after Run checks, worded as implemented checks, not optimality | PASSED |
| S01 headline shows `45 + 30 = 75; 75 > 65`; evidence shows 09:15/09:05/−10 min; opening the source cell highlights `45` at plan record 5 | PASSED |
| S02 blocks evaluation, renders no Violation/Passed tag in the plan table, shows `[empty]` raw value, and keeps all four raw tables inspectable | PASSED |
| Changing scenario drops the previous green result and shows the changed-input state | PASSED |
| Reset returns to baseline, clears the highlight, disables Reset, and re-runs correctly | PASSED |
| Scenario controls, Run checks, both status summaries, and the headline finding all fit within 1366×768 | PASSED |
| 390×844 stacks with no horizontal page overflow | PASSED |

## Screenshots, first pass (superseded)
These show the pre-upgrade UI and are kept as a record. **The current screenshots are the `10-`
through `16-` set listed in the visual upgrade section above.** Two images in this first set were
also captured mid-transition and show the previously active scenario button still tinted.

Real Chromium screenshots of the running production build, in `web/artifacts/`:
`01-baseline-notrun-1440.png`, `02-baseline-passed-1440.png`, `03-s01-violation-1440.png`,
`04-s01-source-cell-1440.png`, `05-s02-blocked-1440.png`, `06-s01-laptop-1366.png`,
`07-s01-narrow-390.png`. Measured horizontal overflow was 0px at every viewport captured.

## Defects found and fixed, first pass
1. `src/app/page.tsx` was still the create-next-app starter template; every component behind it
   existed but nothing rendered them. Fixed by adding `Workspace.tsx` and `PlanTable.tsx` and
   pointing the route at them.
2. Evidence cards rendered any numeric operand as a clock time, so a 30-minute packing **duration**
   displayed as "(08:30)". Fixed by adding an explicit `OperandUnit` to the `Operand` contract, set
   at each engine site, with the UI showing a clock only for `MINUTE_OFFSET`. A test now locks this.
   The frozen-oracle projection excludes operands, so the expectations were untouched and still match.
3. `Panel` rendered a `<section>` with no accessible name, so panels were not exposed as landmarks.
   Fixed with `aria-label`.
4. Switching scenarios discarded the previous report outright, so the documented
   "Inputs changed. Run checks again." state could never appear. The superseded report is now
   retained solely as a flag; its revision no longer matches, so none of its numbers can reach the
   screen.

## Final matrix (current)
| Check | Status | Actual evidence |
|---|---|---|
| Seed copies identical to originals | PASSED | sha256 pairs above |
| TypeScript | PASSED | `npm run typecheck`, exit 0 |
| ESLint | PASSED | `npm run lint`, exit 0 |
| Vitest focused suite | PASSED | 37 tests, 3 files (23 engine/semantics + 14 timeline adapter) |
| S00/S01/S02 vs supplied expectations | PASSED | `fixture-oracles.test.ts` |
| Full 18-case regression parity | PASSED | all 18 asserted through the documented projection |
| Live Anthropic API call | PASSED | S00/S01/S02, one call each, no retries; recorded above |
| AI publication gates reject invented content | PASSED | `tests/briefing-gates.test.ts`, offline |
| Build and offline tests without an API key | PASSED | `npm run build` and `npm test` with no key |
| Production build | PASSED | `npm run build` |
| Playwright Chromium | PASSED | 10 tests |
| Evidence opens the correct record and cell | PASSED | e2e + `13-s01-source-cell-1440.png` |
| Missing data blocks all plan rule families | PASSED | unit + e2e + `14-blocked-1440.png` |
| Changed inputs cannot show a current pass | PASSED | e2e scenario/reset tests |
| Narrow-layout review | PASSED | 390×844, 0px overflow, after fixing a 35px legend overflow |
| Keyboard-only traversal review | NOT RUN | schedule rows and controls are real buttons and focus styling exists, but no end-to-end keyboard run was performed |
| Screen-reader pass | NOT RUN | ARIA roles and labels present; no assistive technology was used |
| Actual file replacement and profile mapping | DEFERRED | no upload UI this session |
| Stale results cannot be exported as current | DEFERRED | no export this session |
| External-network / confidentiality review | NOT RUN | app makes no network calls by construction; not audited |
| Owner demo rehearsal | NOT RUN | script written in HANDOFF.md, not rehearsed with the owner |

## Evidence handling
Screenshots and short command logs live in `web/artifacts/`. No private paths, secrets, or real
customer data appear in them. A screenshot of green UI is not a replacement for test assertions;
passing tests do not establish unmodeled operational correctness.
