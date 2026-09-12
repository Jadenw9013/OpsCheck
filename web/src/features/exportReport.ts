import { TABLE_ORDER } from '@/domain/constants';
import type {
  CheckCounts,
  CheckResult,
  DataDiagnostic,
  DataOrigin,
  DataStatus,
  EvaluationReport,
  InputBundle,
  PlanStatus,
  ProfileId,
  RuleCoverage,
  RuleId,
  TableKind,
} from '@/domain/types';

/**
 * JSON export of one current evaluation.
 *
 * The payload is the engine's own result plus the provenance needed to read it:
 * which files were loaded, under which mapping profile, and whether the data
 * was synthetic or user-supplied. Nothing here recomputes or reinterprets a
 * result, and only a current report is ever exported.
 *
 * The CSV text itself is deliberately excluded. The individual cells the checks
 * and diagnostics cite are kept, because they are what makes a finding
 * traceable, but no file content is copied into the export.
 */

export interface ExportedFile {
  table: TableKind;
  fileName: string | null;
  profile: ProfileId | null;
  /** Non-blank data records the engine preserved, header excluded. */
  recordCount: number;
}

export interface ReportExport {
  tool: {
    name: 'OpsCheck';
    description: string;
    reportSchemaVersion: EvaluationReport['schemaVersion'];
  };
  /** Wall-clock label from the browser. It is not part of the engine result. */
  exportedAt: string;
  inputs: {
    /** The bundled case, or null when the user's own files are loaded. */
    scenarioId: string | null;
    origin: DataOrigin;
    files: ExportedFile[];
  };
  result: {
    dataStatus: DataStatus;
    planStatus: PlanStatus;
    checkCounts: CheckCounts;
    blockedRuleIds: RuleId[];
    ruleCoverage: RuleCoverage[];
    diagnostics: DataDiagnostic[];
    checks: CheckResult[];
  };
  limitations: string[];
}

export interface ExportMeta {
  scenarioId: string | null;
  exportedAt: Date;
}

/**
 * Stated in the file itself, so an exported report cannot be forwarded as a
 * broader claim than the engine actually made.
 */
const LIMITATIONS: string[] = [
  'This report states only that the implemented checks were run against these inputs. It does not establish optimality, real-world feasibility, safety, or that no better plan exists.',
  'Times are integer minute offsets from a synthetic 08:00 on a single day. There are no dates, time zones, or overnight shifts.',
  'Packing is modeled as a fixed delay after picking with unlimited packing capacity; queueing, staging, loading, and transport are not modeled.',
  'Worker intervals are half-open, so an assignment ending at the minute another begins does not overlap.',
  'When data status is not READY, no plan rule was run: blocked is not the same as passed.',
  'Record numbers are logical CSV records, with the header as record 1. They are not physical line numbers.',
];

export function buildExportPayload(
  bundle: InputBundle,
  report: EvaluationReport,
  meta: ExportMeta,
): ReportExport {
  const files: ExportedFile[] = TABLE_ORDER.map((table) => {
    const file = bundle.files[table];
    return {
      table,
      fileName: file?.fileName ?? null,
      profile: file?.profile ?? null,
      // The engine's own count, not a second parse of the text.
      recordCount: report.rawTables[table].records.length,
    };
  });

  return {
    tool: {
      name: 'OpsCheck',
      description:
        'Independent prototype. Deterministic validation of a submitted picking plan against synthetic warehouse exports. No connection to any live system.',
      reportSchemaVersion: report.schemaVersion,
    },
    exportedAt: meta.exportedAt.toISOString(),
    inputs: {
      scenarioId: meta.scenarioId,
      origin: report.origin,
      files,
    },
    result: {
      dataStatus: report.dataStatus,
      planStatus: report.planStatus,
      checkCounts: { ...report.checkCounts },
      blockedRuleIds: report.blockedRuleIds.slice(),
      ruleCoverage: report.ruleCoverage.map((r) => ({ ...r })),
      diagnostics: report.diagnostics,
      checks: report.checks,
    },
    limitations: LIMITATIONS,
  };
}

function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

/** `opscheck-report-<case>-<YYYYMMDDHHmm>.json`, in the browser's local time. */
export function reportFileName(scenarioId: string | null, exportedAt: Date): string {
  const stamp =
    exportedAt.getFullYear() +
    twoDigits(exportedAt.getMonth() + 1) +
    twoDigits(exportedAt.getDate()) +
    twoDigits(exportedAt.getHours()) +
    twoDigits(exportedAt.getMinutes());
  return 'opscheck-report-' + (scenarioId ?? 'custom') + '-' + stamp + '.json';
}

/**
 * Saves the payload as a file. The caller must pass a current report: the
 * button that reaches this is disabled whenever the result is not current, so a
 * superseded run cannot be downloaded as if it described these inputs.
 */
export function downloadReportJson(
  bundle: InputBundle,
  report: EvaluationReport,
  meta: { scenarioId: string | null },
): void {
  const exportedAt = new Date();
  const payload = buildExportPayload(bundle, report, { ...meta, exportedAt });
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = reportFileName(meta.scenarioId, exportedAt);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
