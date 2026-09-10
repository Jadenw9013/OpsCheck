/**
 * Dependency-free verification of the approved flat-color token pairs.
 * Run: node opscheck-design-system/check-contrast.mjs [--json|--markdown]
 * Reads adjacent opscheck-tokens.css. Does not inspect the real application.
 * Formula: WCAG relative luminance and contrast of opaque sRGB colors.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const cssPath = fileURLToPath(new URL('./opscheck-tokens.css', import.meta.url));
const css = readFileSync(cssPath, 'utf8');
const colors = new Map([...css.matchAll(/--ops-([a-z-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)]
  .map((m) => [m[1], m[2].toUpperCase()]));
function color(name) {
  const value = colors.get(name);
  if (!value) throw new Error(`Missing opaque hex token: --ops-${name}`);
  return value;
}
function luminance(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`Invalid color: ${hex}`);
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const linear = channels.map((n) => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}
function contrast(a, b) {
  const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (high + 0.05) / (low + 0.05);
}
const specs = [];
for (const bg of ['surface', 'canvas', 'surface-subtle']) {
  specs.push(['Primary prose', 'ink', bg, 7]);
  specs.push(['Supporting text', 'ink-secondary', bg, 4.5]);
  specs.push(['Metadata', 'ink-muted', bg, 4.5]);
  specs.push(['Necessary control border', 'border-control', bg, 3]);
  specs.push(['Focus ring outside light control', 'focus', bg, 3]);
}
specs.push(
  ['Button text', 'on-accent', 'accent', 4.5],
  ['Button hover text', 'on-accent', 'accent-hover', 4.5],
  ['Link / picking edge', 'accent', 'surface', 4.5],
  ['Selected text / packing edge', 'accent', 'accent-surface', 4.5],
  ['Selected control border', 'border-control', 'accent-surface', 3],
  ['Selection focus', 'focus', 'accent-surface', 3],
  ['Success label / icon', 'success', 'success-surface', 4.5],
  ['Warning label / icon', 'warning', 'warning-surface', 4.5],
  ['Violation label / overrun', 'danger', 'danger-surface', 4.5],
  ['Information label', 'info', 'info-surface', 4.5],
  ['Success on white', 'success', 'surface', 4.5],
  ['Warning on white', 'warning', 'surface', 4.5],
  ['Violation on white', 'danger', 'surface', 4.5],
  ['White text on readiness badge', 'on-accent', 'success', 4.5],
  ['White text on violation badge', 'on-accent', 'danger', 4.5],
  ['Neutral picking bar label', 'on-accent', 'ink-secondary', 4.5],
  ['Meaningful marker on track', 'ink', 'surface-subtle', 3],
  ['Picking against track', 'accent', 'surface-subtle', 3],
  ['Overrun against selected track', 'danger', 'accent-surface', 3]
);
const checks = specs.map(([role, fg, bg, threshold]) => {
  const foreground = color(fg), background = color(bg);
  const ratio = contrast(foreground, background);
  return { role, foregroundToken: `--ops-${fg}`, backgroundToken: `--ops-${bg}`,
    foreground, background, ratio, threshold, passed: ratio >= threshold };
});
const report = {
  scope: 'Approved opaque sRGB token pairs only; NOT an audit of the rendered OpsCheck UI.',
  rounding: 'Displayed ratios rounded to 2 decimals; pass/fail uses the unrounded ratio.',
  decorativeDivider: {
    color: color('border-decorative'),
    contrastOnWhite: contrast(color('border-decorative'), color('surface')),
    excludedFromRequiredPairs: true,
    reason: 'Decorative separation only. Never use as the sole necessary control boundary.'
  },
  passed: checks.filter((c) => c.passed).length,
  total: checks.length,
  checks
};
const flag = process.argv[2];
if (flag === '--json') {
  console.log(JSON.stringify(report, null, 2));
} else if (flag === '--markdown') {
  console.log('# OpsCheck proposed palette — calculated contrast\n');
  console.log(report.scope + '\n');
  console.log(report.rounding + '\n');
  console.log(`**Result: ${report.passed}/${report.total} approved pair checks pass their declared thresholds.**\n`);
  console.log('| Role | Foreground | Background | Ratio | Threshold | Result |');
  console.log('|---|---|---|---:|---:|---|');
  for (const c of checks) console.log(`| ${c.role} | ${c.foreground} | ${c.background} | ${c.ratio.toFixed(2)}:1 | ${c.threshold}:1 | ${c.passed ? 'PASS' : 'FAIL'} |`);
  console.log(`\nDecorative divider ${report.decorativeDivider.color} on white: ${report.decorativeDivider.contrastOnWhite.toFixed(2)}:1. Intentionally not a necessary control boundary.\n`);
  console.log('Repeat this check after token changes. Test actual rendered colors, states, opacity, backgrounds, labels and graphical roles separately. No full accessibility certification is implied.\n');
  console.log('Method/source: WCAG 2.2 relative luminance and contrast definitions: https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio');
} else if (flag) {
  console.error('Usage: node check-contrast.mjs [--json|--markdown]');
  process.exitCode = 2;
} else {
  console.table(checks.map((c) => ({role: c.role, fg: c.foreground, bg: c.background, ratio: c.ratio.toFixed(2), threshold: c.threshold, pass: c.passed})));
  console.log(`${report.passed}/${report.total} checks passed. Token pairs only, not a rendered-page audit.`);
}
if (report.passed !== report.total) process.exitCode = 1;
