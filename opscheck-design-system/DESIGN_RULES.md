# OpsCheck design rules

Scope: existing plan-validation workspace, including its current AI report and evidence inspector.
Rule classes: [A] selected accessibility baseline; [R] source guidance; [P] project design decision. Source IDs refer to SOURCES.md.

## 1. Product and design direction

**P-01 — Preserve the product.** Improve presentation, not functionality. No landing page, 3D warehouse, new charts, optimizer, free-form chatbot, authentication, uploads, new agent team, public deployment, model switch, or API redesign. Restyling existing chat-style report output is in scope.

**P-02 — One visual identity.** Use a light neutral workspace, white panels, dark ink text, and one deep teal action accent. Semantic red/amber/green represent actual states; they are not decoration. The schedule and clear explanation are the visual centerpiece.

**P-03 — Real hierarchy.** The primary action and actual plan outcome lead; schedule and AI/evidence explanation follow; technical records and validation detail are secondary. Do not give every number, disclaimer, and code its own equally prominent card.

**R-01 — Ground the design in the task.** Figma's article organizes design around content, layout, navigation, visual style, and function. Its hierarchy guidance emphasizes ordering, alignment, grouping, and selective disclosure. These support a clear task-oriented workspace, not a prescribed decoration style. [S01, S02]

## 2. Typography: no more miniature interface

**P-04 — Central scale only.** Use the following roles in rem. Pixel equivalents assume the default 16px browser root; do not force the root smaller. Do not apply a page-scale transform or CSS zoom as the redesign.

| Role | Size | Line height | Weight | Use |
|---|---:|---:|---:|---|
| Page/product title | 2rem / 32px | 1.25 / 40px | 600 | OpsCheck header; no separate oversized hero. |
| Main outcome | 1.5rem / 24px | 1.333333 / 32px | 600 | One primary plan result or main evidence conclusion. |
| Panel heading | 1.25rem / 20px | 1.4 / 28px | 600 | Order schedule, AI report, Evidence. |
| AI/explanatory prose | 1.125rem / 18px | 1.555556 / 28px | 400 | Actual explanation and substantive reading. |
| Body, controls, key values | 1rem / 16px | 1.5 / 24px | 400–600 | Buttons, tabs, statuses, source links, main table data. |
| Metadata | 0.875rem / 14px | 1.428571 / 20px | 400–500 | Ticks, filenames, record IDs, model metadata, compact noninteractive labels. |

**P-05 — Absolute local floor.** No visible text smaller than 14px-equivalent at default root/zoom. No core reading or standalone control labels smaller than 16px. Do not use metadata styling for whole paragraphs, meaningful warnings, or the primary report. Raw-source tables alone may use 14px metadata; the ordinary submitted-plan table uses 16px. Hidden screen-reader text is not a loophole for tiny visible text.

**P-06 — Keep type large on small screens.** Maintain 16px body/control and 18px report prose sizes. Reflow or locally scroll genuine 2D content instead of shrinking everything. Title remains 32px unless a demonstrated narrow-layout problem warrants 24px; record that exception.

**P-07 — Limit font variation.** Use the existing licensed local sans-serif if already available, otherwise the supplied system stack. No new font download/build dependency. Use monospace only for actual IDs, raw data, codes, and formulas. Use tabular numerals for times and counts. Prefer weights 400/500/600; never use thin body text.

**P-08 — Readable prose.** Left-align explanations. Use paragraphs with 16px separation and max-inline-size 65ch. Aim for roughly 45–75 characters per line where space permits, but do not enforce a minimum width on mobile. Do not justify paragraphs, clamp substantive report text, or put a long explanation in a narrow speech bubble.

**R-02 — Large reading text is intentional.** GOV.UK uses a tested type scale and a 19px default paragraph size; USWDS suggests 45–90 characters for most reading lines and about 66 for longer text. OpsCheck adopts its own compact-app 16/18px roles rather than copying an entire government design system. [S03, S04]

## 3. Contrast and semantic color

**A-01 — Text contrast.** Ordinary text needs at least 4.5:1 against its actual background under WCAG 1.4.3. Large-scale text has a 3:1 allowance (at least 18pt regular or 14pt bold). There are exceptions such as inactive controls and logotypes. OpsCheck deliberately uses 4.5:1 for visible information at every size, rather than relying on the large-text exception. [S06]

**P-09 — Comfortable reading target.** Primary body and AI prose should target at least 7:1 on their surface. This is a chosen margin beyond AA; WCAG's enhanced ordinary-text contrast criterion is Level AAA. This does not make the entire app AAA compliant. [S07]

**A-02 — Necessary non-text information.** Needed control/state indicators and graphical objects need 3:1 against adjacent colors under 1.4.11, with the criterion's exceptions. Not every decorative separator or panel edge must be 3:1. [S08]

**P-10 — Use approved pairings.** Do not improvise shades or opacity changes. Use tokens in opscheck-tokens.css. CONTRAST_REPORT.md verifies named solid-color pairs. New pairs, hover states, gradients, opacity, compositing, or backgrounds require a new check.

| Role | Foreground | Background |
|---|---|---|
| Main text | #0F172A | #FFFFFF / #F6F8FB / #F1F5F9 |
| Supporting text | #475569 | #FFFFFF / #F6F8FB / #F1F5F9 |
| Metadata | #526277 | #FFFFFF / #F6F8FB / #F1F5F9 |
| Primary button | #FFFFFF | #0E7490; hover #155E75 |
| Link/selected text | #0E7490 | #FFFFFF / #EAF6F8 |
| Success | #166534 | #F0FDF4 |
| Warning/blocked input | #92400E | #FFFBEB |
| Violation/error | #B42318 | #FEF3F2 |
| Informational | #1D4ED8 | #EFF6FF |
| Essential control boundary | #738398 | light approved surface |
| Decorative panel divider | #DCE3EC | light surface, decorative use only |

**A-03 — Never color alone.** Pair state color with readable wording and, where useful, an icon or pattern. Hatching differentiates assumed packing; a label accompanies lateness. Keep link affordances besides color, such as underlines for inline links. [S09]

**P-11 — Correct state priority.** A verified explanation cannot turn a failed plan green. Synthetic data is a neutral provenance label, not an amber error. Success is reserved for completed checks/results that actually passed. Before a run and after a stale update, do not imply success through color.

## 4. Spacing, layout and surfaces

**P-12 — Spacing tokens.** Use 4, 8, 12, 16, 24, 32, 48, and 64px-equivalent values. The scale governs layout, not time-axis coordinates. Borders, icons, focus outlines and actual chart geometry have their own tokens/measurements. Carbon's spacing system demonstrates the value of tokenized small and large increments; these exact assignments are OpsCheck choices. [S05]

**P-13 — Whitespace by relationship.** Use 8px inside tightly related label/value groups, 12–16px between controls or paragraphs, 24px between panels, and 32px between major page sections. Start with 24px panel padding, 16px on narrow screens. Do not add uniform giant padding to every nested element.

**P-14 — A legible two-column workspace.** Center a max-width 1440px content area with 32px side gutters on desktop and 16px on mobile. At >=1200 CSS px start with a 1.25:1 schedule/inspector split, 24px gap, and a 432px minimum inspector. Below that stack. Use min-width:0 and content-driven height. The target is a generous explanation column, not maximum table density.

**P-15 — At most two outlined card levels.** Main panel plus one meaningful inset (e.g., calculation). Inside use whitespace, alignment, lists, and dividers—not boxes inside boxes inside boxes. One 12px panel radius, one 8px control/inset radius, and one subtle shadow. Thin pale panel dividers must not be reused as the only input boundary.

**P-16 — Do not force one-screen completion.** At 1366x768 show the action, current outcome, top of the schedule, and the selected AI/evidence panel without scrolling. It is fine for later order rows, expanded sources, and full reports to extend below the fold. Never reduce type size to fit every order, record and caveat on one screen.

**P-17 — No unnecessary fixed heights.** Reading panels grow naturally. Do not give the AI report its own small vertical scrolling box. Data tables and a genuine 2D schedule may have contained scrolling. Avoid making the whole inspector sticky; do not trap content behind a sticky header.

## 5. Progressive disclosure without hiding truth

**P-18 — Details on demand.** Keep one current plan verdict visible. Show actual violated/blocked findings prominently. Collapse passed checks, full raw tables and long scope detail initially. Do not hide violations or required data diagnostics inside a generic "Advanced" section.

**P-19 — Plain language first.** Prefer "1 modeled violation" and "Cannot evaluate plan" to long uppercase enum-like pills. Put PLAN_READY_BY_DEPARTURE and record codes inside evidence details at 14px. Retain the exact rule code for inspection; do not rename the domain contract.

**P-20 — Consolidate, do not delete, safeguards.** Show a short visible scope line near the result/chart, such as "Modeled rules only. Packing capacity is not modeled." Preserve all other assumptions in one accessible disclosure. Place the existing narrative-review caveat directly beside the AI explanation's metrics. Do not hide it in the footer or remove it for aesthetic reasons.

**P-21 — Source links remain one step away.** Prefer "Picking end · plan.csv, row 5" over a bare "rec 5" as the visible/accessible description. Underlying row/column semantics must remain the existing logical CSV record numbers. Clicking a reference opens any necessary disclosure and targets the exact source cell.

## 6. Buttons, focus and motion

**P-22 — Comfortable targets.** Run checks: at least 48px high. Standalone buttons, scenario controls, tabs, source chips, switch label area and disclosure headers: at least 44x44 CSS px target. Inline links in prose remain 16px readable links, not oversized buttons. A selected schedule row provides at least a 56px-high full-row target. No nested buttons.

**A-04 — Understand target standards.** WCAG 2.5.8 AA uses a 24x24px minimum with spacing and other exceptions; 2.5.5's 44x44px target is an enhanced AAA criterion with its own exceptions. OpsCheck chooses the larger value for standalone controls. [S10, S11]

**P-23 — One dominant action.** Run checks is the single filled accent button in the main toolbar. Reset and disclosure actions are secondary. Selected tabs use an underline/soft selected treatment, not the same filled style as the primary action. Preserve the current AI toggle and explicit billing behavior; do not introduce auto-generation through layout changes.

**A-05 — Keyboard visibility.** Interactive controls require visible focus, and focused content must not be fully hidden by author-created overlays under the corresponding AA criteria. [S12, S13]

**P-24 — Strong focus.** Use a 3px focus outline with 3px separation on light surfaces. Do not remove outline without an equivalent replacement. Keep focus when tabs change and make source navigation's final target discoverable. Use a native disclosure or a correctly implemented accessible equivalent.

**P-25 — Quiet motion.** Use short 120–160ms color/opacity transitions only where helpful. No artificial reasoning animation, typewriter replay, parallax, auto-scroll that steals position, or decorative gradients/3D. Respect prefers-reduced-motion; actual loading still has a textual status. Do not move focus or read an entire generated report through aria-live. Announce a concise completion or failure message. [S14, S15]

## 7. Responsive and visualization safeguards

**A-06 — Resize/reflow.** Support text enlargement to 200% without lost content or functionality. Ordinary page content must reflow at 320 CSS px; content requiring a two-dimensional layout has a scoped exception. Keep only the actual table/timeline in a labeled scroll region, not the whole page. [S16, S17]

**A-07 — User text spacing.** No content/function loss when users set line height to 1.5, paragraph spacing to 2em, letter spacing to 0.12em and word spacing to 0.16em. These are override-tolerance tests, not a requirement to use all those values as the default design. [S18]

**P-26 — Shared timeline geometry.** Header anchors and order tracks share the same time domain, origin, and plot width. Order labels and result columns are outside that width. Refactoring padding must not reintroduce the misaligned-axis problem. Test plotted positions; visual taste never overrides data meaning.

**P-27 — Readable chart, not tiny chart.** Timeline labels >=14px, order IDs/statuses 16px, full row target >=56px. On narrow screens use contained horizontal scrolling with a 576px initial inner minimum, adjusting upward if needed for real labels. Preserve a textual alternative in the submitted-plan/evidence views. Hide redundant short-bar "pick" text rather than truncating to "p..."; keep accessible labels and the legend.

**P-28 — Semantic boundaries survive.** Keep the existing assumed-packing pattern, before-run neutral state, blocked-data state, stale-result invalidation, and typed minute/duration formatting. Rendering geometry may scale authoritative values; JSX must not calculate a second operational verdict.

## 8. AI presentation boundaries

**P-29 — Existing output, better reading.** Restyle the implemented report; do not create a different model protocol or rewrite accepted provider text to make it prettier. No invented output, tokens, latency, stages or confidence percentages.

**P-30 — Scope each metric.** Label engine-evidence checks separately from narrative reference checks. Keep the existing AI-written-explanation review caveat. A 100% coverage measure is not a probability that generated prose or the warehouse plan is correct. Display actual n/N, N/A, blocked, unavailable and failed states without collapsing them into a decorative score.

**P-31 — No new paid traffic.** This design task authorizes offline/mocked-provider browser verification only. No live provider calls, reading secret files, switching models, altering retry behavior, or opening a public endpoint.

## 9. Definition of done

**P-32 — A screenshot is required, not sufficient.** Inspect the real rendered current app at the required viewports and run the tests in ACCEPTANCE.md. Passing a build, a token-contrast script, or an automated accessibility scan alone is not a complete design or accessibility assessment. Playwright explicitly recommends combining automated and manual checks. [S19]

**P-33 — Exceptions must be explicit.** Record any nonconforming role/component, why it was unavoidable, and the next action. Do not silently shrink text, suppress findings, loosen tests, or label unrun checks passed.
