import { describe, expect, it } from 'vitest';
import { evaluateBundle } from '@/domain/evaluateBundle';
import type { EvaluationReport } from '@/domain/types';
import { loadScenario } from '@/fixtures/loadScenario';
import { buildCatalog } from '@/briefing/catalog';
import {
  SELECTION_SCHEMA_VERSION,
  type AuthorizedScenarioId,
  type BriefingSelection,
} from '@/briefing/contracts';
import { fingerprintBundle, serializeBundle } from '@/briefing/fingerprint';
import { generateBriefing } from '@/briefing/generate';
import { isPublishable, renderBriefing } from '@/briefing/render';
import { validateSelection, type ProviderCompletion } from '@/briefing/validate';

/**
 * Adversarial publication-gate tests.
 *
 * Every case here is a plausible-looking model payload that must NOT be
 * published. None of them requires a provider call: the gates are pure
 * functions over untrusted input, the catalog, and the real engine result.
 */

async function context(scenarioId: AuthorizedScenarioId) {
  const bundle = loadScenario(scenarioId);
  const fingerprint = await fingerprintBundle(bundle);
  const report = evaluateBundle(bundle);
  const catalog = buildCatalog(report, scenarioId, fingerprint);
  return { bundle, fingerprint, report, catalog };
}

/** A selection the engine would accept, built from the real catalog. */
function goodSelection(
  fingerprint: string,
  catalog: ReturnType<typeof buildCatalog>,
  report: EvaluationReport,
): BriefingSelection {
  const lead = catalog.facts.find((f) => f.leadEligible);
  if (!lead) throw new Error('no lead-eligible fact for this run');
  const applicable = catalog.reviewSteps.filter((s) => s.applicable).map((s) => s.id);
  void report;
  return {
    schemaVersion: SELECTION_SCHEMA_VERSION,
    inputFingerprint: fingerprint,
    leadFactId: lead.id,
    orderedFindingFactIds: [...catalog.requiredFindingIds],
    contextFactIds: [],
    reviewStepIds: applicable.slice(0, 2),
    detailLevel: 'explained',
  };
}

function completion(payload: unknown): ProviderCompletion {
  return {
    rawText: typeof payload === 'string' ? payload : JSON.stringify(payload),
    stopReason: 'end_turn',
    model: 'claude-haiku-4-5-20251001',
    usage: { inputTokens: 100, outputTokens: 50 },
  };
}

async function validateWith(
  scenarioId: AuthorizedScenarioId,
  mutate: (selection: BriefingSelection) => unknown,
) {
  const { fingerprint, report, catalog } = await context(scenarioId);
  const payload = mutate(goodSelection(fingerprint, catalog, report));
  return validateSelection({
    completion: completion(payload),
    catalog,
    report,
    serverFingerprint: fingerprint,
  });
}

// ---- Accepted paths ------------------------------------------------------

describe('accepted briefings for real engine results', () => {
  for (const scenarioId of ['S00', 'S01', 'S02'] as const) {
    it(scenarioId + ' accepts a well-formed selection and publishes', async () => {
      const { fingerprint, report, catalog } = await context(scenarioId);
      const selection = goodSelection(fingerprint, catalog, report);
      const result = validateSelection({
        completion: completion(selection),
        catalog,
        report,
        serverFingerprint: fingerprint,
      });

      expect(result.ok).toBe(true);
      expect(result.gates.every((g) => g.status === 'PASSED')).toBe(true);

      const briefing = renderBriefing(selection, catalog, report, result.gates);
      expect(briefing).not.toBeNull();
      expect(isPublishable(briefing!.metrics)).toBe(true);
      // The verdict is engine-owned, never model-influenced.
      expect(briefing!.verdict.dataStatus).toBe(report.dataStatus);
      expect(briefing!.verdict.planStatus).toBe(report.planStatus);
      expect(briefing!.verdict.checkCounts).toStrictEqual(report.checkCounts);
      // Renderer-owned scope disclosures are always present.
      expect(briefing!.assumptions.length).toBeGreaterThan(0);
      expect(briefing!.limitations.length).toBeGreaterThan(0);
    });
  }

  it('S01 renders the miss with correct units and resolvable sources', async () => {
    const { fingerprint, report, catalog } = await context('S01');
    const selection = goodSelection(fingerprint, catalog, report);
    const result = validateSelection({
      completion: completion(selection),
      catalog,
      report,
      serverFingerprint: fingerprint,
    });
    const briefing = renderBriefing(selection, catalog, report, result.gates)!;

    const finding = briefing.findings[0];
    expect(finding.text).toContain('O-104');
    // A duration is never rendered as a time of day.
    expect(finding.detail).toContain('30 min');
    expect(finding.detail).not.toContain('08:30');
    // A clock offset keeps its clock rendering.
    expect(finding.detail).toContain('08:45');
    expect(finding.detail).toContain('assumed fixed delay');

    // Source chips resolve into the actual snapshot.
    const cells = finding.sources.map((s) => s.source);
    expect(cells).toContainEqual({
      table: 'plan',
      fileName: 'plan.csv',
      recordNumber: 5,
      column: 'end_minute',
      rawValue: '45',
    });
  });

  it('S02 requires the data diagnostic and never reports an operational pass', async () => {
    const { report, catalog } = await context('S02');
    expect(catalog.requiredFindingIds.length).toBeGreaterThan(0);
    expect(report.planStatus).toBe('NOT_EVALUATED');
    // Only the diagnostic may lead when data blocks evaluation.
    const leadEligible = catalog.facts.filter((f) => f.leadEligible);
    expect(leadEligible.every((f) => f.kind === 'diagnostic')).toBe(true);
  });

  it('S00 has no required findings and reports that honestly', async () => {
    const { fingerprint, report, catalog } = await context('S00');
    expect(catalog.requiredFindingIds).toStrictEqual([]);
    const selection = goodSelection(fingerprint, catalog, report);
    const result = validateSelection({
      completion: completion(selection),
      catalog,
      report,
      serverFingerprint: fingerprint,
    });
    const briefing = renderBriefing(selection, catalog, report, result.gates)!;
    // Zero required findings is "none required", not a 0/0 perfect score.
    expect(briefing.metrics.requiredFindings).toStrictEqual({ included: 0, total: 0 });
    expect(briefing.metrics.traceability.total).toBeGreaterThan(0);
  });
});

// ---- Rejections: invented content ---------------------------------------

describe('invented content is rejected outright', () => {
  it('rejects an added confidence score', async () => {
    const result = await validateWith('S01', (s) => ({ ...s, confidence: 0.99 }));
    expect(result.ok).toBe(false);
    expect(result.gates[0].codes).toContain('UNKNOWN_PROPERTY');
  });

  it('rejects an attempted verdict override', async () => {
    const result = await validateWith('S01', (s) => ({ ...s, verdict: 'APPROVED' }));
    expect(result.ok).toBe(false);
    expect(result.gates[0].codes).toContain('UNKNOWN_PROPERTY');
  });

  it('rejects added free text', async () => {
    const result = await validateWith('S01', (s) => ({
      ...s,
      summary: 'Move the truck ten minutes later and the warehouse is fixed.',
    }));
    expect(result.ok).toBe(false);
    expect(result.gates[0].codes).toContain('UNKNOWN_PROPERTY');
  });

  it('rejects an invented number', async () => {
    const result = await validateWith('S01', (s) => ({ ...s, estimatedSavingsMinutes: 12 }));
    expect(result.ok).toBe(false);
    expect(result.gates[0].codes).toContain('UNKNOWN_PROPERTY');
  });

  it('rejects malformed JSON', async () => {
    const { fingerprint, report, catalog } = await context('S01');
    const result = validateSelection({
      completion: completion('{ not json'),
      catalog,
      report,
      serverFingerprint: fingerprint,
    });
    expect(result.ok).toBe(false);
    expect(result.gates[0].codes).toContain('SCHEMA_INVALID');
  });
});

// ---- Rejections: catalog and coverage -----------------------------------

describe('catalog membership and coverage are enforced', () => {
  it('rejects an unknown fact id', async () => {
    const result = await validateWith('S01', (s) => ({
      ...s,
      orderedFindingFactIds: ['fact.check.does-not-exist'],
    }));
    expect(result.ok).toBe(false);
    expect(result.gates[2].codes).toContain('UNKNOWN_FACT_ID');
  });

  it('rejects a context-only fact used as a finding', async () => {
    const { fingerprint, report, catalog } = await context('S01');
    const contextOnly = catalog.facts.find(
      (f) => f.sections.includes('context') && !f.sections.includes('finding'),
    )!;
    const selection = goodSelection(fingerprint, catalog, report);
    const result = validateSelection({
      completion: completion({
        ...selection,
        orderedFindingFactIds: [...selection.orderedFindingFactIds, contextOnly.id],
      }),
      catalog,
      report,
      serverFingerprint: fingerprint,
    });
    expect(result.ok).toBe(false);
    expect(result.gates[2].codes).toContain('WRONG_SECTION');
  });

  it('rejects an omitted mandatory finding', async () => {
    const result = await validateWith('S01', (s) => ({ ...s, orderedFindingFactIds: [] }));
    expect(result.ok).toBe(false);
    expect(result.gates[3].codes).toContain('MISSING_REQUIRED_FINDING');
    expect(result.message).toContain('required finding was omitted');
  });

  it('rejects a duplicated finding', async () => {
    const result = await validateWith('S01', (s) => ({
      ...s,
      orderedFindingFactIds: [...s.orderedFindingFactIds, ...s.orderedFindingFactIds],
    }));
    expect(result.ok).toBe(false);
    expect(result.gates[2].codes).toContain('DUPLICATE_ID');
  });

  it('rejects an omitted blocker on a missing-data run', async () => {
    const result = await validateWith('S02', (s) => ({ ...s, orderedFindingFactIds: [] }));
    expect(result.ok).toBe(false);
    expect(result.gates[3].codes).toContain('MISSING_REQUIRED_FINDING');
  });
});

// ---- Rejections: verdict, snapshot, review ------------------------------

describe('verdict, snapshot, and review applicability are enforced', () => {
  it('rejects a pass-themed lead on a failed plan', async () => {
    const result = await validateWith('S01', (s) => ({ ...s, leadFactId: 'fact.run_summary' }));
    expect(result.ok).toBe(false);
    expect(result.gates[5].codes).toContain('LEAD_NOT_ELIGIBLE');
    expect(result.message).toContain('headline did not match the engine verdict');
  });

  it('rejects a pass-themed lead on a blocked-data run', async () => {
    const result = await validateWith('S02', (s) => ({ ...s, leadFactId: 'fact.run_summary' }));
    expect(result.ok).toBe(false);
    expect(result.gates[5].codes).toContain('LEAD_NOT_ELIGIBLE');
  });

  it('rejects a stale fingerprint with no provider call', async () => {
    const result = await validateWith('S01', (s) => ({
      ...s,
      inputFingerprint: 'a'.repeat(64),
    }));
    expect(result.ok).toBe(false);
    expect(result.gates[1].codes).toContain('FINGERPRINT_MISMATCH');
  });

  it('rejects an unknown review step id', async () => {
    const result = await validateWith('S01', (s) => ({
      ...s,
      reviewStepIds: ['DISPATCH_THE_TRUCK'],
    }));
    expect(result.ok).toBe(false);
    expect(result.gates[6].codes).toContain('UNKNOWN_REVIEW_STEP');
  });

  it('rejects a real review step whose applicability predicate is false', async () => {
    // NO_ACTION_RECORD_RUN only applies to a clean run, never to S01.
    const result = await validateWith('S01', (s) => ({
      ...s,
      reviewStepIds: ['NO_ACTION_RECORD_RUN'],
    }));
    expect(result.ok).toBe(false);
    expect(result.gates[6].codes).toContain('REVIEW_STEP_NOT_APPLICABLE');
  });

  it('reports later gates as not-applicable rather than passed after a failure', async () => {
    const result = await validateWith('S01', (s) => ({ ...s, orderedFindingFactIds: [] }));
    const after = result.gates.slice(4);
    expect(after.every((g) => g.status === 'NOT_APPLICABLE')).toBe(true);
    expect(result.gates.some((g) => g.status === 'PASSED' && g.id === 'PROVENANCE')).toBe(false);
  });
});

// ---- Rejections: provider completion states -----------------------------

describe('provider completion states are handled explicitly', () => {
  const cases: Array<[string, Partial<ProviderCompletion>]> = [
    ['refusal', { stopReason: 'refusal' }],
    ['truncation', { stopReason: 'max_tokens' }],
    ['unsupported stop reason', { stopReason: 'pause_turn' }],
    ['missing stop reason', { stopReason: null }],
    ['empty content', { rawText: '' }],
  ];

  for (const [name, override] of cases) {
    it('withholds on ' + name, async () => {
      const { fingerprint, report, catalog } = await context('S01');
      const selection = goodSelection(fingerprint, catalog, report);
      const result = validateSelection({
        completion: { ...completion(selection), ...override },
        catalog,
        report,
        serverFingerprint: fingerprint,
      });
      expect(result.ok).toBe(false);
      expect(result.gates[0].codes).toContain('PROVIDER_INCOMPLETE');
      expect(result.gates.every((g) => g.status !== 'PASSED')).toBe(true);
    });
  }
});

// ---- Provenance ----------------------------------------------------------

describe('provenance rejects unresolvable evidence', () => {
  it('rejects a fact whose cited raw value no longer matches', async () => {
    const { fingerprint, report, catalog } = await context('S01');
    const selection = goodSelection(fingerprint, catalog, report);

    const tampered = {
      ...catalog,
      facts: catalog.facts.map((fact) =>
        fact.required
          ? {
              ...fact,
              evidence: fact.evidence.map((e) =>
                e.kind === 'cell' ? { ...e, rawValue: '999' } : e,
              ),
            }
          : fact,
      ),
    };

    const result = validateSelection({
      completion: completion(selection),
      catalog: tampered,
      report,
      serverFingerprint: fingerprint,
    });
    expect(result.ok).toBe(false);
    expect(result.gates[4].codes).toContain('EVIDENCE_VALUE_MISMATCH');
  });

  it('rejects a fact whose cited record does not exist', async () => {
    const { fingerprint, report, catalog } = await context('S01');
    const selection = goodSelection(fingerprint, catalog, report);

    const tampered = {
      ...catalog,
      facts: catalog.facts.map((fact) =>
        fact.required
          ? {
              ...fact,
              evidence: fact.evidence.map((e) =>
                e.kind === 'cell' ? { ...e, recordNumber: 9999 } : e,
              ),
            }
          : fact,
      ),
    };

    const result = validateSelection({
      completion: completion(selection),
      catalog: tampered,
      report,
      serverFingerprint: fingerprint,
    });
    expect(result.ok).toBe(false);
    expect(result.gates[4].codes).toContain('EVIDENCE_UNRESOLVED');
  });
});

// ---- Metrics honesty -----------------------------------------------------

describe('metrics cannot be gamed', () => {
  it('an empty factual manifest is not publishable', () => {
    expect(
      isPublishable({
        traceability: { verified: 0, total: 0 },
        requiredFindings: { included: 0, total: 0 },
        gates: { passed: 7, applicable: 7, results: [] },
      }),
    ).toBe(false);
  });

  it('a missing required finding cannot be offset by other successes', () => {
    expect(
      isPublishable({
        traceability: { verified: 5, total: 5 },
        requiredFindings: { included: 1, total: 2 },
        gates: { passed: 7, applicable: 7, results: [] },
      }),
    ).toBe(false);
  });

  it('a failed gate is never publishable', () => {
    expect(
      isPublishable({
        traceability: { verified: 3, total: 3 },
        requiredFindings: { included: 1, total: 1 },
        gates: { passed: 6, applicable: 7, results: [] },
      }),
    ).toBe(false);
  });

  it('counts the lead once when it repeats a finding', async () => {
    const { fingerprint, report, catalog } = await context('S01');
    const selection = goodSelection(fingerprint, catalog, report);
    // Lead intentionally repeats the detail finding.
    const withRepeat = { ...selection, leadFactId: selection.orderedFindingFactIds[0] };
    const result = validateSelection({
      completion: completion(withRepeat),
      catalog,
      report,
      serverFingerprint: fingerprint,
    });
    expect(result.ok).toBe(true);
    const briefing = renderBriefing(withRepeat, catalog, report, result.gates)!;
    expect(briefing.metrics.traceability.total).toBe(
      new Set([withRepeat.leadFactId, ...withRepeat.orderedFindingFactIds]).size,
    );
  });
});

// ---- Fingerprint ---------------------------------------------------------

describe('input fingerprint binds content, not presentation', () => {
  it('is stable for the same scenario loaded twice', async () => {
    const a = await fingerprintBundle(loadScenario('S01'));
    const b = await fingerprintBundle(loadScenario('S01'));
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('differs between scenarios', async () => {
    const s00 = await fingerprintBundle(loadScenario('S00'));
    const s01 = await fingerprintBundle(loadScenario('S01'));
    expect(s00).not.toBe(s01);
  });

  it('changes when any raw cell changes', async () => {
    const bundle = loadScenario('S01');
    const before = await fingerprintBundle(bundle);
    const orders = bundle.files.orders!;
    const mutated = {
      ...bundle,
      files: { ...bundle.files, orders: { ...orders, csvText: orders.csvText + '\n' } },
    };
    expect(await fingerprintBundle(mutated)).not.toBe(before);
  });

  it('serializes deterministically regardless of object construction order', () => {
    const a = loadScenario('S01');
    const b = loadScenario('S01');
    expect(serializeBundle(a)).toBe(serializeBundle(b));
  });
});

// ---- Pipeline with an injected provider ---------------------------------

describe('generation pipeline with an injected provider', () => {
  it('never calls the provider for a stale fingerprint', async () => {
    let called = false;
    const result = await generateBriefing({
      scenarioId: 'S01',
      requestedFingerprint: 'b'.repeat(64),
      provider: async () => {
        called = true;
        throw new Error('should not be reached');
      },
    });
    expect(called).toBe(false);
    expect(result.outcome).toBe('stale');
    expect(result.briefing).toBeNull();
    expect(result.gates.every((g) => g.status === 'NOT_APPLICABLE')).toBe(true);
  });

  it('reports unavailable without fabricating a report when the call fails', async () => {
    const fingerprint = await fingerprintBundle(loadScenario('S01'));
    const result = await generateBriefing({
      scenarioId: 'S01',
      requestedFingerprint: fingerprint,
      provider: async () => {
        throw new Error('The request to Anthropic timed out.');
      },
    });
    expect(result.outcome).toBe('unavailable');
    expect(result.briefing).toBeNull();
    expect(result.message).toContain('Plan checks are unchanged');
  });

  it('withholds a bare V1 selection: the pipeline now requires the V2 envelope', async () => {
    const bundle = loadScenario('S01');
    const fingerprint = await fingerprintBundle(bundle);
    const report = evaluateBundle(bundle);
    const catalog = buildCatalog(report, 'S01', fingerprint);

    const result = await generateBriefing({
      scenarioId: 'S01',
      requestedFingerprint: fingerprint,
      provider: async (digest) => {
        expect(digest.inputFingerprint).toBe(fingerprint);
        // A model-style V1 selection with no narrative at all.
        return completion(goodSelection(fingerprint, catalog, report));
      },
    });

    // The deterministic evidence still publishes; only the prose is withheld.
    expect(result.outcome).toBe('withheld');
    expect(result.briefing).not.toBeNull();
    expect(result.briefing!.verdict.planStatus).toBe('VIOLATIONS');
    expect(result.narrative!.checks[0].status).toBe('FAILED');
  });

  it('withholds a hallucinated field even though the payload looks polished', async () => {
    const bundle = loadScenario('S01');
    const fingerprint = await fingerprintBundle(bundle);
    const report = evaluateBundle(bundle);
    const catalog = buildCatalog(report, 'S01', fingerprint);

    const result = await generateBriefing({
      scenarioId: 'S01',
      requestedFingerprint: fingerprint,
      provider: async () =>
        completion({
          ...goodSelection(fingerprint, catalog, report),
          confidence: 0.99,
          verdict: 'APPROVED',
        }),
    });

    expect(result.outcome).toBe('withheld');
    expect(result.briefing).toBeNull();
    expect(result.provider).not.toBeNull();
  });

  it('only sends catalog ids, labels and sections to the provider', async () => {
    const fingerprint = await fingerprintBundle(loadScenario('S01'));
    let sent: unknown = null;
    await generateBriefing({
      scenarioId: 'S01',
      requestedFingerprint: fingerprint,
      provider: async (digest) => {
        sent = digest;
        throw new Error('stop after capture');
      },
    });

    const serialized = JSON.stringify(sent);
    // No raw CSV text and no API key material ever leaves the process.
    expect(serialized).not.toContain('order_id,');
    expect(serialized).not.toContain('sk-ant');
    expect(Object.keys(sent as object).sort()).toStrictEqual([
      'applicableReviewStepIds',
      'catalogVersion',
      'facts',
      'inputFingerprint',
      'requiredFindingIds',
      'verdict',
    ]);
  });
});
