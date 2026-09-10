# Research sources and attribution

Checked September 10, 2026. These are public primary sources. WCAG's normative recommendation is authoritative for its success criteria; WAI Understanding pages explain them. The concrete OpsCheck type scale, palette, spacing assignments, layout, and visual priorities are project decisions, not universal empirical rules.

## Requested material

**S01 — Figma: Web design explained—key elements and best practices**
https://www.figma.com/resource-library/what-is-web-design/
The requested article covers content, layout, navigation, visual style, and function. It supports user-oriented hierarchy, consistent visual choices, responsive organization and readability. It does not prescribe an OpsCheck font size, color palette, contrast calculation or mandatory 3D interface.

**U01 — User attachment: Pasted markdown(4).md**
The uploaded AI conversation recommends a token-based design foundation (lines 159–164). It also proposes 3D scenes, animation libraries and bento layouts (lines 145–182). We adopt the token-system idea as a useful project direction, not as proof of any model ranking or a claim that 3D guarantees premium quality. No model leaderboard claims from that file were needed or verified. The user's actual existing stack and scope govern implementation.

## Design-system guidance

**S02 — Figma: Visual hierarchy**
https://www.figma.com/resource-library/what-is-visual-hierarchy/
Supports prioritization, grouping, alignment, whitespace and progressive disclosure. No universal formula for visual appeal is asserted here.

**S03 — GOV.UK: Type scale and paragraphs**
https://design-system.service.gov.uk/styles/type-scale/
https://design-system.service.gov.uk/styles/paragraphs/
Provides a deliberate size/line-height system, relative units, and a 19px default paragraph size. OpsCheck's 16/18px app roles are an adaptation, not GOV.UK compliance. No GOV.UK font or branding is distributed.

**S04 — USWDS: Typography**
https://designsystem.digital.gov/components/typography/
Gives reading-line guidance of 45–90 characters, with about 66 a useful long-text target. OpsCheck uses 65ch maximum; `ch` is a CSS character-width unit, not an exact English character count.

**S05 — IBM Carbon: Spacing**
https://carbondesignsystem.com/elements/spacing/overview/
Demonstrates named spacing tokens using increments of two, four and eight. OpsCheck chooses a smaller local scale and specific assignments.

## Accessibility requirements and explanations

Normative reference: https://www.w3.org/TR/WCAG22/

**S06 — Text contrast, 1.4.3 (AA)**
https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
Ordinary text threshold 4.5:1; large-scale allowance 3:1, with specified exceptions. Compare unrounded ratios. Evaluate actual foreground/background colors, not anti-aliased screenshot pixels alone.

**S07 — Enhanced contrast, 1.4.6 (AAA)**
https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html
Ordinary-text 7:1 is the enhanced criterion, not the general AA minimum. OpsCheck adopts that as a primary-prose target only.

**S08 — Non-text contrast, 1.4.11 (AA)**
https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
Applies a 3:1 requirement to necessary component/state or graphical information against adjacent colors, with exceptions. It does not demand dark borders around every decorative card.

**S09 — Use of color, 1.4.1 (A)**
https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
Color must not be the only carrier of information or an action/state distinction.

**S10 — Target size minimum, 2.5.8 (AA)**
https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
24x24 CSS px with spacing and other exceptions. The OpsCheck 44px standalone-control rule is deliberately stronger.

**S11 — Enhanced target size, 2.5.5 (AAA)**
https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html
44x44 CSS px, with exceptions such as inline text links. Adopting this value is not a complete AAA assessment.

**S12 — Focus visible, 2.4.7 (AA)**
https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html
Keyboard focus needs a visible indicator. The 3px ring/3px offset are local design choices.

**S13 — Focus not obscured minimum, 2.4.11 (AA)**
https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
Author-created content must not fully hide the focused component. We additionally aim to avoid partial clipping in this app.

**S14 — Status messages, 4.1.3 (AA)**
https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
Relevant status updates need programmatic exposure without unnecessarily moving focus. Use concise status announcements, not a long AI transcript read aloud after every change.

**S15 — Animation from interactions, 2.3.3 (AAA)**
https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
Nonessential interaction-triggered motion can be disabled. OpsCheck's reduced-motion support and small transition budget are local implementation policies, not a claim of full AAA coverage.

**S16 — Text resizing, 1.4.4 (AA)**
https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html
Supports 200% text enlargement without content/function loss, subject to the criterion's scope.

**S17 — Reflow, 1.4.10 (AA)**
https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
Ordinary vertical-reading content must work at 320 CSS px; genuinely two-dimensional material has an exception. Keep that exception local to the chart/table.

**S18 — Text spacing, 1.4.12 (AA)**
https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html
The interface must tolerate the specified spacing overrides. These override-test values are not all required default styling.

## Verification tooling

**S19 — Playwright: Accessibility testing**
https://playwright.dev/docs/accessibility-testing
Documents axe integration and explicitly notes that automated checks find only part of the problem. Combine browser automation, manual assessment and actual user testing when possible. This design task does not claim user research was performed.

## Limits of this research
No source establishes that a specific UI will secure a job, that a numerical beauty score is valid, or that replacing the coding model fixes hierarchy. No rankings, commercial recommendations or extra frontend platforms are required. Actual app measurements and screenshots remain necessary after integrating this pack.
