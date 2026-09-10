# Claude Code — Implement the OpsCheck presentation redesign

Begin after the current screenshot/axis task finishes. Work in the EXISTING repository and current app under web/. The user authorizes this bounded implementation, not another plan awaiting approval.

## Goal
The user finds the current interface too small, cluttered and visually unappealing. Produce a genuinely redesigned information hierarchy with readable typography and calmer surfaces, while keeping the working product intact. Do not solve this by making the same crowded interface 10% larger.

## First read and inspect
Read DESIGN_RULES.md, SCREEN_SPEC.md and ACCEPTANCE.md in this folder, then inspect the existing CLAUDE.md, HANDOFF.md and the actual current UI/component/styles. Use SOURCES.md when an accessibility requirement needs explanation. The CSS file is a reference to integrate, not permission to paste a second competing theme over all existing utilities.

Inspect existing agent ownership/running work. Do not launch parallel writers. Confirm the current timeline-axis fix and AI implementation instead of assuming the old screenshots are the live version.

## Authority and boundaries
This document supersedes older presentation-density, tiny-type, card-layout and no-redesign instructions ONLY for this bounded design pass. It does not supersede the domain contracts, fixed fixtures, operational semantics, source references, API/secret boundaries, current AI protocol, stale-result protection or testing truthfulness.

Allowed: central tokens, component presentation markup, grouping/disclosure of existing content, readable copy labels without changing domain meaning, responsive layout, semantic/accessibility improvements, and focused tests.

Not allowed: re-scaffolding, framework upgrades, new production dependencies, databases, public deployment, providers/models changes, revised prompts/protocols, new features, optimizer, 3D graphics, chart/motion libraries, arbitrary uploads, fake chat input, agent teams or modifying unrelated files. An accessibility development dependency is allowed if required by ACCEPTANCE.md.

No live Anthropic calls are authorized. Do not open, print, rewrite or copy .env.local. Use existing mock-provider test injection that preserves real gate logic.

## Implement in this order

1. **Capture the current state.** Take one laptop screenshot and measure current body/prose/control/metadata sizes. Identify which existing style declarations cause the density. Do not spend the session writing an audit report.

2. **Establish the token system.** Integrate opscheck-tokens.css values into the current global stylesheet/Tailwind setup. Keep CSS/Tailwind approach consistent with the installed version. Convert existing text-xs, tiny arbitrary fonts, faded labels and scattered color/padding values into explicit semantic roles. Don't fix specificity with a new pile of !important rules. Scoped text inherits correctly; don't shrink html below 100%.

3. **Recompose the screen.** Implement the header -> toolbar -> clear plan outcome -> schedule/inspector workspace -> secondary disclosures flow. Give the right-hand explanation a generous width. Main text 16px, actual AI prose 18px, metadata minimum 14px. Do not shrink typography on mobile. Collapse passed/raw detail; preserve required findings and critical caveats.

4. **Restyle existing components.** Use one accent, approved contrast pairs, 24px panel padding, comfortable controls, fewer nested cards and readable sentence-case labels. Preserve all state transitions and exact data. Keep actual model prose, source chips and precisely scoped metrics. No invented fallback AI content.

5. **Protect the schedule.** Preserve the recent time-axis alignment correction. Header/row plot width and origin must match after layout changes. Prefer local horizontal scrolling on narrow screens to a compressed unreadable timeline. Keep clock/duration semantics, assumed packing hatching, neutral not-run and blocked states.

6. **Verify and refine once.** Follow ACCEPTANCE.md. Measure rendered styles/contrast/targets, run original tests plus focused design checks, inspect real screenshots at laptop and narrow widths, and fix concrete visible problems. Do not use a screenshot of an old server/build. Do not kill unrelated processes.

7. **Handoff and stop.** Update the existing verification/handoff documents briefly. Include real screenshot paths and observed improvements, not just a list of modified CSS. State any unverified accessibility work. Leave the original product hardening backlog as-is.

## Highest priority when tradeoffs appear
Preserve correctness and meaningful disclosures; then ensure comfortable text and functioning controls; then simplify hierarchy; then polish spacing and surfaces. Reduce secondary density before shrinking text. Allow vertical scrolling instead of cramming everything above the fold.

Do not remove complete source evidence or hide missing data to get a cleaner screenshot. Do not change an operational failure into a success or use reference coverage as narrative confidence. A considered, readable tool is the target—not a marketing page or a collection of animations.

## Final output
Provide actual launch command/URL; what changed; measured type sizes; tests and audits actually run; before/after screenshot paths; whether provider screenshots use mocks; limitations. Do not claim full WCAG certification or new live-API verification. Do not start another feature after this pass.
