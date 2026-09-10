# OpsCheck proposed palette — calculated contrast

Approved opaque sRGB token pairs only; NOT an audit of the rendered OpsCheck UI.

Displayed ratios rounded to 2 decimals; pass/fail uses the unrounded ratio.

**Result: 34/34 approved pair checks pass their declared thresholds.**

| Role | Foreground | Background | Ratio | Threshold | Result |
|---|---|---|---:|---:|---|
| Primary prose | #0F172A | #FFFFFF | 17.85:1 | 7:1 | PASS |
| Supporting text | #475569 | #FFFFFF | 7.58:1 | 4.5:1 | PASS |
| Metadata | #526277 | #FFFFFF | 6.23:1 | 4.5:1 | PASS |
| Necessary control border | #738398 | #FFFFFF | 3.87:1 | 3:1 | PASS |
| Focus ring outside light control | #1D4ED8 | #FFFFFF | 6.70:1 | 3:1 | PASS |
| Primary prose | #0F172A | #F6F8FB | 16.78:1 | 7:1 | PASS |
| Supporting text | #475569 | #F6F8FB | 7.12:1 | 4.5:1 | PASS |
| Metadata | #526277 | #F6F8FB | 5.85:1 | 4.5:1 | PASS |
| Necessary control border | #738398 | #F6F8FB | 3.64:1 | 3:1 | PASS |
| Focus ring outside light control | #1D4ED8 | #F6F8FB | 6.30:1 | 3:1 | PASS |
| Primary prose | #0F172A | #F1F5F9 | 16.30:1 | 7:1 | PASS |
| Supporting text | #475569 | #F1F5F9 | 6.92:1 | 4.5:1 | PASS |
| Metadata | #526277 | #F1F5F9 | 5.68:1 | 4.5:1 | PASS |
| Necessary control border | #738398 | #F1F5F9 | 3.53:1 | 3:1 | PASS |
| Focus ring outside light control | #1D4ED8 | #F1F5F9 | 6.12:1 | 3:1 | PASS |
| Button text | #FFFFFF | #0E7490 | 5.36:1 | 4.5:1 | PASS |
| Button hover text | #FFFFFF | #155E75 | 7.27:1 | 4.5:1 | PASS |
| Link / picking edge | #0E7490 | #FFFFFF | 5.36:1 | 4.5:1 | PASS |
| Selected text / packing edge | #0E7490 | #EAF6F8 | 4.86:1 | 4.5:1 | PASS |
| Selected control border | #738398 | #EAF6F8 | 3.51:1 | 3:1 | PASS |
| Selection focus | #1D4ED8 | #EAF6F8 | 6.07:1 | 3:1 | PASS |
| Success label / icon | #166534 | #F0FDF4 | 6.81:1 | 4.5:1 | PASS |
| Warning label / icon | #92400E | #FFFBEB | 6.84:1 | 4.5:1 | PASS |
| Violation label / overrun | #B42318 | #FEF3F2 | 6.05:1 | 4.5:1 | PASS |
| Information label | #1D4ED8 | #EFF6FF | 6.16:1 | 4.5:1 | PASS |
| Success on white | #166534 | #FFFFFF | 7.13:1 | 4.5:1 | PASS |
| Warning on white | #92400E | #FFFFFF | 7.09:1 | 4.5:1 | PASS |
| Violation on white | #B42318 | #FFFFFF | 6.57:1 | 4.5:1 | PASS |
| White text on readiness badge | #FFFFFF | #166534 | 7.13:1 | 4.5:1 | PASS |
| White text on violation badge | #FFFFFF | #B42318 | 6.57:1 | 4.5:1 | PASS |
| Neutral picking bar label | #FFFFFF | #475569 | 7.58:1 | 4.5:1 | PASS |
| Meaningful marker on track | #0F172A | #F1F5F9 | 16.30:1 | 3:1 | PASS |
| Picking against track | #0E7490 | #F1F5F9 | 4.89:1 | 3:1 | PASS |
| Overrun against selected track | #B42318 | #EAF6F8 | 5.96:1 | 3:1 | PASS |

Decorative divider #DCE3EC on white: 1.29:1. Intentionally not a necessary control boundary.

Repeat this check after token changes. Test actual rendered colors, states, opacity, backgrounds, labels and graphical roles separately. No full accessibility certification is implied.

Method/source: WCAG 2.2 relative luminance and contrast definitions: https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio
