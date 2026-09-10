import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AUTHORIZED_SCENARIO_IDS } from '@/briefing/contracts';
import { fingerprintBundle } from '@/briefing/fingerprint';
import { generateBriefing } from '@/briefing/generate';
import { loadScenario } from '@/fixtures/loadScenario';
import { liveProvider, readConfig } from '@/server/anthropic-briefing';

/**
 * LIVE, BILLABLE smoke test. Never part of `npm test`, `npm run build`, or the
 * Playwright suite. Run deliberately with `npm run smoke:ai`.
 *
 * At most one call per authorized scenario, three total, with no retries. It
 * records the model, completion status, gate outcomes, and token usage. It
 * never prints the key, the .env.local contents, or raw provider text.
 *
 * A successful smoke call is evidence that the integration works once. It is
 * not statistical calibration and says nothing about model reliability.
 */

/** Minimal .env.local loader: values are set, never logged. */
function loadEnvLocal(): void {
  const path = fileURLToPath(new URL('../.env.local', import.meta.url));
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return; // Absent is a valid state; the test reports NOT RUN.
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvLocal();
const config = readConfig();
const ready = config.enabled && config.configured;

describe.skipIf(!ready)('live Anthropic smoke (billable, no retries)', () => {
  for (const scenarioId of AUTHORIZED_SCENARIO_IDS) {
    it(
      scenarioId + ' produces a real provider response and a recorded gate outcome',
      async () => {
        const fingerprint = await fingerprintBundle(loadScenario(scenarioId));

        const result = await generateBriefing({
          scenarioId,
          requestedFingerprint: fingerprint,
          provider: liveProvider,
        });

        // Recorded evidence, with no secrets and no raw untrusted content.
        const record = {
          scenarioId,
          outcome: result.outcome,
          model: result.provider?.model ?? null,
          stopReason: result.provider?.stopReason ?? null,
          usage: result.provider?.usage ?? null,
          gates: result.gates.map((g) => g.id + '=' + g.status),
          message: result.message,
          traceability: result.briefing?.metrics.traceability ?? null,
          requiredFindings: result.briefing?.metrics.requiredFindings ?? null,
        };
        console.log('LIVE SMOKE ' + JSON.stringify(record));

        // The call must reach a real, recorded decision. A withheld outcome is
        // a legitimate result: the gates did their job. What must NOT happen is
        // a fabricated report or an unhandled crash.
        expect(['verified', 'withheld', 'unavailable']).toContain(result.outcome);
        if (result.outcome === 'verified') {
          expect(result.briefing).not.toBeNull();
          expect(result.gates.every((g) => g.status === 'PASSED')).toBe(true);
        } else {
          expect(result.briefing).toBeNull();
        }
      },
      60_000,
    );
  }
});

describe.skipIf(ready)('live Anthropic smoke is not configured', () => {
  it('reports LIVE API NOT RUN without failing the suite', () => {
    console.log(
      'LIVE API NOT RUN: ' +
        (config.enabled
          ? 'OPSCHECK_AI_ENABLED is true but no ANTHROPIC_API_KEY is set.'
          : 'OPSCHECK_AI_ENABLED is not true.') +
        ' No billable call was made.',
    );
    expect(ready).toBe(false);
  });
});
