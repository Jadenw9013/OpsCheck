# Design acceptance and verification

This checklist separates objectively checkable conditions from visual judgment. A pass is evidence of the checks performed, not a complete accessibility certification or a promise about interview outcomes. See source S19 for automated-testing limitations.

## 1. Establish a baseline

Inspect the existing repository and current UI before modifying files. Record actual file ownership and outstanding axis/AI work. Do not run competing writers. Capture the existing S01 view at 1366x768 and measure a few representative computed styles: paragraph, button, status, timeline tick, source metadata, current AI report. The screenshots alone cannot establish the current CSS values.

Use the actual current production or development build deliberately; do not test an old detached production process after changing code. Do not kill unrelated processes. Preserve previous screenshots rather than overwriting their history.

## 2. Required viewport/state matrix

| Viewport in CSS px | Required state/check |
|---|---|
| 1366x768 | S01 current result, selected order, Evidence; AI report selected where implemented. |
| 1440x900 | S00 passed, S01 violation, S02 blocked; meaningful before/after images. |
| 1024x768 | Stacked layout, readable control wrapping and report. |
| 390x844 | All three scenario controls, outcome, schedule local scroll, report/source navigation. |
| 320x800 | Ordinary-page reflow; tables/chart alone may require 2D scroll. |

Also check not-run, changed-input/stale, AI generating, provider-unavailable and withheld states. Use existing injected-provider mocks that exercise the publication boundary; do not fabricate a final green report object that skips verification.

No live Anthropic calls are authorized. Before any baseline screenshot or Run checks click, disable the AI option or establish the existing injected-provider test mode with an explicit external-provider call guard. A configured local key must not turn a visual test into paid traffic. Fail the test if a mock unexpectedly falls through to the real adapter. Capture provider-mocked screenshots with an explicit entry in the verification log; do not represent them as new live-model evidence. Existing live results remain historical unless actually rerun under separate authorization.

## 3. Measurable tests

### T01 — Typography audit
At default browser root (normally 16px), scan visible text and inspect computed styles for representative roles. Assert role mappings, not just a global body declaration:
- Core body, standalone controls, main table and status labels >=16px-equivalent.
- Actual AI narrative >=18px-equivalent with approximately 28px line height.
- Visible metadata/ticks >=14px-equivalent.
- Panel headers use 20/28, main outcome 24/32, H1 32/40.

Use role selectors/test IDs added to actual components, not indiscriminate CSS that artificially enlarges unrelated elements to satisfy the test. Ignore genuinely hidden elements, not visible text moved off-screen to avoid testing. Record legitimate browser rounding with a small tolerance (e.g., 0.2px). Spot-check nested code spans and Markdown-rendered text if those exist. Do not assume children inherit the intended size.

### T02 — Token-pair contrast
Run `node opscheck-design-system/check-contrast.mjs` from the repository root. The checker uses exact linearized sRGB values and unrounded ratios for pass/fail. It validates the approved solid-color pairs in the provided CSS. It does not inspect backgrounds in the app or establish full accessibility.

Then use the actual computed foreground/background colors in every state: normal, hover, focus, selected, alert and chart. Check alpha blending and nested surfaces. Text >=4.5:1; essential graphical/control edges >=3:1. Primary prose target >=7:1. Do not use the decorative divider as a meaningful input boundary. Document actual pairs that are different from the proposed tokens.

### T03 — Automated accessibility scan
Use the installed Playwright setup and, if needed, add only the development dependency `@axe-core/playwright`. Consult the installed tool/docs. Run relevant WCAG A/AA-tagged checks supported by the installed axe version in each meaningful open/expanded state. Include WCAG 2.2 tags when supported; do not invent a tag or claim coverage of unsupported checks.

No knowingly unfixed serious/critical findings. Review moderate/minor findings and document any justified exceptions. Inspect incomplete/needs-review contrast results manually. Do not suppress the entire chart or report from the scan to get a clean run.

### T04 — Target sizes and keyboard path
Measure actual clickable bounds: primary >=48px high, standalone controls >=44x44px, schedule row >=56px high. Inline prose links are the documented exception. Icon-only controls need accessible names. Noninteractive badges are not buttons and do not require button targets.

Manually or with browser keyboard automation exercise: scenario selection -> AI toggle if configured -> Run checks -> report/evidence tabs -> selected order -> source disclosure -> target cell -> Reset. Verify focus visible, no trap, no duplicate tab stops caused by nested targets, and no overlay fully hiding focus. Tabs must implement the chosen accessible keyboard pattern consistently; do not assign tab roles to unrelated buttons without behavior.

### T05 — Reflow, zoom, and text overrides
Ordinary document width must not overflow at 320/390/1024px. Do not make `overflow-x:hidden` on body the fix for clipped content. Confirm chart/table scroll content remains reachable.

Actually check browser/text enlargement to 200% without content or functional loss. Check 320px reflow and, where practical, 1280px at 400% browser zoom as a separate manual check. A deviceScaleFactor change is not browser/text zoom. Do not call a 320px screenshot proof that 200% text enlargement passed.

Inject this temporary test stylesheet (not production styling), inspect controls, statuses, paragraphs, chart labels and disclosures, then remove it:

```css
.ops-app, .ops-app * {
  line-height: 1.5 !important;
  letter-spacing: .12em !important;
  word-spacing: .16em !important;
}
.ops-app p { margin-block-end: 2em !important; }
```

The user-spacing test permits layout to become larger; it must not lose content/function. If the app uses a different root selector, adapt it honestly.

### T06 — Time-axis geometry regression
Keep the previously implemented alignment fix and its tests. Measure axis anchors and row plot boxes after changing column widths/padding/type. They must share the same origin and width (suggested tolerance <=1 CSS px for layout, <=2px for marker centers/rounding; document the exact tolerance).

Compare true tick anchors, not text bounding-box left edges. For known source-derived times, verify marker coordinates against the displayed domain and plot bounds. Do not compare two elements that both merely repeat the same wrong value. Test baseline and earlier-departure at 1366 and 390px, including local scrolling. No arithmetic changes to the operational engine.

### T07 — States and stale reports
Run baseline -> earlier departure -> missing duration -> reset. Validate the real engine, report, timeline and evidence behavior remain unchanged. Check that input change invalidates canonical/AI outputs, removes stale success styling and ignores delayed AI responses. A design refactor must not remount into a new provider call.

Use network/provider mocks to assert no additional requests from rerender, tab switch, opening sources or resizing. The explicit Run checks/AI-toggle behavior must match the current implemented contract.

### T08 — Content visibility and disclosure
All violations and missing-data diagnostics remain available. Passed details can be collapsed. Every source reference opens the right table/record/column. Required scope and AI prose-review caveats remain visible in context. Source details and long reports are not line-clamped or deleted.

Existing numeric counts come from the engine. No displayed fabricated confidence score, token count, success ratio, demo response or provider attribution. No new secret-file handling.

## 4. Manual visual review: pass/fail with a short reason

- At normal laptop scale, can the plan verdict and primary action be found immediately?
- Is the actual explanation comfortable to read without browser zoom?
- Are supporting labels subordinate without looking washed out?
- Is the schedule/inspector balance intentional, not a wide chart beside a cramped text column?
- Are there at most two nested outlined card layers?
- Are repeated result/caution paragraphs consolidated without hiding their meaning?
- Does the view look balanced in baseline, violation, blocked and unavailable states?
- Are primary/secondary buttons and interactive/noninteractive elements distinguishable?
- On mobile, are there no `p...` bar labels, chopped warnings or tiny content substitutes?
- Does the AI panel look like a readable explanation, not a collection of badges or a fake general-purpose chat app?

Inspect actual screenshots after automated checks; adjust only the concrete problems found. Do one focused refinement pass, not endless redesign or a review-agent loop. Do not claim user testing occurred unless an actual person tested it.

## 5. Completion report

Run the current typecheck, lint, unit tests, build and relevant browser suite. Keep original assertions unless a presentation-specific selector legitimately changed; maintain its behavioral meaning and document why. Do not alter immutable fixtures or expected engine outputs.

Update the existing VERIFICATION.md/HANDOFF.md with:
1. Current URL/build actually inspected and files changed.
2. Before/after measured type roles and main layout changes.
3. Commands and actual outcomes, with failed/not-run/unavailable separate.
4. Contrast token check versus real UI audit distinction.
5. Screenshot paths/state/viewports; label provider mocks.
6. Unresolved design/accessibility issues and original product backlog.

Do not report "WCAG compliant" from an automated scan. Use "Selected accessibility/design checks passed" and name the tested scope.
