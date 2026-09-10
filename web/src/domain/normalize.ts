import type { CanonicalField, TableMapping } from './profiles';
import { parseCsv, type ParsedRecord, type StructuralError } from './parseCsv';
import {
  parseIdentifier,
  parsePackMinutes,
  parsePickMinutes,
  parseTimeOffset,
  type ScalarOutcome,
} from './parseFields';
import type { InputFile, RawTable, SourceRef, TableKind } from './types';

/**
 * Turns one raw CSV file plus its explicitly selected mapping profile into a
 * preserved raw table and per-record field outcomes carrying source refs.
 *
 * Row-level parsing stops when a structural prerequisite fails, so a missing
 * column never produces one fake blank-cell error per data row.
 */

export interface FieldOutcome {
  field: CanonicalField;
  /** Actual source header text, or the expected header when absent. */
  column: string;
  source: SourceRef;
  outcome: ScalarOutcome<string> | ScalarOutcome<number>;
}

export interface NormalizedRecord {
  recordNumber: number;
  fields: Map<CanonicalField, FieldOutcome>;
}

export interface NormalizedTable {
  table: TableKind;
  raw: RawTable;
  /** Empty when the table is not structurally available. */
  records: NormalizedRecord[];
  /** Structural failures from parsing (malformed CSV, width, limits, headers). */
  structuralErrors: StructuralError[];
  /** Required headers that the profile expects but the file does not contain. */
  missingHeaders: string[];
  /** True when the slot has no file at all. */
  fileMissing: boolean;
  /** True when the table/profile pairing is unsupported. */
  unsupportedProfile: boolean;
  /**
   * True when headers and structure are sound, so row-level diagnostics,
   * key indexes, and reference targets from this table are trustworthy.
   */
  structurallyAvailable: boolean;
}

function emptyRaw(table: TableKind, file: InputFile | null): RawTable {
  return {
    table,
    fileName: file?.fileName ?? null,
    profile: file?.profile ?? null,
    headers: [],
    records: [],
    unreadable: true,
    ignoredColumns: [],
  };
}

function makeSourceRef(
  table: TableKind,
  fileName: string,
  recordNumber: number,
  column: string,
  rawValue: string | null,
): SourceRef {
  return { table, fileName, recordNumber, column, rawValue };
}

function parseByKind(
  kind: TableMapping[number]['kind'],
  raw: string | null,
): ScalarOutcome<string> | ScalarOutcome<number> {
  switch (kind) {
    case 'identifier':
      return parseIdentifier(raw);
    case 'pickMinutes':
      return parsePickMinutes(raw);
    case 'packMinutes':
      return parsePackMinutes(raw);
    case 'timeOffset':
      return parseTimeOffset(raw);
  }
}

export function normalizeTable(
  table: TableKind,
  file: InputFile | null,
  mapping: TableMapping | null,
): NormalizedTable {
  const base = {
    table,
    records: [] as NormalizedRecord[],
    structuralErrors: [] as StructuralError[],
    missingHeaders: [] as string[],
    fileMissing: false,
    unsupportedProfile: false,
    structurallyAvailable: false,
  };

  if (file === null) {
    return { ...base, raw: emptyRaw(table, null), fileMissing: true };
  }
  if (mapping === null) {
    return { ...base, raw: emptyRaw(table, file), unsupportedProfile: true };
  }

  const parsed = parseCsv(file.csvText);

  const mappedColumns = new Set(mapping.map((m) => m.column));
  const ignoredColumns = parsed.trimmedHeaders.filter(
    (h) => h !== '' && !mappedColumns.has(h),
  );

  const raw: RawTable = {
    table,
    fileName: file.fileName,
    profile: file.profile,
    headers: parsed.headers,
    records: parsed.records.map((r: ParsedRecord) => ({
      recordNumber: r.recordNumber,
      cells: r.cells.slice(),
    })),
    unreadable: parsed.headers.length === 0,
    ignoredColumns,
  };

  if (parsed.errors.length > 0) {
    return { ...base, raw, structuralErrors: parsed.errors };
  }

  // Case-sensitive matching of trimmed headers to the profile's columns.
  const columnIndex = new Map<string, number>();
  parsed.trimmedHeaders.forEach((h, i) => {
    if (!columnIndex.has(h)) columnIndex.set(h, i);
  });

  const missingHeaders = mapping
    .filter((m) => !columnIndex.has(m.column))
    .map((m) => m.column);

  if (missingHeaders.length > 0) {
    return { ...base, raw, missingHeaders };
  }

  const records: NormalizedRecord[] = parsed.records.map((record) => {
    const fields = new Map<CanonicalField, FieldOutcome>();
    for (const m of mapping) {
      const index = columnIndex.get(m.column) as number;
      const cell = record.cells[index] ?? null;
      fields.set(m.field, {
        field: m.field,
        column: m.column,
        source: makeSourceRef(table, file.fileName, record.recordNumber, m.column, cell),
        outcome: parseByKind(m.kind, cell),
      });
    }
    return { recordNumber: record.recordNumber, fields };
  });

  return { ...base, raw, records, structurallyAvailable: true };
}
