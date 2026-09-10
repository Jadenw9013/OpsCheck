import { RULE_LABEL, formatClock } from '@/domain/constants';
import type {
  CheckResult,
  DataDiagnostic,
  EvaluationReport,
  Operand,
  OperandUnit,
  SourceRef,
} from '@/domain/types';
import type { CatalogFact } from './contracts';

/**
 * Application-owned wording. Every publishable sentence is produced here from
 * the authoritative engine result; the model never contributes text.
 *
 * No operational arithmetic happens in this file. Metrics are read from the
 * engine's own check results and printed. Units are honoured: a duration is
 * never rendered as a time of day.
 */

export const ASSUMPTIONS: readonly string[] = [
  'Packing is modeled as a fixed delay that begins the moment picking ends. Its duration is an assumed input, not a measurement.',
  'Packing capacity is not modeled: no queue, staging, loading, or transport is represented.',
  'Time is an integer minute offset from a synthetic 08:00 on a single day. Worker intervals are half-open, so an assignment ending when another begins does not overlap.',
];

export const LIMITATIONS: readonly string[] = [
  'All inputs are synthetic. This prototype has no connection to any live system.',
  'Only the five implemented rule families were evaluated. Passing them is not proof of optimality, real-world feasibility, or safety.',
  'OpsCheck checks a submitted plan. It does not build, optimize, or repair one, and it issues no operational approval.',
];

const REVIEW_STEP_TEXT: Record<string, string> = {
  REVIEW_TIMING_WITH_OPS:
    'Review the submitted picking timing, the assumed packing duration, and the departure time with operations.',
  CONFIRM_MISSING_INPUT:
    'Confirm the missing required value at its source before assessing the plan. No value was assumed in its place.',
  CORRECT_INVALID_INPUT:
    'Correct the invalid input at its source so it parses within the documented contract.',
  RERUN_AFTER_CHANGES: 'Rerun checks after any confirmed input change.',
  NO_ACTION_RECORD_RUN:
    'No input problem or modeled violation was found in this run. Record the run and its inputs.',
};

export function reviewStepText(id: string): string | null {
  return REVIEW_STEP_TEXT[id] ?? null;
}

/** Mirrors the evidence panel: only a MINUTE_OFFSET may be shown as a clock. */
export function formatOperandValue(
  value: string | number,
  unit: OperandUnit | undefined,
): string {
  if (typeof value !== 'number') return String(value);
  if (unit === 'MINUTE_OFFSET') {
    const clock = formatClock(value);
    return clock === null ? value + ' min (outside modeled window)' : value + ' min (' + clock + ')';
  }
  if (unit === 'DURATION_MINUTES') return value + ' min';
  return String(value);
}

function statusWord(report: EvaluationReport): string {
  if (report.dataStatus !== 'READY') {
    return report.dataStatus === 'INCOMPLETE'
      ? 'required input data is missing'
      : 'input data is invalid';
  }
  if (report.planStatus === 'VIOLATIONS') return 'the submitted plan has modeled violations';
  if (report.planStatus === 'PASS') return 'the submitted plan passed the implemented checks';
  return 'the plan was not fully evaluated';
}

/** The engine-owned headline shown above any AI-assisted content. */
export function verdictHeadline(report: EvaluationReport): string {
  const c = report.checkCounts;
  if (report.dataStatus !== 'READY') {
    return (
      'Plan not evaluated: ' +
      statusWord(report) +
      '. All five rule families are blocked, and a blocked rule is not a passed rule.'
    );
  }
  return (
    'Checks complete: ' +
    statusWord(report) +
    '. ' +
    c.passed +
    ' passed, ' +
    c.failed +
    ' failed, ' +
    c.blocked +
    ' blocked.'
  );
}

export interface StatementText {
  text: string;
  detail: string | null;
  isAssumption: boolean;
}

/** A short label for the catalog digest sent to the provider. */
export function factLabel(
  fact: CatalogFact,
  report: EvaluationReport,
): string {
  const rendered = renderFact(fact, report, 'concise');
  return rendered === null ? fact.id : rendered.text;
}

function findCheck(report: EvaluationReport, key: string): CheckResult | undefined {
  return report.checks.find((c) => c.key === key);
}

function findDiagnostic(report: EvaluationReport, key: string): DataDiagnostic | undefined {
  return report.diagnostics.find((d) => d.key === key);
}

/**
 * Renders one catalog fact. Returns null when its authoritative result cannot
 * be found, which the provenance gate treats as a rejection rather than
 * rendering a sentence with no backing.
 */
export function renderFact(
  fact: CatalogFact,
  report: EvaluationReport,
  detailLevel: 'concise' | 'explained',
): StatementText | null {
  switch (fact.templateId) {
    case 'RUN_SUMMARY': {
      const c = report.checkCounts;
      const text =
        'OpsCheck evaluated the submitted plan against five implemented rule families: ' +
        statusWord(report) +
        '.';
      const detail =
        detailLevel === 'explained'
          ? 'Recorded outcome: data ' +
            report.dataStatus +
            ', plan ' +
            report.planStatus +
            ', with ' +
            c.passed +
            ' checks passed, ' +
            c.failed +
            ' failed and ' +
            c.blocked +
            ' blocked.'
          : null;
      return { text, detail, isAssumption: false };
    }

    case 'RULE_COVERAGE': {
      const parts = report.ruleCoverage.map(
        (r) => RULE_LABEL[r.ruleId] + ': ' + r.status.toLowerCase().replace('_', ' '),
      );
      return {
        text: 'Rule coverage for this run - ' + parts.join('; ') + '.',
        detail: null,
        isAssumption: false,
      };
    }

    case 'READINESS_VIOLATION': {
      if (fact.resultRef.kind !== 'check') return null;
      const check = findCheck(report, fact.resultRef.key);
      if (!check) return null;
      return {
        text: check.summary,
        detail:
          detailLevel === 'explained'
            ? readinessDetail(check)
            : null,
        // The packing duration in this chain is an assumed input.
        isAssumption: false,
      };
    }

    case 'GENERIC_VIOLATION': {
      if (fact.resultRef.kind !== 'check') return null;
      const check = findCheck(report, fact.resultRef.key);
      if (!check) return null;
      const blocked =
        check.status === 'BLOCKED'
          ? ' This check was blocked by ' + check.blockedBy.join(', ') + ' and was not evaluated.'
          : '';
      return {
        text: check.summary + blocked,
        detail:
          detailLevel === 'explained' && check.formula
            ? RULE_LABEL[check.ruleId] + ': ' + check.formula
            : null,
        isAssumption: false,
      };
    }

    case 'DATA_DIAGNOSTIC': {
      if (fact.resultRef.kind !== 'diagnostic') return null;
      const diagnostic = findDiagnostic(report, fact.resultRef.key);
      if (!diagnostic) return null;
      const detail =
        detailLevel === 'explained'
          ? 'Diagnostic ' +
            diagnostic.code +
            ' on the ' +
            diagnostic.table +
            ' table. While input data is not ready, all five plan rule families are blocked.'
          : null;
      return { text: diagnostic.message, detail, isAssumption: false };
    }
  }
}

/** Operand chain for a readiness check, printed from engine values only. */
function readinessDetail(check: CheckResult): string {
  const parts = check.operands.map(
    (operand: Operand) =>
      operand.label + ' ' + formatOperandValue(operand.value, operand.unit),
  );
  const formula = check.formula ? ' Calculation: ' + check.formula + '.' : '';
  return (
    parts.join('; ') +
    '.' +
    formula +
    ' The packing duration is an assumed fixed delay, not a measured or reserved packing slot.'
  );
}

/**
 * Source chips for a fact. Only evidence that resolves in the current snapshot
 * is offered; the provenance gate rejects anything that does not.
 */
export function factSources(
  fact: CatalogFact,
  report: EvaluationReport,
): Array<{ label: string; source: SourceRef }> {
  if (fact.resultRef.kind === 'check') {
    const check = findCheck(report, fact.resultRef.key);
    if (!check) return [];
    return check.operands.map((o) => ({ label: o.label, source: o.source }));
  }
  if (fact.resultRef.kind === 'diagnostic') {
    const diagnostic = findDiagnostic(report, fact.resultRef.key);
    if (!diagnostic) return [];
    const list: Array<{ label: string; source: SourceRef }> = [];
    if (diagnostic.source) list.push({ label: 'Reported cell', source: diagnostic.source });
    for (const related of diagnostic.relatedSources) {
      list.push({ label: 'Record ' + related.recordNumber, source: related });
    }
    return list;
  }
  return [];
}
