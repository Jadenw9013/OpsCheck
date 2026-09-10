import { evaluateBundle } from '@/domain/evaluateBundle';
import type { EvaluationReport } from '@/domain/types';
import { loadScenario } from '@/fixtures/loadScenario';
import { buildCatalog, catalogDigest } from './catalog';
import type {
  AuthorizedScenarioId,
  BriefingResponse,
  GateResult,
  NarrativeCheckResult,
  RenderedNarrative,
} from './contracts';
import { GATE_ORDER, NARRATIVE_CHECK_ORDER } from './contracts';
import { fingerprintBundle } from './fingerprint';
import { isPublishable, renderBriefing } from './render';
import { factLabel, reviewStepText } from './templates';
import { validateSelection, uniqueFactualIds, type ProviderCompletion } from './validate';
import { normalizeProse, validateNarrative } from './validate-narrative';

/**
 * Server-side generation pipeline, independent of the HTTP layer and of the
 * Anthropic SDK, so every branch is testable with an injected provider.
 *
 * Order matters. The server reconstructs and re-evaluates the authorized
 * scenario, compares the client's fingerprint BEFORE any provider call, then
 * runs the V1 evidence gates on the envelope's selection, and only then checks
 * the narrative. The deterministic evidence manifest can publish while the
 * narrative is withheld; the reverse is never possible.
 */

export type ProviderFn = (
  digest: ReturnType<typeof catalogDigest>,
) => Promise<ProviderCompletion>;

function allGatesNotRun(detail: string): GateResult[] {
  return GATE_ORDER.map((id) => ({
    id,
    status: 'NOT_APPLICABLE' as const,
    codes: [],
    detail,
  }));
}

function allNarrativeChecksNotRun(detail: string): NarrativeCheckResult[] {
  return NARRATIVE_CHECK_ORDER.map((id) => ({
    id,
    status: 'NOT_APPLICABLE' as const,
    codes: [],
    detail,
  }));
}

export interface GenerateInput {
  scenarioId: AuthorizedScenarioId;
  requestedFingerprint: string;
  provider: ProviderFn;
}

export async function generateBriefing(input: GenerateInput): Promise<BriefingResponse> {
  const { scenarioId, requestedFingerprint, provider } = input;

  // Reconstruct the authorized snapshot and evaluate it with the real engine.
  // Selecting a fixture by id is permitted; nothing branches on the id to
  // manufacture an outcome.
  const bundle = loadScenario(scenarioId);
  const serverFingerprint = await fingerprintBundle(bundle);

  if (serverFingerprint !== requestedFingerprint) {
    return {
      outcome: 'stale',
      inputFingerprint: serverFingerprint,
      briefing: null,
      narrative: null,
      gates: allGatesNotRun('Not evaluated: the request did not match this snapshot.'),
      message:
        'AI report not generated: the inputs changed since this request was prepared. Run checks again.',
      provider: null,
    };
  }

  const report: EvaluationReport = evaluateBundle(bundle);
  const catalog = buildCatalog(report, scenarioId, serverFingerprint);
  const digest = catalogDigest(catalog, report, (fact) => factLabel(fact, report));

  const startedAt = Date.now();
  let completion: ProviderCompletion;
  try {
    completion = await provider(digest);
  } catch (error) {
    // A failed call is never silently replaced with fabricated prose.
    return {
      outcome: 'unavailable',
      inputFingerprint: serverFingerprint,
      briefing: null,
      narrative: null,
      gates: allGatesNotRun('Not evaluated: the provider call did not complete.'),
      message:
        'AI report unavailable: ' +
        (error instanceof Error ? error.message : 'the provider call failed.') +
        ' Plan checks are unchanged.',
      provider: null,
    };
  }
  const elapsedMs = Date.now() - startedAt;

  const providerMeta = {
    model: completion.model,
    stopReason: completion.stopReason,
    usage: completion.usage,
    elapsedMs,
    requestId: completion.requestId ?? null,
  };

  // ---- V1 evidence gates, unchanged --------------------------------------
  // The envelope's selection is handed to the original validator verbatim, so
  // the V1 contract still rejects any prose or extra property inside it.
  let envelopePayload: unknown = null;
  let selectionText: string | null = completion.rawText;
  if (completion.rawText !== null) {
    try {
      envelopePayload = JSON.parse(completion.rawText);
      const maybeSelection = (envelopePayload as { selection?: unknown } | null)?.selection;
      if (maybeSelection !== undefined) selectionText = JSON.stringify(maybeSelection);
    } catch {
      // Leave the raw text in place; the V1 gate reports the parse failure.
    }
  }

  const validation = validateSelection({
    completion: { ...completion, rawText: selectionText },
    catalog,
    report,
    serverFingerprint,
  });

  if (!validation.ok || validation.selection === null) {
    return {
      outcome: 'withheld',
      inputFingerprint: serverFingerprint,
      briefing: null,
      narrative: null,
      gates: validation.gates,
      message: validation.message,
      provider: providerMeta,
    };
  }

  // Build the manifest, then check it. Nothing is appended afterwards.
  const briefing = renderBriefing(validation.selection, catalog, report, validation.gates);
  if (briefing === null) {
    return {
      outcome: 'withheld',
      inputFingerprint: serverFingerprint,
      briefing: null,
      narrative: null,
      gates: validation.gates,
      message: 'AI report withheld: a statement could not be rendered from its engine result.',
      provider: providerMeta,
    };
  }

  if (!isPublishable(briefing.metrics)) {
    return {
      outcome: 'withheld',
      inputFingerprint: serverFingerprint,
      briefing: null,
      narrative: null,
      gates: validation.gates,
      message:
        'AI report withheld: the rendered evidence did not meet full traceability and coverage.',
      provider: providerMeta,
    };
  }

  // ---- V2 narrative checks ------------------------------------------------
  // The evidence manifest is already publishable at this point. A narrative
  // failure withholds the prose only; it never retracts the engine evidence.
  const displayedFactIds = uniqueFactualIds(validation.selection);
  const narrativeResult = validateNarrative({
    payload: envelopePayload,
    catalog,
    displayedFactIds,
    selectedReviewStepIds: validation.selection.reviewStepIds,
  });

  if (!narrativeResult.ok || narrativeResult.envelope === null) {
    return {
      outcome: 'withheld',
      inputFingerprint: serverFingerprint,
      briefing,
      narrative: {
        overview: { text: '', citations: [] },
        findings: [],
        reviewNotes: [],
        checks: narrativeResult.checks,
        references: narrativeResult.references,
      },
      gates: validation.gates,
      message: narrativeResult.message,
      provider: providerMeta,
    };
  }

  const narrative = renderNarrative(
    narrativeResult.envelope,
    briefing,
    narrativeResult.checks,
    narrativeResult.references,
  );

  return {
    outcome: 'verified',
    inputFingerprint: serverFingerprint,
    briefing,
    narrative,
    gates: validation.gates,
    message: 'Verified against this run.',
    provider: providerMeta,
  };
}

/**
 * Pairs the provider's words with application-owned labels.
 *
 * The prose is preserved exactly apart from whitespace normalization, and it is
 * rendered later as plain React text. Citation labels and review-step wording
 * come from the application, never from the model.
 */
function renderNarrative(
  envelope: NonNullable<ReturnType<typeof validateNarrative>['envelope']>,
  briefing: NonNullable<BriefingResponse['briefing']>,
  checks: NarrativeCheckResult[],
  references: { resolved: number; referenced: number },
): RenderedNarrative {
  const statementById = new Map(
    [briefing.lead, ...briefing.findings, ...briefing.context].map((s) => [s.factId, s]),
  );

  return {
    overview: {
      text: normalizeProse(envelope.narrative.overview.text),
      citations: envelope.narrative.overview.factIds.map((factId) => ({
        factId,
        label: statementById.get(factId)?.text ?? factId,
      })),
    },
    findings: envelope.narrative.findings.map((finding) => ({
      factId: finding.factId,
      explanation: normalizeProse(finding.text),
    })),
    reviewNotes: envelope.narrative.reviewNotes.map((note) => ({
      reviewStepId: note.reviewStepId,
      label: reviewStepText(note.reviewStepId) ?? note.reviewStepId,
      explanation: normalizeProse(note.text),
    })),
    checks,
    references,
  };
}

export { allNarrativeChecksNotRun };
