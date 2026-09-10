# OpsCheck screen specification

Everything here is a project design decision derived from the existing screenshots and the rules in DESIGN_RULES.md. It is not a claim that one layout is scientifically optimal. Inspect the current live implementation first; the submitted screenshots precede some AI work.

## 1. Assessment of the supplied screenshots

The timeline is a useful centerpiece. The problem is its surrounding density: small-looking supporting text; many simultaneous technical labels; similarly weighted bordered boxes; repeated limitations; and compact mobile chart bars with truncated labels. Exact existing CSS sizes cannot be established from the screenshots—measure computed styles in the actual app.

The before/after examples also mix older table-first screens and newer timeline screens. Continue the newest functioning timeline/report implementation; do not resurrect the superseded page.

## 2. Target composition

```text
OpsCheck                                     Synthetic data
Check the plan. Trace the problem.

[Baseline] [Earlier departure] [Missing packing duration]
[Include AI report]                   Reset    [Run checks]
Small, visible data/API disclosure when applicable

CURRENT PLAN RESULT
1 modeled violation                         Inputs ready
O-104 misses its modeled departure by 10 min.
Actual check-count detail; no fabricated KPI cards

+----------------------------------+-------------------------------+
| Order schedule                   | [AI report]  [Evidence]       |
| Clear legend; readable labels    |                               |
| Aligned time axis                | Actual explanation OR         |
| Selected affected order          | selected source-backed        |
| Picking / assumed packing        | calculation, large enough     |
| Departure / overrun              | to read comfortably           |
|                                  |                               |
| Short scope line                 | Relevant, scoped metrics      |
+----------------------------------+-------------------------------+

Findings requiring attention (only if present)
[Passed checks — actual count]
[Submitted plan]
[Raw source records]
[Assumptions and modeling limits]
```

This is a structural map, not a requirement for a large all-caps "CURRENT PLAN RESULT" label. Use sentence case, readable typography and minimal metadata. Do not duplicate the lead finding as a second large alert immediately under the first.

## 3. Top of page

### Header
Use OpsCheck as the single H1 at 32/40, weight 600. The existing tagline becomes 16/24 supporting copy. Place a neutral 14/20 "Synthetic data" badge on the right or below on narrow screens. One concise disclosure can clarify "Independent prototype · No live warehouse connection." Do not say "No live integration" when the Anthropic API is actually used.

No decorative illustration, navigation sidebar, fake workspace selector, marketing hero, extra pages, or all-caps technical wordmark. The wordmark, typography and teal primary action provide the identity.

### Toolbar
Keep the three real scenario controls at 16/24 with >=44px targets; they wrap cleanly on narrow screens. Case IDs can be secondary 14px metadata. Keep the configured AI toggle and its existing consent/billing semantics. Run checks is 48px high, Reset is secondary and >=44px.

Scenario subtitles explain the input change, not a pre-announced result. For example, the earlier-departure case can say "Departure D-1 moved to 09:05." Do not hardcode conclusions in this copy. Keep any required data-transmission disclosure legible when AI is enabled.

### Result summary
A 24/32 heading carries one actual current outcome. Supporting 16px copy can name the affected order. Data readiness is a secondary but clear status, not merged into plan approval. Put exact check counts at 16px beneath/alongside the result; the model does not supply them.

Suggested state wording, mapped from actual state rather than scenario constants:
- Not run: "Ready to check the submitted plan."
- Baseline after checking: "Passed implemented checks."
- Violations: "1 modeled violation" or the true count.
- Missing/invalid data: "Cannot evaluate this plan."
- Changed input: "Inputs changed. Run checks again."

Allow each result to occupy the necessary height. Avoid a long uppercase pill with line breaks in the middle of its meaning.

## 4. Main workspace and schedule

Use the 1.25:1 desktop split in the tokens as a starting point. The inspector needs enough width for 18px explanation text. Below 1200px, stack; do not preserve desktop density at the expense of legibility.

At 1366x768, the toolbar, plan verdict and start of both primary panels should be visible. Requiring all eight orders and the entire AI report above the fold is explicitly out of scope.

The schedule retains all existing selection and domain behavior. Use 56px minimum rows, 16px order IDs and textual outcomes, 14px worker/tick metadata, 20px status icons, and a short legend. Reduce gridline emphasis while keeping meaningful bar/marker edges above the required contrast threshold. Time-to-position geometry stays identical across the axis and all rows.

The selected order uses a quiet teal surface, one clear selection edge and focus styling. A violation uses a red label and patterned overrun. Passing rows do not each need a green background. A legend explains that readiness is modeled; the packing segment remains visually distinct and explicitly assumed.

At narrow widths, horizontally scroll the actual timeline inside its own labeled region. Do not allow the body to scroll sideways or squash labels into ellipses. A user's need to read a time or quantity takes priority over a zero-scroll screenshot.

## 5. Inspector: AI report and Evidence

### Shared rules
Use one panel, not two permanent tall columns of duplicate details. Keep the existing working tab implementation, or improve its semantics in place. Preserve selection/freshness state when moving presentation components. User-selected tabs do not change just because a delayed API response arrives.

An explicit source/order click can switch to Evidence. Completing a generation can indicate that the report is ready, but must not seize keyboard focus or undo an intentional selection.

### AI report
Use 18/28 actual provider narrative, full panel reading width with a 65ch maximum. Use a modest provider label and actual model metadata at 14px; do not add a huge avatar, "thinking" transcript, or a blank chat composer.

Render actual completed report text safely through the existing implementation. Long reports remain available without clipping. Do not change the provider prompt or impose a new output word budget during this design task. Where the existing structured response already supports a summary, show it first and expose remaining sections accessibly.

Place scope-aware validation information after the narrative in a compact, aligned definition list, not a wall of colored pills. Label the dimension: engine-fact traceability, required findings covered, explanation references, evidence gates. Only show metrics implemented and backed by real results. Make n/N legible. N/A is not 100%. Expand gate details on request.

Keep the existing narrative review caveat visible next to these metrics, at least 16px. Do not label the complete model narrative "verified facts" merely because its references resolve. Keep the engine-owned plan verdict outside the AI bubble.

Idle/error/disabled states are concise at 16px. Do not create a large empty panel filled with instructions. Actual loading activity remains real and concise. No provider response is required to use the rest of the app.

### Evidence
Lead with a clear 24/32 conclusion and one clean calculation inset. Use 16px labels and 20–24px important derived values. Do not repeat the same conclusion in a banner, nested card and paragraph immediately below one another.

Use a definition-list-like arrangement for picking completion, packing assumption, modeled readiness and departure. Source links have a descriptive label and >=44px standalone target. Exact record/column data appears in 14px metadata. Keep the existing distinction between clock offsets and durations.

Move full raw-value cards into one grouped "Source inputs" section. Keep each relevant field and link available; reducing boxes must not remove provenance.

Missing-data evidence shows the actual missing value and a short reason evaluation is blocked. It must not show leftover generated timing, calculated packing bars, or green pass cues.

## 6. Secondary information

### Findings
Required violations/diagnostics remain discoverable without opening a generic advanced section. Use 16px titles, one concise explanatory line, and 14px rule metadata only in details. Auto-selected leading findings can use the existing selection behavior.

A full list of passing rules is collapsed by default. Use its actual count. No rewording of a blocked check into a passed check.

### Submitted plan and raw sources
These are inspection tools, not the default visual centerpiece. Use accessible disclosures. The normal submitted-plan table uses 16px cells; raw CSV tables can use 14px. Preserve semantic headers, right-aligned numeric columns and tabular numerals.

Source navigation must expand the raw-source disclosure, choose the appropriate table and target the real cell. Retain the exact CSV record numbering. The highlighted cell has a visible outline and a textual indication of the selected record/column, not just a faint fill.

Use local table scrolling and a useful minimum content width rather than tiny fonts. Make scroll regions keyboard-operable and named where necessary. Avoid nested sticky headers that cover content.

### Assumptions
Keep a compact visible scope sentence near the schedule. Consolidate the long, repeated assumption prose in one disclosure. Preserve every original limitation's meaning. A failed plan, missing required data, or the AI narrative review caveat is not a minor limitation to hide here.

## 7. Visual finish

Use one shared 12px panel radius and a barely visible panel shadow. Use 8px inset/control radius. Keep neutral backgrounds distinct but subtle. Bold only headings, important outcomes, and selected values. Use fewer outlines and more aligned whitespace.

No bento-grid redesign, 3D scene, animation library, gradients, illustrated hero, new brand theme, new font dependency, decorative KPI cards, or extra AI features. The result should look like a considered operational application, not a marketing page.

Measure before/after styles and inspect screenshots; do not claim this specification itself makes the live app better.
