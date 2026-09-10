import type { EvaluationReport, SourceRef } from '@/domain/types';
import type {
  AuthorizedScenarioId,
  BriefingCatalog,
  CatalogFact,
  EvidenceRef,
  ReviewStepCandidate,
} from './contracts';
import { CATALOG_VERSION } from './contracts';

/**
 * Builds the bounded evidence catalog the model may choose from.
 *
 * Everything here is derived from the authoritative report. This module runs no
 * operational arithmetic of its own: readiness, slack, overlap, and counts are
 * read from the engine's own check metrics and diagnostics. It is generic over
 * report content and never keyed to a scenario id or a particular order.
 */

function sourceToEvidence(source: SourceRef): EvidenceRef {
  // An absent column has no cell to point at, so it degrades to a header
  // reference rather than fabricating one.
  if (source.rawValue === null) {
    return {
      kind: 'header',
      table: source.table,
      fileName: source.fileName,
      column: source.column,
    };
  }
  return {
    kind: 'cell',
    table: source.table,
    fileName: source.fileName,
    recordNumber: source.recordNumber,
    column: source.column,
    rawValue: source.rawValue,
  };
}

/**
 * Catalog ids are short opaque handles, not engine keys.
 *
 * Engine keys embed separators and column names, which would both leak
 * internals into the provider payload and break the strict id grammar. The
 * authoritative pointer lives in `resultRef`, so provenance is unaffected.
 * Ordering is the engine's own stable ordering, so ids are deterministic for a
 * given snapshot.
 */
function factId(prefix: string, index: number): string {
  return 'fact.' + prefix + '.' + String(index + 1).padStart(3, '0');
}

/**
 * Lead eligibility is decided by the engine's own statuses, so the model cannot
 * headline a pass on a plan that failed or whose data blocked evaluation.
 */
function leadEligibility(report: EvaluationReport) {
  const dataReady = report.dataStatus === 'READY';
  return {
    runSummary: dataReady && report.planStatus === 'PASS',
    violation: dataReady && report.planStatus === 'VIOLATIONS',
    diagnostic: !dataReady,
  };
}

export function buildCatalog(
  report: EvaluationReport,
  scenarioId: AuthorizedScenarioId,
  inputFingerprint: string,
): BriefingCatalog {
  const eligible = leadEligibility(report);
  const facts: CatalogFact[] = [];

  // One run-summary fact carrying the exact statuses and real counts.
  facts.push({
    id: 'fact.run_summary',
    kind: 'run_summary',
    sections: ['lead', 'context'],
    templateId: 'RUN_SUMMARY',
    required: false,
    leadEligible: eligible.runSummary,
    resultRef: { kind: 'report' },
    evidence: [],
  });

  // Every data diagnostic is a required finding. These are data problems, not
  // failed operational evaluations.
  report.diagnostics.forEach((diagnostic, index) => {
    const evidence: EvidenceRef[] = [];
    if (diagnostic.source) {
      evidence.push(sourceToEvidence(diagnostic.source));
    } else {
      // A whole-table problem points at the file, never at an invented cell.
      const raw = report.rawTables[diagnostic.table];
      evidence.push({
        kind: 'file',
        table: diagnostic.table,
        fileName: raw.fileName ?? diagnostic.table + '.csv',
      });
    }
    for (const related of diagnostic.relatedSources) {
      evidence.push(sourceToEvidence(related));
    }

    facts.push({
      id: factId('diag', index),
      kind: 'diagnostic',
      sections: ['lead', 'finding'],
      templateId: 'DATA_DIAGNOSTIC',
      required: true,
      leadEligible: eligible.diagnostic,
      resultRef: { kind: 'diagnostic', key: diagnostic.key },
      evidence,
    });
  });

  // Every failing check is a required finding.
  let violationIndex = 0;
  for (const check of report.checks) {
    if (check.status !== 'FAIL') continue;
    facts.push({
      id: factId('violation', violationIndex++),
      kind: 'violation',
      sections: ['lead', 'finding'],
      templateId:
        check.ruleId === 'PLAN_READY_BY_DEPARTURE'
          ? 'READINESS_VIOLATION'
          : 'GENERIC_VIOLATION',
      required: true,
      leadEligible: eligible.violation,
      resultRef: { kind: 'check', key: check.key },
      evidence: check.operands.map((operand) => sourceToEvidence(operand.source)),
    });
  }

  // Optional supported context: blocked checks are visible but never counted
  // as passes, and rule coverage summarizes what actually ran.
  let blockedIndex = 0;
  for (const check of report.checks) {
    if (check.status !== 'BLOCKED') continue;
    facts.push({
      id: factId('blocked', blockedIndex++),
      kind: 'context',
      sections: ['context'],
      templateId: 'GENERIC_VIOLATION',
      required: false,
      leadEligible: false,
      resultRef: { kind: 'check', key: check.key },
      evidence: check.operands.map((operand) => sourceToEvidence(operand.source)),
    });
  }

  facts.push({
    id: 'fact.rule_coverage',
    kind: 'context',
    sections: ['context'],
    templateId: 'RULE_COVERAGE',
    required: false,
    leadEligible: false,
    resultRef: { kind: 'report' },
    evidence: [],
  });

  const requiredFindingIds = facts.filter((f) => f.required).map((f) => f.id);

  return {
    catalogVersion: CATALOG_VERSION,
    inputFingerprint,
    scenarioId,
    facts,
    requiredFindingIds,
    reviewSteps: buildReviewSteps(report),
  };
}

/**
 * Review steps are procedural and their applicability is decided here, from
 * actual findings. None of them claims that a change will work, and a missing
 * duration never licenses estimating one.
 */
function buildReviewSteps(report: EvaluationReport): ReviewStepCandidate[] {
  const hasMissing = report.diagnostics.some((d) => d.kind === 'MISSING_DATA');
  const hasInvalid = report.diagnostics.some((d) => d.kind === 'INVALID_DATA');
  const hasViolation = report.checks.some((c) => c.status === 'FAIL');
  const clean =
    report.dataStatus === 'READY' &&
    report.planStatus === 'PASS' &&
    report.diagnostics.length === 0;

  return [
    { id: 'REVIEW_TIMING_WITH_OPS', applicable: hasViolation },
    { id: 'CONFIRM_MISSING_INPUT', applicable: hasMissing },
    { id: 'CORRECT_INVALID_INPUT', applicable: hasInvalid },
    { id: 'RERUN_AFTER_CHANGES', applicable: hasMissing || hasInvalid || hasViolation },
    { id: 'NO_ACTION_RECORD_RUN', applicable: clean },
  ];
}

/** The catalog as sent to the provider: ids, labels, and sections only. */
export interface CatalogDigest {
  catalogVersion: string;
  inputFingerprint: string;
  facts: Array<{
    id: string;
    kind: string;
    sections: string[];
    label: string;
    leadEligible: boolean;
    required: boolean;
  }>;
  requiredFindingIds: string[];
  applicableReviewStepIds: string[];
  verdict: { dataStatus: string; planStatus: string };
}

/**
 * Labels are short, factual, and derived from the engine. They are sent as
 * data; the system prompt tells the model to treat them as data, never as
 * instructions.
 */
export function catalogDigest(
  catalog: BriefingCatalog,
  report: EvaluationReport,
  labelFor: (fact: CatalogFact) => string,
): CatalogDigest {
  return {
    catalogVersion: catalog.catalogVersion,
    inputFingerprint: catalog.inputFingerprint,
    facts: catalog.facts.map((fact) => ({
      id: fact.id,
      kind: fact.kind,
      sections: [...fact.sections],
      label: labelFor(fact),
      leadEligible: fact.leadEligible,
      required: fact.required,
    })),
    requiredFindingIds: [...catalog.requiredFindingIds],
    applicableReviewStepIds: catalog.reviewSteps
      .filter((step) => step.applicable)
      .map((step) => step.id),
    verdict: { dataStatus: report.dataStatus, planStatus: report.planStatus },
  };
}
