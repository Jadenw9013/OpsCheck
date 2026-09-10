import { RULE_ORDER } from '@/domain/constants';
import { parseTimeOffset } from '@/domain/parseFields';
import type {
  CheckResult,
  CheckStatus,
  DataDiagnostic,
  EvaluationReport,
  RuleId,
  SourceRef,
  TableKind,
} from '@/domain/types';
import type { InputPreview } from './inputPreview';

/**
 * Pure presentation assembly. It only rearranges values the engine already
 * produced; it never recomputes a duration, a ready time, or a slack.
 */

export type Finding =
  | { id: string; kind: 'diagnostic'; diagnostic: DataDiagnostic }
  | { id: string; kind: 'check'; check: CheckResult };

export interface FindingGroups {
  diagnostics: Finding[];
  failed: Finding[];
  blocked: Finding[];
  passed: Finding[];
  /** The single most important finding to lead with, if any. */
  headline: Finding | null;
}

export function diagnosticFindingId(diagnostic: DataDiagnostic): string {
  return 'diag::' + diagnostic.key;
}

export function checkFindingId(check: CheckResult): string {
  return 'check::' + check.key;
}

export function groupFindings(report: EvaluationReport | null): FindingGroups {
  if (report === null) {
    return { diagnostics: [], failed: [], blocked: [], passed: [], headline: null };
  }

  const diagnostics: Finding[] = report.diagnostics.map((d) => ({
    id: diagnosticFindingId(d),
    kind: 'diagnostic',
    diagnostic: d,
  }));

  const asFinding = (c: CheckResult): Finding => ({
    id: checkFindingId(c),
    kind: 'check',
    check: c,
  });

  const failed = report.checks.filter((c) => c.status === 'FAIL').map(asFinding);
  const blocked = report.checks.filter((c) => c.status === 'BLOCKED').map(asFinding);
  const passed = report.checks.filter((c) => c.status === 'PASS').map(asFinding);

  const headline = failed[0] ?? diagnostics[0] ?? blocked[0] ?? null;

  return { diagnostics, failed, blocked, passed, headline };
}

export function findFinding(groups: FindingGroups, id: string | null): Finding | null {
  if (id === null) return null;
  const all = [...groups.diagnostics, ...groups.failed, ...groups.blocked, ...groups.passed];
  return all.find((f) => f.id === id) ?? null;
}

/** All source cells a finding can navigate to, in stable order. */
export function findingSources(finding: Finding): Array<{ label: string; source: SourceRef }> {
  if (finding.kind === 'diagnostic') {
    const list: Array<{ label: string; source: SourceRef }> = [];
    if (finding.diagnostic.source) {
      list.push({ label: 'Reported cell', source: finding.diagnostic.source });
    }
    finding.diagnostic.relatedSources.forEach((source, index) => {
      list.push({ label: 'Related record ' + source.recordNumber, source });
      void index;
    });
    return list;
  }
  return finding.check.operands.map((o) => ({ label: o.label, source: o.source }));
}

// ---- Submitted plan table ------------------------------------------------

export type ReadyState = 'VALUE' | 'NOT_EVALUATED';

export interface PlanRow {
  key: string;
  /** Plan record number, or null for a declared order with no assignment. */
  recordNumber: number | null;
  assignmentId: string;
  orderId: string;
  workerId: string;
  startText: string;
  endText: string;
  /** Engine-derived columns; null before evaluation or when the rule is blocked. */
  pickRequired: number | null;
  packAssumed: number | null;
  departureId: string | null;
  departureMinute: number | null;
  readyMinute: number | null;
  /** Minutes past departure, taken from the engine's readiness metrics. */
  lateMinutes: number | null;
  readyState: ReadyState;
  rowStatus: 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_EVALUATED';
  /** Finding ids for checks whose subjects include this row. */
  findingIds: string[];
}

const EMPTY = '—';

/**
 * Before evaluation, rows show only literal source text and every derived
 * column reads "Not evaluated". After evaluation, derived columns are read
 * straight out of the engine's check metrics.
 */
export function buildPlanRows(
  preview: InputPreview,
  report: EvaluationReport | null,
): PlanRow[] {
  if (report === null || report.dataset === null) {
    return rawPlanRows(preview);
  }

  const { dataset } = report;
  const readyByOrder = new Map<string, CheckResult>();
  const countByOrder = new Map<string, CheckResult>();
  for (const check of report.checks) {
    if (check.ruleId === 'PLAN_READY_BY_DEPARTURE') readyByOrder.set(check.subjectIds[0], check);
    if (check.ruleId === 'PLAN_ASSIGNMENT_COUNT') countByOrder.set(check.subjectIds[0], check);
  }

  const checksBySubject = new Map<string, CheckResult[]>();
  for (const check of report.checks) {
    for (const subject of check.subjectIds) {
      const list = checksBySubject.get(subject);
      if (list) list.push(check);
      else checksBySubject.set(subject, [check]);
    }
  }

  const orderById = new Map(dataset.orders.map((o) => [o.orderId, o]));
  const departureById = new Map(dataset.departures.map((d) => [d.departureId, d]));
  const assignedOrderIds = new Set(dataset.assignments.map((a) => a.orderId));

  const rows: PlanRow[] = dataset.assignments.map((a) => {
    const order = orderById.get(a.orderId);
    const departure = order ? departureById.get(order.departureId) : undefined;
    const ready = readyByOrder.get(a.orderId);
    const evaluatedReady = ready && ready.status !== 'BLOCKED' ? ready : null;
    const readyMinute =
      evaluatedReady && typeof evaluatedReady.metrics.readyMinute === 'number'
        ? evaluatedReady.metrics.readyMinute
        : null;
    const lateMinutes =
      evaluatedReady && typeof evaluatedReady.metrics.lateMinutes === 'number'
        ? evaluatedReady.metrics.lateMinutes
        : null;

    const related = [
      ...(checksBySubject.get(a.assignmentId) ?? []),
      ...(ready ? [ready] : []),
      ...(countByOrder.get(a.orderId) ? [countByOrder.get(a.orderId) as CheckResult] : []),
    ];

    return {
      key: 'a:' + a.assignmentId,
      recordNumber: a.source.assignmentId.recordNumber,
      assignmentId: a.assignmentId,
      orderId: a.orderId,
      workerId: a.workerId,
      startText: String(a.startMinute),
      endText: String(a.endMinute),
      pickRequired: order ? order.pickMinutes : null,
      packAssumed: order ? order.packMinutes : null,
      departureId: order ? order.departureId : null,
      departureMinute: departure ? departure.departureMinute : null,
      readyMinute,
      lateMinutes,
      readyState: readyMinute === null ? 'NOT_EVALUATED' : 'VALUE',
      rowStatus: rowStatusOf(related),
      findingIds: dedupe(bySeverity(related).map(checkFindingId)),
    };
  });

  // Declared orders with no assignment still need a visible row.
  for (const order of dataset.orders) {
    if (assignedOrderIds.has(order.orderId)) continue;
    const related = [
      ...(countByOrder.get(order.orderId) ? [countByOrder.get(order.orderId) as CheckResult] : []),
      ...(readyByOrder.get(order.orderId) ? [readyByOrder.get(order.orderId) as CheckResult] : []),
    ];
    const departure = departureById.get(order.departureId);
    rows.push({
      key: 'o:' + order.orderId,
      recordNumber: null,
      assignmentId: EMPTY,
      orderId: order.orderId,
      workerId: EMPTY,
      startText: EMPTY,
      endText: EMPTY,
      pickRequired: order.pickMinutes,
      packAssumed: order.packMinutes,
      departureId: order.departureId,
      departureMinute: departure ? departure.departureMinute : null,
      readyMinute: null,
      lateMinutes: null,
      readyState: 'NOT_EVALUATED',
      rowStatus: rowStatusOf(related),
      findingIds: dedupe(bySeverity(related).map(checkFindingId)),
    });
  }

  return rows;
}

function rowStatusOf(checks: CheckResult[]): PlanRow['rowStatus'] {
  if (checks.length === 0) return 'NOT_EVALUATED';
  if (checks.some((c) => c.status === 'FAIL')) return 'FAIL';
  if (checks.some((c) => c.status === 'BLOCKED')) return 'BLOCKED';
  return 'PASS';
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values));
}

const SEVERITY: Record<CheckStatus, number> = { FAIL: 0, BLOCKED: 1, PASS: 2 };

/**
 * Most important first, so selecting a row leads with the reason it is
 * interesting. A row that fails a rule must not open on an unrelated passed
 * check. Ties keep engine order, which is already stable.
 */
function bySeverity(checks: CheckResult[]): CheckResult[] {
  return checks
    .map((check, index) => ({ check, index }))
    .sort((a, b) =>
      SEVERITY[a.check.status] - SEVERITY[b.check.status] || a.index - b.index,
    )
    .map((entry) => entry.check);
}

/** Literal source text only: no joins, no derived values. */
function rawPlanRows(preview: InputPreview): PlanRow[] {
  const plan = preview.plan;
  if (plan.mapping === null) return [];

  const index = new Map<string, number>();
  plan.raw.headers.forEach((h, i) => {
    const trimmed = h.trim();
    if (!index.has(trimmed)) index.set(trimmed, i);
  });

  const cellFor = (cells: string[], field: string): string => {
    const column = plan.mapping?.find((m) => m.field === field)?.column;
    if (column === undefined) return EMPTY;
    const at = index.get(column);
    if (at === undefined) return EMPTY;
    const value = cells[at];
    return value === undefined || value.trim() === '' ? EMPTY : value;
  };

  return plan.raw.records.map((record) => ({
    key: 'r:' + record.recordNumber,
    recordNumber: record.recordNumber,
    assignmentId: cellFor(record.cells, 'assignmentId'),
    orderId: cellFor(record.cells, 'orderId'),
    workerId: cellFor(record.cells, 'workerId'),
    startText: cellFor(record.cells, 'startMinute'),
    endText: cellFor(record.cells, 'endMinute'),
    pickRequired: null,
    packAssumed: null,
    departureId: null,
    departureMinute: null,
    readyMinute: null,
    lateMinutes: null,
    readyState: 'NOT_EVALUATED' as ReadyState,
    rowStatus: 'NOT_EVALUATED' as const,
    findingIds: [],
  }));
}

// ---- Rule coverage -------------------------------------------------------

export interface CoverageRow {
  ruleId: RuleId;
  label: string;
  status: 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_APPLICABLE';
  passed: number;
  failed: number;
  blocked: number;
}

export function coverageRows(
  report: EvaluationReport | null,
  labels: Record<RuleId, string>,
): CoverageRow[] {
  return RULE_ORDER.map((ruleId) => {
    const found = report?.ruleCoverage.find((r) => r.ruleId === ruleId);
    return {
      ruleId,
      label: labels[ruleId],
      status: found?.status ?? 'BLOCKED',
      passed: found?.passed ?? 0,
      failed: found?.failed ?? 0,
      blocked: found?.blocked ?? 0,
    };
  });
}

export interface SourceTarget {
  table: TableKind;
  recordNumber: number;
  column: string;
  /** Increments on every navigation so repeat clicks re-trigger the reveal. */
  nonce: number;
}

// ---- Order timeline ------------------------------------------------------

/**
 * Presentation geometry for the schedule.
 *
 * This adapter positions values; it never decides them. Every minute it plots
 * is either a submitted input parsed with the domain's own parser or a value
 * the engine already published on a check result. It does not add, subtract, or
 * compare durations to reach a verdict, so it cannot disagree with the report.
 */

export interface TimelineSegment {
  startMinute: number;
  endMinute: number;
}

export interface TimelineRow {
  key: string;
  orderId: string;
  workerId: string;
  assignmentId: string;
  /** Submitted picking interval, or null when the submitted text is unusable. */
  pick: TimelineSegment | null;
  /** Modeled packing: from picking end to the engine's ready minute. */
  pack: TimelineSegment | null;
  /** Overrun from departure to modeled ready, only for a failed readiness check. */
  overrun: TimelineSegment | null;
  departureId: string | null;
  departureMinute: number | null;
  readyMinute: number | null;
  lateMinutes: number | null;
  status: PlanRow['rowStatus'];
  findingIds: string[];
  /** Set when the row cannot be plotted, so the UI explains instead of guessing. */
  note: string | null;
}

export interface TimelineAxis {
  minMinute: number;
  maxMinute: number;
  ticks: number[];
}

export interface TimelineModel {
  rows: TimelineRow[];
  axis: TimelineAxis;
  /** True only when a current report evaluated the plan. */
  evaluated: boolean;
  /** True when a current report exists but data readiness blocked the rules. */
  blocked: boolean;
}

const TICK_STEPS = [15, 30, 60, 120, 180];
const MIN_SPAN = 15;

/** Percent offset of a minute along the axis, clamped to the plotted range. */
export function axisPercent(axis: TimelineAxis, minute: number): number {
  const span = axis.maxMinute - axis.minMinute;
  if (span <= 0) return 0;
  const ratio = (minute - axis.minMinute) / span;
  return Math.min(100, Math.max(0, ratio * 100));
}

/** Width of a segment in percent; never negative, never NaN. */
export function segmentPercent(axis: TimelineAxis, segment: TimelineSegment): number {
  const left = axisPercent(axis, segment.startMinute);
  const right = axisPercent(axis, segment.endMinute);
  return Math.max(0, right - left);
}

function usableOffset(text: string): number | null {
  const outcome = parseTimeOffset(text);
  return outcome.state === 'VALID' ? outcome.value : null;
}

function buildAxis(values: number[]): TimelineAxis {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) {
    return { minMinute: 0, maxMinute: 60, ticks: [0, 15, 30, 45, 60] };
  }

  let lo = Math.floor(Math.min(...finite) / MIN_SPAN) * MIN_SPAN;
  let hi = Math.ceil(Math.max(...finite) / MIN_SPAN) * MIN_SPAN;
  if (lo > 0 && lo <= MIN_SPAN * 2) lo = 0;
  // A zero-width or inverted range would divide by zero downstream.
  if (hi - lo < MIN_SPAN) hi = lo + MIN_SPAN;

  const span = hi - lo;
  // Labels are 14px now, so fewer, well-spaced ticks read better than a dense
  // row that collides. Gridlines still mark every tick that is drawn.
  const step = TICK_STEPS.find((s) => span / s <= 5) ?? Math.ceil(span / 5);

  const ticks: number[] = [];
  for (let t = lo; t <= hi; t += step) ticks.push(t);
  if (ticks[ticks.length - 1] !== hi) ticks.push(hi);

  return { minMinute: lo, maxMinute: hi, ticks };
}

/**
 * Before evaluation only the submitted picking interval is plotted. Modeled
 * packing, the readiness point, and any overrun appear only once a current
 * report has published them for that order.
 */
export function buildTimeline(
  rows: PlanRow[],
  report: EvaluationReport | null,
): TimelineModel {
  const evaluated = report !== null && report.dataStatus === 'READY';
  const blocked = report !== null && report.dataStatus !== 'READY';

  const timelineRows: TimelineRow[] = rows.map((row) => {
    const start = usableOffset(row.startText);
    const end = usableOffset(row.endText);
    const pick =
      start !== null && end !== null && end > start
        ? { startMinute: start, endMinute: end }
        : null;

    // Packing runs from the submitted picking end to the engine's ready minute.
    const pack =
      evaluated && pick !== null && row.readyMinute !== null && row.readyMinute > pick.endMinute
        ? { startMinute: pick.endMinute, endMinute: row.readyMinute }
        : null;

    const overrun =
      evaluated &&
      row.rowStatus === 'FAIL' &&
      row.readyMinute !== null &&
      row.departureMinute !== null &&
      row.readyMinute > row.departureMinute
        ? { startMinute: row.departureMinute, endMinute: row.readyMinute }
        : null;

    let note: string | null = null;
    if (pick === null) {
      note =
        row.startText === row.endText && row.startText === '\u2014'
          ? 'No assignment was submitted for this order.'
          : 'The submitted start and end cannot be read as a forward interval.';
    }

    return {
      key: row.key,
      orderId: row.orderId,
      workerId: row.workerId,
      assignmentId: row.assignmentId,
      pick,
      pack,
      overrun,
      departureId: evaluated ? row.departureId : null,
      departureMinute: evaluated ? row.departureMinute : null,
      readyMinute: evaluated ? row.readyMinute : null,
      lateMinutes: evaluated ? row.lateMinutes : null,
      status: evaluated ? row.rowStatus : 'NOT_EVALUATED',
      findingIds: row.findingIds,
      note,
    };
  });

  const values: number[] = [];
  for (const row of timelineRows) {
    if (row.pick) values.push(row.pick.startMinute, row.pick.endMinute);
    if (row.pack) values.push(row.pack.endMinute);
    if (row.departureMinute !== null) values.push(row.departureMinute);
    if (row.readyMinute !== null) values.push(row.readyMinute);
  }

  return { rows: timelineRows, axis: buildAxis(values), evaluated, blocked };
}
