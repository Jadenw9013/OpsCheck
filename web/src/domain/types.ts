/**
 * Normative domain types. See docs/03_DATA_CONTRACTS.md and
 * docs/04_VALIDATION_ENGINE.md. Field names here are part of the contract.
 *
 * Nothing in src/domain may import React, browser globals, node:fs, network
 * clients, randomness, the clock, fixture names, or expected results.
 */

export type TableKind = 'orders' | 'departures' | 'workers' | 'plan';
export type ProfileId = 'standard' | 'warehouse_b';
export type DataOrigin = 'SYNTHETIC' | 'USER_SUPPLIED_UNVERIFIED';

export interface InputFile {
  fileName: string;
  profile: ProfileId;
  csvText: string;
}

export interface InputBundle {
  origin: DataOrigin;
  files: Record<TableKind, InputFile | null>;
}

export interface SourceRef {
  table: TableKind;
  fileName: string;
  /** Logical CSV record number; the header is record 1. Not a physical line number. */
  recordNumber: number;
  /** Actual source header, or the expected header when the column is absent. */
  column: string;
  rawValue: string | null;
}

export type OrderField = 'orderId' | 'pickMinutes' | 'packMinutes' | 'departureId';
export type DepartureField = 'departureId' | 'departureMinute';
export type WorkerField = 'workerId' | 'availableFromMinute' | 'availableToMinute';
export type AssignmentField =
  | 'assignmentId'
  | 'orderId'
  | 'workerId'
  | 'startMinute'
  | 'endMinute';

export interface Order {
  orderId: string;
  pickMinutes: number;
  packMinutes: number;
  departureId: string;
  source: Record<OrderField, SourceRef>;
}

export interface Departure {
  departureId: string;
  departureMinute: number;
  source: Record<DepartureField, SourceRef>;
}

export interface Worker {
  workerId: string;
  availableFromMinute: number;
  availableToMinute: number;
  source: Record<WorkerField, SourceRef>;
}

export interface Assignment {
  assignmentId: string;
  orderId: string;
  workerId: string;
  startMinute: number;
  endMinute: number;
  source: Record<AssignmentField, SourceRef>;
}

export interface CanonicalDataset {
  orders: Order[];
  departures: Departure[];
  workers: Worker[];
  assignments: Assignment[];
}

/** A raw table preserved for source inspection, independent of canonical parsing. */
export interface RawRecord {
  /** Logical record number; header is 1, so data records start at 2. */
  recordNumber: number;
  cells: string[];
}

export interface RawTable {
  table: TableKind;
  fileName: string | null;
  profile: ProfileId | null;
  /** Original header text, untrimmed. Empty when the header could not be read. */
  headers: string[];
  records: RawRecord[];
  /** True when structural parsing failed and no records could be preserved. */
  unreadable: boolean;
  /** Headers present in the file that the profile does not map. */
  ignoredColumns: string[];
}

export type DataStatus = 'READY' | 'INCOMPLETE' | 'INVALID';
export type DiagnosticKind = 'MISSING_DATA' | 'INVALID_DATA';

export type DiagnosticCode =
  | 'DATA_MISSING_FILE'
  | 'DATA_MISSING_HEADER'
  | 'DATA_EMPTY_TABLE'
  | 'DATA_MISSING_VALUE'
  | 'DATA_CSV_ERROR'
  | 'DATA_INVALID_HEADER'
  | 'DATA_DUPLICATE_HEADER'
  | 'DATA_ROW_WIDTH'
  | 'DATA_LIMIT_EXCEEDED'
  | 'DATA_UNSUPPORTED_PROFILE'
  | 'DATA_INVALID_ID'
  | 'DATA_INVALID_NUMBER'
  | 'DATA_INVALID_INTERVAL'
  | 'DATA_DUPLICATE_ID'
  | 'DATA_UNKNOWN_REFERENCE';

export interface DataDiagnostic {
  key: string;
  code: DiagnosticCode;
  kind: DiagnosticKind;
  message: string;
  table: TableKind;
  source: SourceRef | null;
  relatedSources: SourceRef[];
  relatedRecordNumbers?: number[];
}

export type PlanStatus = 'NOT_EVALUATED' | 'PASS' | 'VIOLATIONS';
export type CheckStatus = 'PASS' | 'FAIL' | 'BLOCKED';

export type RuleId =
  | 'PLAN_ASSIGNMENT_COUNT'
  | 'PLAN_PICK_DURATION'
  | 'PLAN_WORKER_AVAILABILITY'
  | 'PLAN_WORKER_OVERLAP'
  | 'PLAN_READY_BY_DEPARTURE';

/**
 * Unit of a numeric operand.
 *
 * MINUTE_OFFSET is a position on the synthetic clock and may be shown as a
 * clock time. DURATION_MINUTES is a length of time and must never be rendered
 * as one. The field is absent for identifiers and for any value whose unit the
 * engine does not assert, so a presenter that finds no unit must not claim one.
 */
export type OperandUnit = 'MINUTE_OFFSET' | 'DURATION_MINUTES';

export interface Operand {
  label: string;
  value: string | number;
  unit?: OperandUnit;
  source: SourceRef;
}

export interface CheckResult {
  key: string;
  ruleId: RuleId;
  subjectIds: string[];
  status: CheckStatus;
  summary: string;
  formula: string | null;
  operands: Operand[];
  metrics: Record<string, number>;
  blockedBy: string[];
}

export interface CheckCounts {
  passed: number;
  failed: number;
  blocked: number;
}

export interface RuleCoverage extends CheckCounts {
  ruleId: RuleId;
  status: 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_APPLICABLE';
}

export interface EvaluationReport {
  schemaVersion: '1.0';
  origin: DataOrigin;
  dataStatus: DataStatus;
  planStatus: PlanStatus;
  diagnostics: DataDiagnostic[];
  checks: CheckResult[];
  checkCounts: CheckCounts;
  ruleCoverage: RuleCoverage[];
  blockedRuleIds: RuleId[];
  rawTables: Record<TableKind, RawTable>;
  dataset: CanonicalDataset | null;
}
