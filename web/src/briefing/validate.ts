import type { EvaluationReport, SourceRef } from '@/domain/types';
import type {
  BriefingCatalog,
  BriefingSelection,
  CatalogFact,
  EvidenceRef,
  GateDiagnosticCode,
  GateId,
  GateResult,
} from './contracts';
import { briefingSelectionSchema, GATE_ORDER } from './contracts';
import { renderFact } from './templates';

/**
 * Deterministic publication gates.
 *
 * These are pure functions over an untrusted payload, the catalog, and the
 * authoritative report, so every rejection path is testable without a provider
 * call. No second model is consulted: nothing here asks an LLM whether the LLM
 * was right.
 */

export interface ProviderCompletion {
  /** Raw text the provider returned; parsed here, never trusted. */
  rawText: string | null;
  stopReason: string | null;
  model: string | null;
  usage: { inputTokens: number; outputTokens: number } | null;
  /** Provider request id when the SDK exposes one; useful in evidence logs. */
  requestId?: string | null;
}

export interface ValidationInput {
  completion: ProviderCompletion;
  catalog: BriefingCatalog;
  report: EvaluationReport;
  /** The fingerprint the server itself computed for its reconstruction. */
  serverFingerprint: string;
}

export interface ValidationResult {
  ok: boolean;
  gates: GateResult[];
  selection: BriefingSelection | null;
  /** First user-safe reason publication was withheld. */
  message: string;
}

/** Only these stop reasons can carry a complete, usable payload. */
const ACCEPTED_STOP_REASONS = new Set(['end_turn', 'stop_sequence']);

function gate(
  id: GateId,
  passed: boolean,
  detail: string,
  codes: GateDiagnosticCode[] = [],
): GateResult {
  return { id, status: passed ? 'PASSED' : 'FAILED', codes, detail };
}

function notApplicable(id: GateId, detail: string): GateResult {
  return { id, status: 'NOT_APPLICABLE', codes: [], detail };
}

/**
 * Runs every gate. Gates after a hard failure are reported NOT_APPLICABLE
 * rather than PASSED, so a withheld report can never show a full green panel.
 */
export function validateSelection(input: ValidationInput): ValidationResult {
  const { completion, catalog, report, serverFingerprint } = input;
  const gates: GateResult[] = [];

  const stop = (message: string): ValidationResult => {
    for (const id of GATE_ORDER) {
      if (!gates.some((g) => g.id === id)) {
        gates.push(notApplicable(id, 'Not evaluated: an earlier gate failed.'));
      }
    }
    return { ok: false, gates, selection: null, message };
  };

  // ---- Gate 1: completion and schema ------------------------------------
  if (completion.stopReason === 'refusal') {
    gates.push(
      gate('COMPLETION_AND_SCHEMA', false, 'The provider refused the request.', [
        'PROVIDER_INCOMPLETE',
      ]),
    );
    return stop('AI briefing withheld: the provider declined to produce a selection.');
  }
  if (completion.stopReason === 'max_tokens') {
    gates.push(
      gate('COMPLETION_AND_SCHEMA', false, 'The response was truncated at the token limit.', [
        'PROVIDER_INCOMPLETE',
      ]),
    );
    return stop('AI briefing withheld: the provider response was truncated.');
  }
  if (completion.stopReason === null || !ACCEPTED_STOP_REASONS.has(completion.stopReason)) {
    gates.push(
      gate(
        'COMPLETION_AND_SCHEMA',
        false,
        'Unsupported completion state: ' + (completion.stopReason ?? 'none') + '.',
        ['PROVIDER_INCOMPLETE'],
      ),
    );
    return stop('AI briefing withheld: the provider did not complete normally.');
  }
  if (completion.rawText === null || completion.rawText.trim() === '') {
    gates.push(
      gate('COMPLETION_AND_SCHEMA', false, 'The response carried no JSON content.', [
        'PROVIDER_INCOMPLETE',
      ]),
    );
    return stop('AI briefing withheld: the provider returned no usable content.');
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(completion.rawText);
  } catch {
    gates.push(
      gate('COMPLETION_AND_SCHEMA', false, 'The response was not valid JSON.', ['SCHEMA_INVALID']),
    );
    return stop('AI briefing withheld: the provider response was not valid JSON.');
  }

  const parsed = briefingSelectionSchema.safeParse(parsedJson);
  if (!parsed.success) {
    // An unrecognized key such as confidence or verdict rejects the whole
    // payload; it is never silently stripped.
    const unknownKey = parsed.error.issues.some(
      (issue) => issue.code === 'unrecognized_keys',
    );
    gates.push(
      gate(
        'COMPLETION_AND_SCHEMA',
        false,
        unknownKey
          ? 'The selection contained properties outside the contract.'
          : 'The selection did not match the required schema.',
        [unknownKey ? 'UNKNOWN_PROPERTY' : 'SCHEMA_INVALID'],
      ),
    );
    return stop(
      unknownKey
        ? 'AI briefing withheld: the model returned fields outside the allowed contract.'
        : 'AI briefing withheld: the model selection failed schema validation.',
    );
  }
  const selection = parsed.data;
  gates.push(
    gate('COMPLETION_AND_SCHEMA', true, 'Provider completed normally with a strictly valid payload.'),
  );

  // ---- Gate 2: snapshot match -------------------------------------------
  if (
    selection.inputFingerprint !== serverFingerprint ||
    catalog.inputFingerprint !== serverFingerprint
  ) {
    gates.push(
      gate('SNAPSHOT_MATCH', false, 'The selection does not match this run’s snapshot.', [
        'FINGERPRINT_MISMATCH',
      ]),
    );
    return stop('AI briefing withheld: the selection referred to a different input snapshot.');
  }
  gates.push(gate('SNAPSHOT_MATCH', true, 'Selection and catalog match the evaluated snapshot.'));

  // ---- Gate 3: catalog membership ---------------------------------------
  const byId = new Map(catalog.facts.map((f) => [f.id, f]));
  const membershipCodes: GateDiagnosticCode[] = [];
  const membershipDetails: string[] = [];

  const requireSection = (id: string, section: 'lead' | 'finding' | 'context') => {
    const fact = byId.get(id);
    if (!fact) {
      membershipCodes.push('UNKNOWN_FACT_ID');
      membershipDetails.push('Unknown fact id: ' + id + '.');
      return;
    }
    if (!fact.sections.includes(section)) {
      membershipCodes.push('WRONG_SECTION');
      membershipDetails.push(id + ' is not permitted in the ' + section + ' section.');
    }
  };

  requireSection(selection.leadFactId, 'lead');
  for (const id of selection.orderedFindingFactIds) requireSection(id, 'finding');
  for (const id of selection.contextFactIds) requireSection(id, 'context');

  if (new Set(selection.orderedFindingFactIds).size !== selection.orderedFindingFactIds.length) {
    membershipCodes.push('DUPLICATE_ID');
    membershipDetails.push('A finding was listed more than once.');
  }
  if (new Set(selection.contextFactIds).size !== selection.contextFactIds.length) {
    membershipCodes.push('DUPLICATE_ID');
    membershipDetails.push('A context fact was listed more than once.');
  }
  if (new Set(selection.reviewStepIds).size !== selection.reviewStepIds.length) {
    membershipCodes.push('DUPLICATE_ID');
    membershipDetails.push('A review step was listed more than once.');
  }

  if (membershipCodes.length > 0) {
    gates.push(
      gate('CATALOG_MEMBERSHIP', false, membershipDetails.join(' '), membershipCodes),
    );
    return stop('AI briefing withheld: the selection referenced content outside the catalog.');
  }
  gates.push(
    gate('CATALOG_MEMBERSHIP', true, 'Every selected id exists in its permitted section.'),
  );

  // ---- Gate 4: finding completeness -------------------------------------
  const required = new Set(catalog.requiredFindingIds);
  const selected = new Set(selection.orderedFindingFactIds);
  const missing = [...required].filter((id) => !selected.has(id));
  const extra = [...selected].filter((id) => !required.has(id));

  if (missing.length > 0 || extra.length > 0) {
    const codes: GateDiagnosticCode[] = [];
    if (missing.length > 0) codes.push('MISSING_REQUIRED_FINDING');
    if (extra.length > 0) codes.push('EXTRA_FINDING');
    gates.push(
      gate(
        'FINDING_COMPLETENESS',
        false,
        (missing.length > 0 ? 'Omitted required findings: ' + missing.join(', ') + '. ' : '') +
          (extra.length > 0 ? 'Findings not required by the engine: ' + extra.join(', ') + '.' : ''),
        codes,
      ),
    );
    return stop(
      missing.length > 0
        ? 'AI briefing withheld: a required finding was omitted.'
        : 'AI briefing withheld: the selection added a finding the engine did not report.',
    );
  }
  gates.push(
    gate(
      'FINDING_COMPLETENESS',
      true,
      required.size === 0
        ? 'The engine reported no required findings for this run.'
        : 'All ' + required.size + ' engine-required findings are present exactly once.',
    ),
  );

  // ---- Gate 5: provenance ------------------------------------------------
  const factualIds = uniqueFactualIds(selection);
  const provenanceCodes: GateDiagnosticCode[] = [];
  const provenanceDetails: string[] = [];

  for (const id of factualIds) {
    const fact = byId.get(id);
    if (!fact) {
      provenanceCodes.push('UNKNOWN_FACT_ID');
      continue;
    }
    if (renderFact(fact, report, selection.detailLevel) === null) {
      provenanceCodes.push('EVIDENCE_UNRESOLVED');
      provenanceDetails.push(id + ' has no authoritative engine result.');
      continue;
    }
    for (const evidence of fact.evidence) {
      const problem = resolveEvidence(evidence, report);
      if (problem !== null) {
        provenanceCodes.push(problem.code);
        provenanceDetails.push(id + ': ' + problem.detail);
      }
    }
  }

  if (provenanceCodes.length > 0) {
    gates.push(
      gate('PROVENANCE', false, provenanceDetails.join(' ') || 'Evidence did not resolve.', provenanceCodes),
    );
    return stop('AI briefing withheld: a statement did not resolve to its source evidence.');
  }
  gates.push(
    gate(
      'PROVENANCE',
      true,
      factualIds.length + ' factual statements resolve to an engine result and source evidence.',
    ),
  );

  // ---- Gate 6: verdict and lead consistency ------------------------------
  const leadFact = byId.get(selection.leadFactId) as CatalogFact;
  if (!leadFact.leadEligible) {
    gates.push(
      gate(
        'VERDICT_CONSISTENCY',
        false,
        'The chosen headline is not eligible for a run with data ' +
          report.dataStatus +
          ' and plan ' +
          report.planStatus +
          '.',
        ['LEAD_NOT_ELIGIBLE'],
      ),
    );
    return stop(
      'AI briefing withheld: the headline did not match the engine verdict for this run.',
    );
  }
  gates.push(
    gate(
      'VERDICT_CONSISTENCY',
      true,
      'The headline is eligible for the engine verdict, which the renderer owns.',
    ),
  );

  // ---- Gate 7: scope and review applicability ----------------------------
  const stepById = new Map(catalog.reviewSteps.map((s) => [s.id, s]));
  const reviewCodes: GateDiagnosticCode[] = [];
  const reviewDetails: string[] = [];

  for (const id of selection.reviewStepIds) {
    const step = stepById.get(id as (typeof catalog.reviewSteps)[number]['id']);
    if (!step) {
      reviewCodes.push('UNKNOWN_REVIEW_STEP');
      reviewDetails.push('Unknown review step: ' + id + '.');
      continue;
    }
    if (!step.applicable) {
      reviewCodes.push('REVIEW_STEP_NOT_APPLICABLE');
      reviewDetails.push(id + ' does not apply to this run.');
    }
  }

  if (reviewCodes.length > 0) {
    gates.push(gate('SCOPE_AND_REVIEW', false, reviewDetails.join(' '), reviewCodes));
    return stop('AI briefing withheld: a suggested review step does not apply to this run.');
  }
  gates.push(
    gate(
      'SCOPE_AND_REVIEW',
      true,
      'Review steps meet their catalog predicates; assumptions and limitations are renderer-owned.',
    ),
  );

  return { ok: true, gates, selection, message: 'Verified against this run.' };
}

/**
 * Unique factual ids across lead, findings and context. The lead may repeat a
 * finding deliberately; it is counted once.
 */
export function uniqueFactualIds(selection: BriefingSelection): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of [
    selection.leadFactId,
    ...selection.orderedFindingFactIds,
    ...selection.contextFactIds,
  ]) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** Confirms an evidence reference still resolves in the current snapshot. */
function resolveEvidence(
  evidence: EvidenceRef,
  report: EvaluationReport,
): { code: GateDiagnosticCode; detail: string } | null {
  const raw = report.rawTables[evidence.table];
  if (!raw) {
    return { code: 'EVIDENCE_UNRESOLVED', detail: 'no such table ' + evidence.table };
  }

  if (evidence.kind === 'file') {
    return raw.unreadable || raw.fileName === null
      ? { code: 'EVIDENCE_UNRESOLVED', detail: 'file ' + evidence.fileName + ' is not readable' }
      : null;
  }

  if (evidence.kind === 'header') {
    // A header reference is used exactly when the column is absent, so its
    // continued absence is what makes it correct.
    return null;
  }

  const record = raw.records.find((r) => r.recordNumber === evidence.recordNumber);
  if (!record) {
    return {
      code: 'EVIDENCE_UNRESOLVED',
      detail: 'record ' + evidence.recordNumber + ' not found in ' + evidence.fileName,
    };
  }
  const columnIndex = raw.headers.map((h) => h.trim()).indexOf(evidence.column ?? '');
  if (columnIndex === -1) {
    return {
      code: 'EVIDENCE_UNRESOLVED',
      detail: 'column ' + evidence.column + ' not found in ' + evidence.fileName,
    };
  }
  const actual = record.cells[columnIndex] ?? '';
  if (evidence.rawValue !== undefined && evidence.rawValue !== null && actual !== evidence.rawValue) {
    return {
      code: 'EVIDENCE_VALUE_MISMATCH',
      detail:
        'raw value at record ' + evidence.recordNumber + ' no longer matches the cited value',
    };
  }
  return null;
}

/** Convenience for tests and the panel. */
export function sourceKey(source: SourceRef): string {
  return source.table + ':' + source.recordNumber + ':' + source.column;
}
