import type {
  AiReportEnvelope,
  BriefingCatalog,
  NarrativeCheckId,
  NarrativeCheckResult,
  NarrativeDiagnosticCode,
} from './contracts';
import { NARRATIVE_CHECK_ORDER, aiReportEnvelopeSchema } from './contracts';

/**
 * Structural and reference checks over model-authored prose.
 *
 * These establish that the narrative is well formed, bounded, and cites only
 * evidence that exists in this run's canonical manifest. They are NOT an
 * entailment proof: a paragraph can cite the right facts, quote the right
 * numbers, and still misstate a relationship. Nothing in this file may be
 * described as verifying what the prose means.
 *
 * No second model is consulted, and no lexical similarity heuristic is used as
 * a correctness signal.
 */

export interface NarrativeValidationInput {
  /** Already parsed from the provider payload; still untrusted. */
  payload: unknown;
  catalog: BriefingCatalog;
  /** Fact ids displayed in the canonical manifest for this run. */
  displayedFactIds: string[];
  /** Review step ids the selection actually chose. */
  selectedReviewStepIds: string[];
}

export interface NarrativeValidationResult {
  ok: boolean;
  envelope: AiReportEnvelope | null;
  checks: NarrativeCheckResult[];
  references: { resolved: number; referenced: number };
  message: string;
}

function check(
  id: NarrativeCheckId,
  passed: boolean,
  detail: string,
  codes: NarrativeDiagnosticCode[] = [],
): NarrativeCheckResult {
  return { id, status: passed ? 'PASSED' : 'FAILED', codes, detail };
}

function notRun(id: NarrativeCheckId): NarrativeCheckResult {
  return {
    id,
    status: 'NOT_APPLICABLE',
    codes: [],
    detail: 'Not evaluated: an earlier narrative check failed.',
  };
}

/** Ordinary whitespace normalization only; the provider's words are preserved. */
export function normalizeProse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function validateNarrative(
  input: NarrativeValidationInput,
): NarrativeValidationResult {
  const { payload, catalog, displayedFactIds, selectedReviewStepIds } = input;
  const checks: NarrativeCheckResult[] = [];

  const stop = (message: string): NarrativeValidationResult => {
    for (const id of NARRATIVE_CHECK_ORDER) {
      if (!checks.some((c) => c.id === id)) checks.push(notRun(id));
    }
    return { ok: false, envelope: null, checks, references: { resolved: 0, referenced: 0 }, message };
  };

  // ---- Check 1: envelope schema and bounds ------------------------------
  const parsed = aiReportEnvelopeSchema.safeParse(payload);
  if (!parsed.success) {
    const unknownKey = parsed.error.issues.some((i) => i.code === 'unrecognized_keys');
    const emptyText = parsed.error.issues.some(
      (i) => i.code === 'too_small' && i.path.includes('text'),
    );
    const code: NarrativeDiagnosticCode = unknownKey
      ? 'NARRATIVE_UNKNOWN_PROPERTY'
      : emptyText
        ? 'NARRATIVE_EMPTY_TEXT'
        : 'NARRATIVE_SCHEMA_INVALID';
    checks.push(
      check(
        'ENVELOPE_SCHEMA',
        false,
        unknownKey
          ? 'The envelope carried properties outside the contract.'
          : emptyText
            ? 'An explanation field was empty.'
            : 'The envelope did not match the required schema or exceeded its bounds.',
        [code],
      ),
    );
    return stop(
      unknownKey
        ? 'AI explanation withheld: the model returned fields outside the allowed contract.'
        : 'AI explanation withheld: the report envelope failed schema validation.',
    );
  }
  const envelope = parsed.data;
  checks.push(
    check('ENVELOPE_SCHEMA', true, 'Envelope is strictly valid and within size bounds.'),
  );

  const displayed = new Set(displayedFactIds);
  let referenced = 0;
  let resolved = 0;

  // ---- Check 2: overview references -------------------------------------
  const overviewIds = envelope.narrative.overview.factIds;
  const overviewCodes: NarrativeDiagnosticCode[] = [];
  const overviewDetails: string[] = [];

  if (new Set(overviewIds).size !== overviewIds.length) {
    overviewCodes.push('NARRATIVE_DUPLICATE_REFERENCE');
    overviewDetails.push('The overview cited the same fact more than once.');
  }
  for (const id of overviewIds) {
    referenced += 1;
    if (displayed.has(id)) resolved += 1;
    else {
      overviewCodes.push('NARRATIVE_UNKNOWN_REFERENCE');
      overviewDetails.push('Overview cites an item not displayed in this run: ' + id + '.');
    }
  }

  if (overviewCodes.length > 0) {
    checks.push(check('OVERVIEW_REFERENCES', false, overviewDetails.join(' '), overviewCodes));
    return stop('AI explanation withheld: it cited evidence that is not part of this run.');
  }
  checks.push(
    check(
      'OVERVIEW_REFERENCES',
      true,
      overviewIds.length + ' overview citations resolve to displayed evidence.',
    ),
  );

  // ---- Check 3: finding coverage ----------------------------------------
  // The engine defines the set; the model may neither omit nor invent one.
  const required = new Set(catalog.requiredFindingIds);
  const explained = envelope.narrative.findings.map((f) => f.factId);
  const coverageCodes: NarrativeDiagnosticCode[] = [];
  const coverageDetails: string[] = [];

  if (new Set(explained).size !== explained.length) {
    coverageCodes.push('NARRATIVE_DUPLICATE_REFERENCE');
    coverageDetails.push('A finding was explained more than once.');
  }
  const missing = [...required].filter((id) => !explained.includes(id));
  const extra = explained.filter((id) => !required.has(id));
  if (missing.length > 0) {
    coverageCodes.push('NARRATIVE_MISSING_FINDING');
    coverageDetails.push('Unexplained required findings: ' + missing.join(', ') + '.');
  }
  if (extra.length > 0) {
    coverageCodes.push('NARRATIVE_EXTRA_FINDING');
    coverageDetails.push('Explained findings the engine did not report: ' + extra.join(', ') + '.');
  }

  for (const id of explained) {
    referenced += 1;
    if (displayed.has(id)) resolved += 1;
  }

  if (coverageCodes.length > 0) {
    checks.push(check('FINDING_COVERAGE', false, coverageDetails.join(' '), coverageCodes));
    return stop(
      missing.length > 0
        ? 'AI explanation withheld: a required finding was left unexplained.'
        : 'AI explanation withheld: it explained a finding the engine did not report.',
    );
  }
  checks.push(
    check(
      'FINDING_COVERAGE',
      true,
      required.size === 0
        ? 'The engine reported no required findings, and none were invented.'
        : 'All ' + required.size + ' required findings are explained exactly once.',
    ),
  );

  // ---- Check 4: review note references ----------------------------------
  const selectedReviews = new Set(selectedReviewStepIds);
  const noteIds = envelope.narrative.reviewNotes.map((n) => n.reviewStepId);
  const reviewCodes: NarrativeDiagnosticCode[] = [];
  const reviewDetails: string[] = [];

  if (new Set(noteIds).size !== noteIds.length) {
    reviewCodes.push('NARRATIVE_DUPLICATE_REFERENCE');
    reviewDetails.push('A review step was explained more than once.');
  }
  for (const id of noteIds) {
    referenced += 1;
    if (selectedReviews.has(id)) resolved += 1;
    else {
      reviewCodes.push('NARRATIVE_REVIEW_NOT_SELECTED');
      reviewDetails.push('Review note refers to a step not selected for this run: ' + id + '.');
    }
  }

  if (reviewCodes.length > 0) {
    checks.push(check('REVIEW_REFERENCES', false, reviewDetails.join(' '), reviewCodes));
    return stop('AI explanation withheld: it described a review step that does not apply here.');
  }
  checks.push(
    check(
      'REVIEW_REFERENCES',
      true,
      noteIds.length + ' review notes match steps selected for this run.',
    ),
  );

  return {
    ok: true,
    envelope,
    checks,
    references: { resolved, referenced },
    // Deliberately not "verified": these checks are structural.
    message: 'Evidence references checked. Wording requires review.',
  };
}
