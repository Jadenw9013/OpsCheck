import { z } from 'zod';
import type { SourceRef, TableKind } from '@/domain/types';

/**
 * The trust boundary between the deterministic engine and the model.
 *
 * Claude may only choose catalog IDs, an order, and a presentation variant.
 * It never supplies prose, numbers, verdicts, scores, or actions: those come
 * from the engine result and from application-owned templates. Anything the
 * model returns is untrusted until every publication gate has passed.
 */

export const SELECTION_SCHEMA_VERSION = 'opscheck-briefing-selection-v1';
export const CATALOG_VERSION = 'opscheck-briefing-catalog-v1';

/** Bound into the fingerprint so an engine change invalidates old snapshots. */
export const ENGINE_CONTRACT = 'opscheck-engine-1.0';

export const AUTHORIZED_SCENARIO_IDS = ['S00', 'S01', 'S02'] as const;
export type AuthorizedScenarioId = (typeof AUTHORIZED_SCENARIO_IDS)[number];

export function isAuthorizedScenarioId(value: unknown): value is AuthorizedScenarioId {
  return (
    typeof value === 'string' &&
    (AUTHORIZED_SCENARIO_IDS as readonly string[]).includes(value)
  );
}

// ---- Catalog -------------------------------------------------------------

export type CatalogSection = 'lead' | 'finding' | 'context';

export type FactKind = 'run_summary' | 'violation' | 'diagnostic' | 'context';

export type EvidenceKind = 'cell' | 'record' | 'header' | 'file';

/**
 * A typed pointer into the raw source snapshot. `cell` carries the raw value so
 * the gate can confirm it still resolves to the same text; an absent column or
 * file uses `header`/`file` rather than inventing a cell.
 */
export interface EvidenceRef {
  kind: EvidenceKind;
  table: TableKind;
  fileName: string;
  recordNumber?: number;
  column?: string;
  rawValue?: string | null;
}

export type TemplateId =
  | 'RUN_SUMMARY'
  | 'READINESS_VIOLATION'
  | 'GENERIC_VIOLATION'
  | 'DATA_DIAGNOSTIC'
  | 'RULE_COVERAGE';

export interface CatalogFact {
  id: string;
  kind: FactKind;
  /** Sections this fact may legitimately be selected into. */
  sections: CatalogSection[];
  templateId: TemplateId;
  /** True for every actual violation and data diagnostic. */
  required: boolean;
  /** Only these may be chosen as the headline for this run. */
  leadEligible: boolean;
  /** The authoritative engine object this fact restates. */
  resultRef:
    | { kind: 'report' }
    | { kind: 'check'; key: string }
    | { kind: 'diagnostic'; key: string };
  evidence: EvidenceRef[];
}

export type ReviewStepId =
  | 'REVIEW_TIMING_WITH_OPS'
  | 'CONFIRM_MISSING_INPUT'
  | 'CORRECT_INVALID_INPUT'
  | 'RERUN_AFTER_CHANGES'
  | 'NO_ACTION_RECORD_RUN';

export interface ReviewStepCandidate {
  id: ReviewStepId;
  /** Deterministic predicate result; a step is selectable only when true. */
  applicable: boolean;
}

export interface BriefingCatalog {
  catalogVersion: string;
  inputFingerprint: string;
  scenarioId: AuthorizedScenarioId;
  facts: CatalogFact[];
  /** Ids of facts that MUST appear exactly once in orderedFindingFactIds. */
  requiredFindingIds: string[];
  reviewSteps: ReviewStepCandidate[];
}

// ---- Model selection contract -------------------------------------------

/**
 * Strict: every field required, unknown keys reject the whole payload. A
 * `confidence` or `verdict` property is a rejection, never something to strip.
 */
const ID_PATTERN = /^[A-Za-z0-9_.:-]{1,64}$/;

const idString = z.string().regex(ID_PATTERN);

export const briefingSelectionSchema = z.strictObject({
  schemaVersion: z.literal(SELECTION_SCHEMA_VERSION),
  inputFingerprint: z.string().length(64).regex(/^[0-9a-f]+$/),
  leadFactId: idString,
  orderedFindingFactIds: z.array(idString).max(64),
  contextFactIds: z.array(idString).max(16),
  reviewStepIds: z.array(idString).max(8),
  detailLevel: z.enum(['concise', 'explained']),
});

export type BriefingSelection = z.infer<typeof briefingSelectionSchema>;

/** The JSON Schema handed to the provider. Kept static and small. */
export const BRIEFING_SELECTION_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schemaVersion',
    'inputFingerprint',
    'leadFactId',
    'orderedFindingFactIds',
    'contextFactIds',
    'reviewStepIds',
    'detailLevel',
  ],
  properties: {
    schemaVersion: { type: 'string', const: SELECTION_SCHEMA_VERSION },
    inputFingerprint: { type: 'string' },
    leadFactId: { type: 'string' },
    orderedFindingFactIds: { type: 'array', items: { type: 'string' } },
    contextFactIds: { type: 'array', items: { type: 'string' } },
    reviewStepIds: { type: 'array', items: { type: 'string' } },
    detailLevel: { type: 'string', enum: ['concise', 'explained'] },
  },
};

// ---- Gates ---------------------------------------------------------------

export type GateId =
  | 'COMPLETION_AND_SCHEMA'
  | 'SNAPSHOT_MATCH'
  | 'CATALOG_MEMBERSHIP'
  | 'FINDING_COMPLETENESS'
  | 'PROVENANCE'
  | 'VERDICT_CONSISTENCY'
  | 'SCOPE_AND_REVIEW';

export const GATE_ORDER: readonly GateId[] = [
  'COMPLETION_AND_SCHEMA',
  'SNAPSHOT_MATCH',
  'CATALOG_MEMBERSHIP',
  'FINDING_COMPLETENESS',
  'PROVENANCE',
  'VERDICT_CONSISTENCY',
  'SCOPE_AND_REVIEW',
];

export const GATE_LABEL: Record<GateId, string> = {
  COMPLETION_AND_SCHEMA: 'Completion and schema',
  SNAPSHOT_MATCH: 'Snapshot match',
  CATALOG_MEMBERSHIP: 'Catalog membership',
  FINDING_COMPLETENESS: 'Finding completeness',
  PROVENANCE: 'Provenance',
  VERDICT_CONSISTENCY: 'Verdict consistency',
  SCOPE_AND_REVIEW: 'Scope and review applicability',
};

export type GateDiagnosticCode =
  | 'PROVIDER_INCOMPLETE'
  | 'SCHEMA_INVALID'
  | 'UNKNOWN_PROPERTY'
  | 'FINGERPRINT_MISMATCH'
  | 'CATALOG_VERSION_MISMATCH'
  | 'UNKNOWN_FACT_ID'
  | 'WRONG_SECTION'
  | 'DUPLICATE_ID'
  | 'MISSING_REQUIRED_FINDING'
  | 'EXTRA_FINDING'
  | 'EVIDENCE_UNRESOLVED'
  | 'EVIDENCE_VALUE_MISMATCH'
  | 'LEAD_NOT_ELIGIBLE'
  | 'UNKNOWN_REVIEW_STEP'
  | 'REVIEW_STEP_NOT_APPLICABLE';

export type GateStatus = 'PASSED' | 'FAILED' | 'NOT_APPLICABLE';

export interface GateResult {
  id: GateId;
  status: GateStatus;
  codes: GateDiagnosticCode[];
  detail: string;
}

// ---- Rendered briefing ---------------------------------------------------

export interface RenderedStatement {
  factId: string;
  kind: FactKind;
  text: string;
  /** Extra application-owned detail shown at the "explained" level. */
  detail: string | null;
  /** True when the statement is an assumption rather than an observed input. */
  isAssumption: boolean;
  sources: Array<{ label: string; source: SourceRef }>;
}

export interface RenderedBriefing {
  catalogVersion: string;
  inputFingerprint: string;
  detailLevel: 'concise' | 'explained';
  /** Engine-owned; never influenced by the model. */
  verdict: {
    dataStatus: string;
    planStatus: string;
    headline: string;
    checkCounts: { passed: number; failed: number; blocked: number };
  };
  lead: RenderedStatement;
  findings: RenderedStatement[];
  context: RenderedStatement[];
  assumptions: string[];
  limitations: string[];
  reviewSteps: string[];
  metrics: BriefingMetrics;
}

export interface BriefingMetrics {
  /** verified factual items / displayed unique factual items */
  traceability: { verified: number; total: number };
  /** included required findings / all required findings, engine-defined */
  requiredFindings: { included: number; total: number };
  gates: { passed: number; applicable: number; results: GateResult[] };
}

// ---- V2: evidence selection plus model-authored narrative ----------------

/**
 * The V2 envelope wraps a valid V1 selection with actual model-authored prose.
 *
 * The two halves have different scopes and must never be conflated. The
 * selection keeps the full deterministic guarantee: application-owned templates
 * rendered from engine results. The narrative is the provider's own words,
 * explicitly advisory. Its structure and references are checked; its meaning is
 * not, and no check here is an entailment proof.
 */
export const AI_REPORT_SCHEMA_VERSION = 'opscheck-ai-report-v2';

const MAX_OVERVIEW_CHARS = 900;
const MAX_FINDING_CHARS = 600;
const MAX_REVIEW_CHARS = 400;

const explanationText = (max: number) => z.string().trim().min(1).max(max);

export const explanationParagraphSchema = z.strictObject({
  text: explanationText(MAX_OVERVIEW_CHARS),
  factIds: z.array(idString).min(1).max(8),
});

export const aiReportEnvelopeSchema = z.strictObject({
  schemaVersion: z.literal(AI_REPORT_SCHEMA_VERSION),
  selection: briefingSelectionSchema,
  narrative: z.strictObject({
    overview: explanationParagraphSchema,
    findings: z
      .array(
        z.strictObject({
          factId: idString,
          text: explanationText(MAX_FINDING_CHARS),
        }),
      )
      .max(32),
    reviewNotes: z
      .array(
        z.strictObject({
          reviewStepId: idString,
          text: explanationText(MAX_REVIEW_CHARS),
        }),
      )
      .max(8),
  }),
});

export type AiReportEnvelope = z.infer<typeof aiReportEnvelopeSchema>;

/** The JSON Schema handed to the provider for the whole envelope. */
export const AI_REPORT_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'selection', 'narrative'],
  properties: {
    schemaVersion: { type: 'string', const: AI_REPORT_SCHEMA_VERSION },
    selection: BRIEFING_SELECTION_JSON_SCHEMA,
    narrative: {
      type: 'object',
      additionalProperties: false,
      required: ['overview', 'findings', 'reviewNotes'],
      properties: {
        overview: {
          type: 'object',
          additionalProperties: false,
          required: ['text', 'factIds'],
          properties: {
            text: { type: 'string' },
            factIds: { type: 'array', items: { type: 'string' } },
          },
        },
        findings: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['factId', 'text'],
            properties: { factId: { type: 'string' }, text: { type: 'string' } },
          },
        },
        reviewNotes: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['reviewStepId', 'text'],
            properties: { reviewStepId: { type: 'string' }, text: { type: 'string' } },
          },
        },
      },
    },
  },
};

/** Structural and reference checks over the narrative. Not semantic checks. */
export type NarrativeCheckId =
  | 'ENVELOPE_SCHEMA'
  | 'OVERVIEW_REFERENCES'
  | 'FINDING_COVERAGE'
  | 'REVIEW_REFERENCES';

export const NARRATIVE_CHECK_ORDER: readonly NarrativeCheckId[] = [
  'ENVELOPE_SCHEMA',
  'OVERVIEW_REFERENCES',
  'FINDING_COVERAGE',
  'REVIEW_REFERENCES',
];

export const NARRATIVE_CHECK_LABEL: Record<NarrativeCheckId, string> = {
  ENVELOPE_SCHEMA: 'Envelope schema and bounds',
  OVERVIEW_REFERENCES: 'Overview references resolve',
  FINDING_COVERAGE: 'Finding explanations cover the engine set',
  REVIEW_REFERENCES: 'Review notes match applicable steps',
};

export type NarrativeDiagnosticCode =
  | 'NARRATIVE_SCHEMA_INVALID'
  | 'NARRATIVE_UNKNOWN_PROPERTY'
  | 'NARRATIVE_EMPTY_TEXT'
  | 'NARRATIVE_UNKNOWN_REFERENCE'
  | 'NARRATIVE_DUPLICATE_REFERENCE'
  | 'NARRATIVE_MISSING_FINDING'
  | 'NARRATIVE_EXTRA_FINDING'
  | 'NARRATIVE_REVIEW_NOT_SELECTED';

export interface NarrativeCheckResult {
  id: NarrativeCheckId;
  status: GateStatus;
  codes: NarrativeDiagnosticCode[];
  detail: string;
}

/** One paragraph of provider prose with its resolved citation chips. */
export interface RenderedExplanation {
  /** The provider's own words, whitespace-normalized only. */
  text: string;
  citations: Array<{ factId: string; label: string }>;
}

export interface RenderedNarrative {
  overview: RenderedExplanation;
  /** Paired with the canonical finding statement, which stays authoritative. */
  findings: Array<{ factId: string; explanation: string }>;
  reviewNotes: Array<{ reviewStepId: string; label: string; explanation: string }>;
  checks: NarrativeCheckResult[];
  /** Resolved / referenced narrative ids. References resolve; meaning is not proven. */
  references: { resolved: number; referenced: number };
}

// ---- Route contracts -----------------------------------------------------

export const briefingRequestSchema = z.strictObject({
  scenarioId: z.enum(AUTHORIZED_SCENARIO_IDS),
  inputFingerprint: z.string().length(64).regex(/^[0-9a-f]+$/),
});

export type BriefingRequest = z.infer<typeof briefingRequestSchema>;

export type BriefingOutcome = 'verified' | 'withheld' | 'unavailable' | 'stale';

export interface BriefingResponse {
  outcome: BriefingOutcome;
  inputFingerprint: string;
  /** Present only when outcome is 'verified'. */
  briefing: RenderedBriefing | null;
  /**
   * Provider prose, present only when the envelope also passed the narrative
   * checks. Withheld independently of the deterministic briefing: the evidence
   * manifest can publish while the narrative does not.
   */
  narrative: RenderedNarrative | null;
  /** Gate results are returned even when publication is withheld. */
  gates: GateResult[];
  /** Sanitized, user-safe explanation. Never raw provider content. */
  message: string;
  provider: {
    model: string | null;
    stopReason: string | null;
    usage: { inputTokens: number; outputTokens: number } | null;
    /** Measured wall-clock time for the provider call, in milliseconds. */
    elapsedMs: number | null;
    requestId: string | null;
  } | null;
}

export interface BriefingConfigResponse {
  enabled: boolean;
  configured: boolean;
  model: string | null;
}
