import type {
  CheckCounts,
  DataStatus,
  DiagnosticCode,
  EvaluationReport,
  PlanStatus,
  RuleId,
  TableKind,
} from './types';

/**
 * Projection of an actual EvaluationReport into the shape the independently
 * supplied expectations use (docs/05_FIXTURES_AND_ORACLES.md).
 *
 * scenarioId is attached by the comparison layer, never returned here, and no
 * expected value is ever read by this module.
 */

export interface ProjectedDiagnostic {
  code: DiagnosticCode;
  table: TableKind;
  recordNumber: number;
  column: string;
  relatedRecordNumbers?: number[];
}

export interface ProjectedFailedCheck {
  ruleId: RuleId;
  subjectIds: string[];
  metrics: Record<string, number>;
}

export interface ProjectedBlockedCheck {
  ruleId: RuleId;
  subjectIds: string[];
  blockedBy: string[];
}

export interface ProjectedReport {
  dataStatus: DataStatus;
  planStatus: PlanStatus;
  diagnostics: ProjectedDiagnostic[];
  failedChecks: ProjectedFailedCheck[];
  blockedChecks: ProjectedBlockedCheck[];
  checkCounts: CheckCounts;
  blockedRuleIds: RuleId[];
}

export function projectReport(report: EvaluationReport): ProjectedReport {
  const diagnostics: ProjectedDiagnostic[] = report.diagnostics.map((d) => {
    const projected: ProjectedDiagnostic = {
      code: d.code,
      table: d.table,
      recordNumber: d.source?.recordNumber ?? 0,
      column: d.source?.column ?? '',
    };
    // Optional properties are omitted rather than set to undefined.
    if (d.relatedRecordNumbers !== undefined) {
      projected.relatedRecordNumbers = d.relatedRecordNumbers.slice();
    }
    return projected;
  });

  return {
    dataStatus: report.dataStatus,
    planStatus: report.planStatus,
    diagnostics,
    failedChecks: report.checks
      .filter((c) => c.status === 'FAIL')
      .map((c) => ({
        ruleId: c.ruleId,
        subjectIds: c.subjectIds.slice(),
        metrics: { ...c.metrics },
      })),
    blockedChecks: report.checks
      .filter((c) => c.status === 'BLOCKED')
      .map((c) => ({
        ruleId: c.ruleId,
        subjectIds: c.subjectIds.slice(),
        blockedBy: c.blockedBy.slice(),
      })),
    checkCounts: { ...report.checkCounts },
    blockedRuleIds: report.blockedRuleIds.slice(),
  };
}
