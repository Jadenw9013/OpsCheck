import Papa from 'papaparse';
import { MAX_COLUMNS, MAX_CSV_BYTES, MAX_DATA_RECORDS } from './constants';

/**
 * Structural CSV parsing boundary. Papa Parse in array mode with explicit
 * settings; no split(','), no dynamic typing, no header-object renaming.
 * See docs/03_DATA_CONTRACTS.md section 3.
 */

export interface ParsedRecord {
  /** Logical record number; the header is record 1. */
  recordNumber: number;
  cells: string[];
}

export type StructuralErrorCode =
  | 'DATA_CSV_ERROR'
  | 'DATA_INVALID_HEADER'
  | 'DATA_DUPLICATE_HEADER'
  | 'DATA_ROW_WIDTH'
  | 'DATA_LIMIT_EXCEEDED';

export interface StructuralError {
  code: StructuralErrorCode;
  message: string;
  /** Logical record the problem is anchored at; 1 for header-level problems. */
  recordNumber: number;
  /** Source column when the problem is column-specific. */
  column: string | null;
}

export interface CsvParseResult {
  /** Original header text, untrimmed, in source order. */
  headers: string[];
  /** Trimmed header text, used for matching. */
  trimmedHeaders: string[];
  /** Non-blank data records with their original logical record numbers. */
  records: ParsedRecord[];
  /** Structural failures. Non-empty means the table cannot be canonicalized. */
  errors: StructuralError[];
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

function isBlankRecord(cells: string[]): boolean {
  return cells.length === 1 && cells[0].trim() === '';
}

export function parseCsv(csvText: string): CsvParseResult {
  const errors: StructuralError[] = [];
  const empty: CsvParseResult = { headers: [], trimmedHeaders: [], records: [], errors };

  if (byteLength(csvText) > MAX_CSV_BYTES) {
    errors.push({
      code: 'DATA_LIMIT_EXCEEDED',
      message: `File exceeds the ${MAX_CSV_BYTES}-byte demo limit. Oversize input is rejected, never truncated.`,
      recordNumber: 1,
      column: null,
    });
    return empty;
  }

  // Strip a UTF-8 BOM at the start only.
  const text = csvText.charCodeAt(0) === 0xfeff ? csvText.slice(1) : csvText;

  const parsed = Papa.parse<string[]>(text, {
    header: false,
    dynamicTyping: false,
    skipEmptyLines: false,
    delimiter: ',',
    newline: undefined,
  });

  // Field-count mismatches are reported by our own width check against the
  // header, which produces a contract-specified record number.
  const fatal = parsed.errors.filter((e) => e.type !== 'FieldMismatch');
  if (fatal.length > 0) {
    const first = fatal[0];
    errors.push({
      code: 'DATA_CSV_ERROR',
      message: `CSV could not be parsed: ${first.message}`,
      recordNumber: typeof first.row === 'number' ? first.row + 1 : 1,
      column: null,
    });
    return empty;
  }

  const rows = parsed.data;
  if (rows.length === 0 || isBlankRecord(rows[0])) {
    errors.push({
      code: 'DATA_INVALID_HEADER',
      message: 'The header record is empty. Record 1 must contain the column headers.',
      recordNumber: 1,
      column: null,
    });
    return empty;
  }

  const headers = rows[0];
  const trimmedHeaders = headers.map((h) => h.trim());

  if (trimmedHeaders.every((h) => h === '')) {
    errors.push({
      code: 'DATA_INVALID_HEADER',
      message: 'The header record has no named columns.',
      recordNumber: 1,
      column: null,
    });
    return empty;
  }

  if (headers.length > MAX_COLUMNS) {
    errors.push({
      code: 'DATA_LIMIT_EXCEEDED',
      message: `Header declares ${headers.length} columns; the demo limit is ${MAX_COLUMNS}.`,
      recordNumber: 1,
      column: null,
    });
    return empty;
  }

  // Duplicate trimmed headers, including duplicated unused columns.
  const seenHeaders = new Map<string, number>();
  const reportedDuplicates = new Set<string>();
  for (const trimmed of trimmedHeaders) {
    const count = (seenHeaders.get(trimmed) ?? 0) + 1;
    seenHeaders.set(trimmed, count);
    if (count === 2 && !reportedDuplicates.has(trimmed)) {
      reportedDuplicates.add(trimmed);
      errors.push({
        code: 'DATA_DUPLICATE_HEADER',
        message: `Header "${trimmed}" appears more than once. Column names must be unique.`,
        recordNumber: 1,
        column: trimmed,
      });
    }
  }
  if (errors.length > 0) return { headers, trimmedHeaders, records: [], errors };

  const records: ParsedRecord[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    const cells = rows[i];
    const recordNumber = i + 1; // header is record 1
    if (isBlankRecord(cells)) continue; // ignored; later record numbers do not shift
    if (cells.length !== headers.length) {
      errors.push({
        code: 'DATA_ROW_WIDTH',
        message: `Record ${recordNumber} has ${cells.length} fields; the header declares ${headers.length}.`,
        recordNumber,
        column: null,
      });
      continue;
    }
    records.push({ recordNumber, cells });
  }

  if (records.length > MAX_DATA_RECORDS) {
    errors.push({
      code: 'DATA_LIMIT_EXCEEDED',
      message: `File has ${records.length} data records; the demo limit is ${MAX_DATA_RECORDS}.`,
      recordNumber: 1,
      column: null,
    });
    return { headers, trimmedHeaders, records: [], errors };
  }

  return { headers, trimmedHeaders, records, errors };
}
