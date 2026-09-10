# OpsCheck — Interview visual upgrade

Paste the instruction below into the existing Claude Code session in the repository root.

---

Upgrade the EXISTING working OpsCheck application into a visually impressive interview demo. Implement now; do not return another plan and wait.

The centerpiece is an interactive schedule linked to the explanation and original source cells. Improve how the working product communicates its results, not just its decoration.

## Authorization and boundaries

This authorizes a bounded visual upgrade, including a new schedule visualization. It supersedes the earlier prohibition on a timeline, but NOT the data contracts, validation rules, synthetic-data disclosures, or honest verification requirements.

Inspect the actual repository, CLAUDE.md, TASKS.md, HANDOFF.md, relevant component/view-model contracts, and the running page before editing. Reuse the existing engine, hook, view model, components, and working source navigation. Do not re-scaffold, upgrade frameworks, or reset the repository. Do not overwrite unrelated or uncommitted work.

The previous handoff reported working S00/S01/S02 flows, 23 unit tests, and 8 Chromium checks. Confirm the actual current state; do not treat those counts as evidence of a new run.

Use the existing stack. No database, backend service, AI model, paid API, public deployment, chart dependency, external fonts, or imported company branding. Do not start full CSV-import, optimizer, or regression-dashboard work.

## 1. Build one coherent workspace

Keep a refined light theme: near-white canvas, white panels, ink/navy text, one teal primary accent, and restrained semantic red/amber/green. Use tabular numerals, consistent spacing, clear headings, and accessible contrast. No second theme.

Compact header:
- OpsCheck
- “Check the plan. Trace the problem.”
- A visible “Synthetic data” badge and concise independent-prototype disclosure.

Below it:
- Three prominent scenario controls: Baseline, Earlier departure, Missing packing duration. Keep their case IDs secondary.
- Existing Run checks and Reset actions.
- A compact status strip separating input readiness from plan evaluation. All statuses and counts must come from current application state/results.

Main workspace:
- Roughly two-thirds width: interactive schedule plus compact findings.
- Roughly one-third width: selected-order/evidence inspector.
- Raw source tables below, collapsed or tabbed but genuinely accessible. Opening a source link expands the viewer and targets the real cell.

Aim to show the controls, evaluation state, schedule, and key explanation together at laptop size. Allow vertical scrolling rather than shrinking text excessively. Stack panels on narrow screens, with table scrolling contained inside its panel.

Do not add sidebar placeholders, ornamental KPI cards, a large landing-page hero, fake processing animations, or controls without behavior.

## 2. Add the visual centerpiece: submitted-order timeline

Build this with existing React plus SVG or CSS. Keep it simple and deterministic.

Use one row per order. Include the order ID and assigned worker as row labels; this is an ORDER timeline, not a worker-utilization chart.

Display:
- The submitted picking interval.
- After successful evaluation, the modeled packing interval when its required values are available from the authoritative domain result.
- A distinct departure marker for each order.
- A clearly labeled overrun for a failed readiness-before-departure check.
- A small legend explaining picking, assumed packing, departure, and deadline miss.

Use actual input/result values for positions and labels, with a shared time axis and consistent documented clock formatting. Extend the plotted range enough to include modeled readiness when it exceeds departure. Handle missing values and a zero-width range without NaN or broken layout.

Packing segments must be visually distinct, for example hatched, and labeled as a modeled duration. Do not imply that they are validated packing-resource reservations. Show a concise note that packing capacity is not modeled.

Visual state must reflect evaluation state:
- Before Run checks: show only trustworthy submitted timing inputs in neutral styling. No calculated readiness, deadline verdict, or implied success.
- After evaluation: use the engine's outcomes for readiness and violation overlays.
- If required data blocks evaluation: remove derived overlays and show an explicit blocked-state explanation. Keep raw inputs inspectable. Do not fabricate timeline positions for missing values.
- On scenario/reset changes: invalidate the old visualization/results and clear old selections. Never leave stale red or green conclusions looking current.

Selecting an order must select its available explanation/findings. Selecting a finding must highlight the corresponding timeline row. Use actual buttons or equivalent keyboard-accessible controls; not pointer-only SVG hit areas.

Do not add drag-and-drop scheduling, editable time sliders, live simulation, or an optimizer.

## 3. Make the explanation panel the second standout

For S01, the real current report should produce a prominent ten-minute miss and a readable chain:

Picking complete 08:45
+ Assumed packing 30 min
= Modeled ready 09:15
Departure 09:05
Misses departure by 10 min

Those values describe the existing scenario; they are acceptance expectations, not constants to render. Obtain them from the current domain result. Respect OperandUnit: MINUTE_OFFSET can be formatted as a clock; a duration must remain a duration.

Give the calculation room to breathe. Make source references compact clickable chips beside the relevant values. Preserve the working tab-switch, scroll, and exact-cell outline behavior.

For missing packing duration, render an equally intentional blocked-data panel:
“Cannot evaluate this plan”
“Required packing duration is missing.”
Show the affected source field and its actual empty value. Do not carry over the previous lateness result.

For a passing baseline, describe success as “Passed implemented checks,” not optimality or guaranteed feasibility. Provide a useful selection hint or actual order detail rather than a giant empty panel.

## 4. Preserve architecture and finish the polish

All operational calculations remain in the domain layer. Presentation geometry belongs in the view model or a focused presentation adapter. Never reimplement readiness/deadline/overlap rules in JSX.

Reuse existing authoritative calculated outputs. If a visualization needs a value not exposed to the UI, add the smallest read-only projection of the existing domain output; do not derive a second competing answer.

Do not use expected-results JSON in production or branch on scenario IDs to invent results. Do not modify fixtures or frozen expected outcomes.

Use restrained hover, focus, selection, and expand/collapse treatments. Respect reduced-motion preferences. No looping animation, confetti, or fake progress delays.

Keep source values, labels, and numeric columns legible. Make selected rows and highlighted cells unmistakable without relying on color alone. Preserve raw-source navigation when plan evaluation is blocked.

## 5. Implement, inspect, and stop

Build in this order:
1. Inspect current UI and identify reusable components.
2. Wire the real timeline and linked selection.
3. Refine layout, status hierarchy, and the calculation inspector.
4. Inspect actual browser screenshots and perform one focused correction pass.
5. Run verification and hand off. Do not begin another roadmap milestone.

Use one builder by default. Delegate only a genuinely independent styling file set if helpful; no agent teams, shared-file races, monitoring loops, or repeated reviews. Do not spend time reorganizing the project for parallelism.

Run actual typecheck, lint, existing tests, and production build. Preserve existing checks rather than weakening assertions to make the visual upgrade pass.

Add focused browser checks for timeline/order selection, evidence navigation, and removal of old overlays after scenario changes. Exercise:
Baseline → Run → Earlier departure → Run → select O-104 → open source cell → Missing packing duration → Run → Reset.

Inspect real laptop and narrow-viewport rendering. Check for clipped text, unintended page-width overflow, inaccessible controls, and stale result styling. A successful HTTP response does not replace checking the rendered application.

Save real screenshots under web/artifacts/ showing:
- Evaluated baseline.
- Earlier departure with O-104 selected and its calculation visible.
- Missing-data blocked state.

If browser verification is unavailable, report it accurately; do not fabricate screenshots or mark it passed. Do not repeatedly reinstall tooling or disable tests to hide failures.

Update TASKS.md, VERIFICATION.md, and HANDOFF.md briefly with actual changes, commands/results, and deferred work. Leave original hardening milestones open where incomplete.

Finish with the exact launch command and URL, whether the server is actually running, screenshot paths, actual verification outcomes, limitations, and a 60-second demonstration script.

Success is one coherent, visually compelling, functioning demonstration—not more features. Begin implementation now.
