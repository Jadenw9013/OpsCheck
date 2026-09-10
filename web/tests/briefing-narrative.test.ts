import { describe, expect, it } from 'vitest';
import { evaluateBundle } from '@/domain/evaluateBundle';
import type { EvaluationReport } from '@/domain/types';
import { loadScenario } from '@/fixtures/loadScenario';
import { buildCatalog } from '@/briefing/catalog';
import {
  AI_REPORT_SCHEMA_VERSION,
  SELECTION_SCHEMA_VERSION,
  type AuthorizedScenarioId,
  type BriefingSelection,
} from '@/briefing/contracts';
import { fingerprintBundle } from '@/briefing/fingerprint';
import { generateBriefing } from '@/briefing/generate';
import { validateNarrative } from '@/briefing/validate-narrative';
import { uniqueFactualIds, type ProviderCompletion } from '@/briefing/validate';

/**
 * V2 envelope tests: actual provider prose plus structural/reference checks.
 *
 * The V1 evidence contract is unchanged and its tests still stand. Here the
 * question is narrower: does genuine model text survive intact, and are its
 * references checked without ever being described as semantic proof?
 */

async function context(scenarioId: AuthorizedScenarioId) {
  const bundle = loadScenario(scenarioId);
  const fingerprint = await fingerprintBundle(bundle);
  const report = evaluateBundle(bundle);
  const catalog = buildCatalog(report, scenarioId, fingerprint);
  return { bundle, fingerprint, report, catalog };
}

function goodSelection(
  fingerprint: string,
  catalog: ReturnType<typeof buildCatalog>,
  report: EvaluationReport,
): BriefingSelection {
  const lead = catalog.facts.find((f) => f.leadEligible);
  if (!lead) throw new Error('no lead-eligible fact');
  void report;
  return {
    schemaVersion: SELECTION_SCHEMA_VERSION,
    inputFingerprint: fingerprint,
    leadFactId: lead.id,
    orderedFindingFactIds: [...catalog.requiredFindingIds],
    contextFactIds: [],
    reviewStepIds: catalog.reviewSteps.filter((s) => s.applicable).map((s) => s.id).slice(0, 2),
    detailLevel: 'explained',
  };
}

/** Distinctive wording so a swapped-in template would be obvious. */
const OVERVIEW_PROSE =
  'The submitted plan was evaluated against the modeled rules, and one order does not reach its departure in time.';
const FINDING_PROSE =
  'Picking finishes before the assumed packing delay is added, which pushes the modeled ready time past the departure.';
const REVIEW_PROSE = 'Confirm the timing with operations before treating this as settled.';

function envelope(
  selection: BriefingSelection,
  catalog: ReturnType<typeof buildCatalog>,
  overrides: Record<string, unknown> = {},
) {
  return {
    schemaVersion: AI_REPORT_SCHEMA_VERSION,
    selection,
    narrative: {
      overview: { text: OVERVIEW_PROSE, factIds: [selection.leadFactId] },
      findings: catalog.requiredFindingIds.map((factId) => ({ factId, text: FINDING_PROSE })),
      reviewNotes: selection.reviewStepIds.slice(0, 1).map((reviewStepId) => ({
        reviewStepId,
        text: REVIEW_PROSE,
      })),
    },
    ...overrides,
  };
}

function completion(payload: unknown): ProviderCompletion {
  return {
    rawText: typeof payload === 'string' ? payload : JSON.stringify(payload),
    stopReason: 'end_turn',
    model: 'claude-haiku-4-5-20251001',
    usage: { inputTokens: 800, outputTokens: 140 },
    requestId: 'req_test',
  };
}

async function narrativeFor(
  scenarioId: AuthorizedScenarioId,
  mutate: (env: ReturnType<typeof envelope>) => unknown = (e) => e,
) {
  const { fingerprint, report, catalog } = await context(scenarioId);
  const selection = goodSelection(fingerprint, catalog, report);
  return validateNarrative({
    payload: mutate(envelope(selection, catalog)),
    catalog,
    displayedFactIds: uniqueFactualIds(selection),
    selectedReviewStepIds: selection.reviewStepIds,
  });
}

// ---- Genuine provider text survives --------------------------------------

describe('actual model-authored prose reaches the report intact', () => {
  it('renders the provider words, not a template substitute', async () => {
    const { fingerprint, catalog, report } = await context('S01');
    const selection = goodSelection(fingerprint, catalog, report);

    const result = await generateBriefing({
      scenarioId: 'S01',
      requestedFingerprint: fingerprint,
      provider: async () => completion(envelope(selection, catalog)),
    });

    expect(result.outcome).toBe('verified');
    expect(result.narrative).not.toBeNull();
    // Exact provider words, not application template text.
    expect(result.narrative!.overview.text).toBe(OVERVIEW_PROSE);
    expect(result.narrative!.findings[0].explanation).toBe(FINDING_PROSE);
    expect(result.narrative!.reviewNotes[0].explanation).toBe(REVIEW_PROSE);
    // The canonical engine statement is still carried separately.
    expect(result.briefing!.findings[0].text).toContain('O-104');
    expect(result.briefing!.findings[0].text).not.toBe(FINDING_PROSE);
  });

  it('normalizes whitespace only, preserving the wording', async () => {
    const result = await narrativeFor('S01', (e) => ({
      ...e,
      narrative: {
        ...e.narrative,
        overview: { ...e.narrative.overview, text: '  Spaced   out\n\ttext.  ' },
      },
    }));
    expect(result.ok).toBe(true);
  });

  it('records provider metadata including elapsed time', async () => {
    const { fingerprint, catalog, report } = await context('S01');
    const selection = goodSelection(fingerprint, catalog, report);
    const result = await generateBriefing({
      scenarioId: 'S01',
      requestedFingerprint: fingerprint,
      provider: async () => completion(envelope(selection, catalog)),
    });
    expect(result.provider!.requestId).toBe('req_test');
    expect(result.provider!.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(result.provider!.usage).toStrictEqual({ inputTokens: 800, outputTokens: 140 });
  });
});

// ---- V1 stays authoritative ----------------------------------------------

describe('the V1 evidence contract still governs', () => {
  it('good prose cannot rescue a bad selection', async () => {
    const { fingerprint, catalog, report } = await context('S01');
    const selection = goodSelection(fingerprint, catalog, report);
    // A selection that omits the required finding, with flawless narrative.
    const broken = { ...selection, orderedFindingFactIds: [] };

    const result = await generateBriefing({
      scenarioId: 'S01',
      requestedFingerprint: fingerprint,
      provider: async () => completion(envelope(broken, catalog)),
    });

    expect(result.outcome).toBe('withheld');
    expect(result.briefing).toBeNull();
    expect(result.narrative).toBeNull();
    expect(result.message).toContain('required finding was omitted');
  });

  it('rejects a confidence field smuggled into the selection', async () => {
    const { fingerprint, catalog, report } = await context('S01');
    const selection = goodSelection(fingerprint, catalog, report);
    const result = await generateBriefing({
      scenarioId: 'S01',
      requestedFingerprint: fingerprint,
      provider: async () =>
        completion(envelope({ ...selection, confidence: 0.99 } as never, catalog)),
    });
    expect(result.outcome).toBe('withheld');
    expect(result.briefing).toBeNull();
  });

  it('keeps the engine verdict authoritative across all three scenarios', async () => {
    for (const scenarioId of ['S00', 'S01', 'S02'] as const) {
      const { fingerprint, catalog, report } = await context(scenarioId);
      const selection = goodSelection(fingerprint, catalog, report);
      const result = await generateBriefing({
        scenarioId,
        requestedFingerprint: fingerprint,
        provider: async () => completion(envelope(selection, catalog)),
      });
      expect(result.outcome).toBe('verified');
      expect(result.briefing!.verdict.planStatus).toBe(report.planStatus);
      expect(result.briefing!.verdict.dataStatus).toBe(report.dataStatus);
      expect(result.briefing!.verdict.checkCounts).toStrictEqual(report.checkCounts);
      // Every mandatory finding is displayed canonically, not only paraphrased.
      expect(result.briefing!.findings.length).toBe(catalog.requiredFindingIds.length);
    }
  });
});

// ---- Narrative rejections -------------------------------------------------

describe('narrative structure and references are enforced', () => {
  it('rejects a citation to an item not displayed in this run', async () => {
    const result = await narrativeFor('S01', (e) => ({
      ...e,
      narrative: {
        ...e.narrative,
        overview: { ...e.narrative.overview, factIds: ['fact.does.not.exist'] },
      },
    }));
    expect(result.ok).toBe(false);
    expect(result.checks[1].codes).toContain('NARRATIVE_UNKNOWN_REFERENCE');
  });

  it('rejects an omitted required finding explanation', async () => {
    const result = await narrativeFor('S01', (e) => ({
      ...e,
      narrative: { ...e.narrative, findings: [] },
    }));
    expect(result.ok).toBe(false);
    expect(result.checks[2].codes).toContain('NARRATIVE_MISSING_FINDING');
  });

  it('rejects an explanation for a finding the engine did not report', async () => {
    const result = await narrativeFor('S01', (e) => ({
      ...e,
      narrative: {
        ...e.narrative,
        findings: [...e.narrative.findings, { factId: 'fact.run_summary', text: 'Extra.' }],
      },
    }));
    expect(result.ok).toBe(false);
    expect(result.checks[2].codes).toContain('NARRATIVE_EXTRA_FINDING');
  });

  it('rejects a duplicated finding explanation', async () => {
    const result = await narrativeFor('S01', (e) => ({
      ...e,
      narrative: { ...e.narrative, findings: [...e.narrative.findings, ...e.narrative.findings] },
    }));
    expect(result.ok).toBe(false);
    expect(result.checks[2].codes).toContain('NARRATIVE_DUPLICATE_REFERENCE');
  });

  it('rejects a review note for a step that was not selected', async () => {
    const result = await narrativeFor('S01', (e) => ({
      ...e,
      narrative: {
        ...e.narrative,
        reviewNotes: [{ reviewStepId: 'NO_ACTION_RECORD_RUN', text: 'Nothing to do.' }],
      },
    }));
    expect(result.ok).toBe(false);
    expect(result.checks[3].codes).toContain('NARRATIVE_REVIEW_NOT_SELECTED');
  });

  it('rejects empty explanation text', async () => {
    const result = await narrativeFor('S01', (e) => ({
      ...e,
      narrative: {
        ...e.narrative,
        overview: { ...e.narrative.overview, text: '   ' },
      },
    }));
    expect(result.ok).toBe(false);
    expect(result.checks[0].codes).toContain('NARRATIVE_EMPTY_TEXT');
  });

  it('rejects oversized explanation text', async () => {
    const result = await narrativeFor('S01', (e) => ({
      ...e,
      narrative: {
        ...e.narrative,
        overview: { ...e.narrative.overview, text: 'x'.repeat(5000) },
      },
    }));
    expect(result.ok).toBe(false);
    expect(result.checks[0].codes).toContain('NARRATIVE_SCHEMA_INVALID');
  });

  it('rejects a model-owned confidence or approval field on the envelope', async () => {
    for (const extra of [{ confidence: 0.98 }, { approved: true }, { url: 'http://x' }]) {
      const result = await narrativeFor('S01', (e) => ({ ...e, ...extra }));
      expect(result.ok).toBe(false);
      expect(result.checks[0].codes).toContain('NARRATIVE_UNKNOWN_PROPERTY');
    }
  });

  it('reports later narrative checks as not run after a failure', async () => {
    const result = await narrativeFor('S01', (e) => ({ ...e, confidence: 1 }));
    expect(result.checks.slice(1).every((c) => c.status === 'NOT_APPLICABLE')).toBe(true);
  });

  it('allows empty findings only when the engine requires none', async () => {
    const baseline = await narrativeFor('S00', (e) => ({
      ...e,
      narrative: { ...e.narrative, findings: [] },
    }));
    expect(baseline.ok).toBe(true);
    expect(baseline.checks[2].detail).toContain('no required findings');
  });
});

// ---- Scope of the checks --------------------------------------------------

describe('reference checks are not semantic proof', () => {
  it('accepts a legitimately cited but semantically dubious paraphrase', async () => {
    // Correct ids, plausible shape, but the wording overstates the conclusion.
    // The checks pass because they are structural; the UI must still mark the
    // narrative as requiring review.
    const misleading =
      'Everything is fine and the plan can be dispatched once someone glances at it.';
    const result = await narrativeFor('S01', (e) => ({
      ...e,
      narrative: {
        ...e.narrative,
        overview: { ...e.narrative.overview, text: misleading },
      },
    }));

    expect(result.ok).toBe(true);
    // The passing result carries no verification or confidence claim.
    expect(result.message).toContain('requires review');
    expect(result.message).not.toContain('verified');
    expect(JSON.stringify(result)).not.toContain('confidence');
  });

  it('counts references resolved without claiming entailment', async () => {
    const result = await narrativeFor('S01');
    expect(result.ok).toBe(true);
    expect(result.references.referenced).toBeGreaterThan(0);
    expect(result.references.resolved).toBe(result.references.referenced);
  });
});

// ---- Provider failure states ----------------------------------------------

describe('provider failures never become fabricated prose', () => {
  it('withholds on refusal', async () => {
    const { fingerprint } = await context('S01');
    const result = await generateBriefing({
      scenarioId: 'S01',
      requestedFingerprint: fingerprint,
      provider: async () => ({ ...completion({}), stopReason: 'refusal' }),
    });
    expect(result.outcome).toBe('withheld');
    expect(result.narrative).toBeNull();
  });

  it('withholds on truncation', async () => {
    const { fingerprint } = await context('S01');
    const result = await generateBriefing({
      scenarioId: 'S01',
      requestedFingerprint: fingerprint,
      provider: async () => ({ ...completion({}), stopReason: 'max_tokens' }),
    });
    expect(result.outcome).toBe('withheld');
  });

  it('reports unavailable on a thrown provider error, with no prose', async () => {
    const { fingerprint } = await context('S01');
    const result = await generateBriefing({
      scenarioId: 'S01',
      requestedFingerprint: fingerprint,
      provider: async () => {
        throw new Error('Anthropic rate limit reached.');
      },
    });
    expect(result.outcome).toBe('unavailable');
    expect(result.narrative).toBeNull();
    expect(result.briefing).toBeNull();
    expect(result.message).toContain('Plan checks are unchanged');
  });

  it('never calls the provider for a stale snapshot', async () => {
    let called = false;
    const result = await generateBriefing({
      scenarioId: 'S01',
      requestedFingerprint: 'c'.repeat(64),
      provider: async () => {
        called = true;
        throw new Error('unreachable');
      },
    });
    expect(called).toBe(false);
    expect(result.outcome).toBe('stale');
    expect(result.narrative).toBeNull();
  });
});
