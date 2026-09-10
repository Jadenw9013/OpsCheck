# OpsCheck — demo sheet

Feature set is frozen apart from the separately authorized optional AI briefing (below). This
page is for presenting the app, not for extending it.

OpsCheck checks a picking plan that is submitted to it, and traces every finding back to the exact
source cell it came from. All data is synthetic. It is an independent prototype with no live
integration.

## Launch

```bash
cd C:\Dev\haladir\web
npm run dev                                           # http://localhost:3000
```

Production build, which is what the browser checks exercise:

```bash
cd C:\Dev\haladir\web
npm run build
npm run start -- --hostname 127.0.0.1 --port 3100     # http://127.0.0.1:3100
```

**Status at handoff:** a production server was responding on **http://127.0.0.1:3100** (HTTP 200,
PID 31636 listening). It is a detached foreground process, not a service — it does **not** survive a
reboot, and it may already be gone. Always re-check before presenting:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3100/     # expect 200
```

If it does not answer, run the three production commands above again. Port 3100 must be free;
`npm run dev` on port 3000 is a fine substitute for a live demo.

## 60-second walkthrough

Open the app on **Baseline**. Nothing is evaluated yet: the schedule shows only submitted picking
times in neutral grey, and every derived column reads "Not evaluated".

1. **"OpsCheck checks a plan someone submits — it does not build one."**
   Press **Run checks**. Eight orders, each packed and ready before its departure.
   Status reads *Inputs ready* and *Passed implemented checks*, 43 passed / 0 failed.
2. **Earlier departure → Run checks.**
   One row turns red: **O-104**, `+10 min late`, its overrun hatched past the departure marker.
   Status flips to *Submitted plan has modeled violations*, 43 passed / 1 failed.
3. **Read the calculation** in the inspector on the right — it selected the finding automatically:
   Picking complete **08:45**, + Assumed packing **30 min**, = Modeled ready **09:15**,
   Departure **09:05**, **Misses departure by 10 min**. Formula: `45 + 30 = 75; 75 > 65`.
4. **Click the `rec 5` chip** beside *Assumed packing*.
   The raw source expands to `orders.csv`, logical record 5, column `pack_minutes`, with the cell
   outlined. **"Every number traces back to a real cell."**
5. **Missing packing duration → Run checks.**
   All bars go grey, every modeled band and verdict disappears, and the panel says
   **"Cannot evaluate this plan"** with raw value `[empty]`.
   **"A blank cell is missing input, not a zero — so no plan rule runs at all."**
6. **Reset** returns to the baseline with no result carried over.

Closing line: *"A passing report means the five implemented checks passed on this synthetic data —
not that the plan is optimal or feasible in a real warehouse."*

Reference screenshots: `web/artifacts/31-s01-aligned-1440.png` and
`web/artifacts/32-s01-laptop-1366.png` (step 3), and `web/artifacts/14-blocked-1440.png` (step 5).

## Optional AI briefing

Off by default. The core demo needs no key and no network.

To enable, create `web/.env.local` (git-ignored; never commit or paste it):

```dotenv
OPSCHECK_AI_ENABLED=true
ANTHROPIC_API_KEY=your-key-here
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
```

Placeholders live in `web/.env.example`. Restart the server after changing it. The **Include AI
report** switch then appears enabled beside Run checks, and one Run checks click authorizes exactly
one billable request. Nothing generates on load, on a scenario change, or on a tab switch.

Live smoke test, separate from every default command:

```bash
cd C:\Dev\haladir\web
npm run smoke:ai      # at most 3 calls (S00/S01/S02), no retries
```

Without a key it prints `LIVE API NOT RUN` and makes no call. It was run for real on 2026-09-10:
three calls, all verified with 7/7 gates passed (see `VERIFICATION.md`).

**What the demo line is:** *"Claude helps compose the briefing, but it cannot invent the numbers or
approve the plan. Every publishable statement comes from a bounded evidence catalog, every required
finding must be included, and the application checks the selection before rendering it. This report
is verified against these synthetic inputs and modeled rules, not certified for real-world
operation."*

Worth showing on the earlier-departure case: the timeline and red plan status update immediately,
then Claude's actual explanation appears in the **AI report** tab with its evidence chips. Open
**Check details** to see the seven evidence gates and the four narrative reference checks listed by
name. If a check fails, the prose is **withheld** with the failed check named and no green badge.

Say out loud what the two labels mean: "Evidence checks passed" covers the deterministic manifest;
the narrative carries "AI-written explanation. Evidence references checked; wording requires review,"
and its factual confidence reads **Not calibrated** — because citation resolution is not proof that a
sentence is true.

Live reference screenshot: `web/artifacts/40-s01-live-ai-report.png`.

## Modeled assumptions and limitations

1. **Packing is an assumed fixed delay with unlimited capacity.** It starts the moment picking ends;
   no packing queue, staging, loading, or transport is modeled. The hatched band is a modeled
   duration, not a reserved packing resource. This is stated on screen.
2. **Time is an integer minute offset from a synthetic 08:00 on one day.** No dates, time zones,
   DST, or overnight shifts. Worker intervals are half-open, so an assignment ending at the minute
   another begins does **not** overlap.
3. **The AI report explains; it never decides.** The engine owns the verdict, the numbers, and the
   canonical findings, and the model cannot override them. Claude writes the explanation, which is
   checked only for structure and reference resolution — never for meaning. A paragraph can cite the
   right evidence and still misstate a relationship, so the prose is always labelled as requiring
   review and its factual confidence is reported as "Not calibrated".
4. **A pass only means the implemented checks passed.** OpsCheck evaluates five rule families
   against synthetic data. It does not build, optimize, or repair a plan, and it establishes
   nothing about optimality, real-world feasibility, safety, or whether a better plan exists.
   Missing or invalid required input **blocks** evaluation; a blocked rule is never a passed rule.

## Remaining hardening backlog

Nothing here is started. Milestones M0–M4 remain open; see `TASKS.md` and `VERIFICATION.md`.

1. **Live-path breadth.** The live path is verified by three recorded V1 smoke calls and three
   recorded V2 UI calls. The AI browser checks deliberately use a mocked provider, so the live path
   has no automated regression coverage. Six successful calls are not calibration evidence, and
   reference resolution is not semantic proof.
2. **Broader edge-case coverage** — malformed CSV, duplicate primary IDs, unknown references,
   row-width mismatches, and limit breaches.
3. **Real CSV replacement and mapping UI** (M3): four file slots, the `standard` / `warehouse_b`
   profile switcher, size and read-failure guards, and async replacement races.
4. **Deferred accessibility checks** — end-to-end keyboard-only traversal and an assistive-technology
   pass. Both are currently **NOT RUN**.
5. **Regression dashboard and JSON report export**, including the guarantee that a stale report can
   never be exported as current.
