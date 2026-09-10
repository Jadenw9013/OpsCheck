# OpsCheck — Readability-first design system

Research date: September 10, 2026.

## Purpose
Redesign the existing OpsCheck presentation so it is easier to read, calmer, and more polished. Keep its plan-checking engine, schedule, source traceability, and existing Anthropic report behavior. This is a design retrofit, not a product rebuild.

Copy this entire `opscheck-design-system/` folder into `C:\Dev\haladir\`, next to `web/`. Do not replace the repository's existing CLAUDE.md, application, or planning documents.

Paste this into the existing Claude Code session **after the current correction task finishes**:

```text
Read opscheck-design-system/IMPLEMENT_REDESIGN.md, then implement it in the
existing OpsCheck app. This is authorization for the bounded presentation
redesign described there, not additional product features.

Use DESIGN_RULES.md and SCREEN_SPEC.md as the design contract and
ACCEPTANCE.md as the verification contract. Integrate the provided tokens
through the existing styling setup, rather than layering contradictory CSS.

Inspect the real current UI first. Preserve the timeline-axis correction,
engine, fixtures, source navigation, AI request behavior and publication
boundaries. Prioritize readable type, clearer hierarchy and reduced clutter.

Do not start another planning cycle or ask for routine approvals. Implement,
inspect real screenshots, make one focused refinement pass, and report the
actual results. No live Anthropic calls are authorized for this design pass.
```

## Files
| File | Purpose |
|---|---|
| DESIGN_RULES.md | Numbered, enforceable typography, color, spacing, interaction, and scope rules. |
| SCREEN_SPEC.md | Concrete layout and component changes for the existing app. |
| ACCEPTANCE.md | Visual/browser test cases, measurements, manual checks, and honest completion criteria. |
| IMPLEMENT_REDESIGN.md | Bounded coding-agent instruction and implementation order. |
| SOURCES.md | Primary-source research and the limits of what each source establishes. |
| opscheck-tokens.css | Framework-independent CSS tokens and small opt-in presentation helpers. |
| check-contrast.mjs | Dependency-free checker for declared token pairs; not a rendered-page audit. |
| CONTRAST_REPORT.md | Calculated results for those pairs, including decorative-border exclusions. |
| contrast-report.json | Machine-readable version of the same results. |

## Three kinds of rule
**[A] Accessibility baseline:** a selected WCAG 2.2 criterion, with its scope and exceptions. These rules are not a complete WCAG conformance assessment.

**[R] Reference guidance:** a recommendation from an established design system or design resource. Not a universal accessibility requirement.

**[P] OpsCheck decision:** an intentionally strict local product/design choice. For example, 16px body type, 18px report prose, a 14px metadata floor, and 24px panel padding are project choices, not numbers mandated by WCAG.

## Evidence and limits
The author inspected the supplied screenshots and the user's pasted guide, researched the public sources in SOURCES.md, and calculated the proposed flat-color contrast pairs. This pack has **not** been integrated into or tested against the user's local application. It does not establish that the existing UI passes accessibility checks, that the latest AI report has been browser-verified, or that a redesign will impress a particular interviewer.

No fonts, application secrets, generated provider responses, or company data are included.
