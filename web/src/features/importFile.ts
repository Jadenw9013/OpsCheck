import { MAX_COLUMNS, MAX_CSV_BYTES, MAX_DATA_RECORDS } from '@/domain/constants';
import { parseCsv } from '@/domain/parseCsv';

/**
 * The import boundary for user-supplied CSV files.
 *
 * Reading a File is a browser concern, so it happens here and never inside
 * `src/domain`: the engine only ever receives text. The demo caps from
 * docs/02_ARCHITECTURE_AND_SETUP.md are enforced before that text reaches the
 * engine, and an over-limit file is rejected with a visible reason rather than
 * truncated, previewed, or partially evaluated.
 *
 * The record and column caps are not re-implemented here. `parseCsv` already
 * owns them, so this module runs the same parser the engine will run and
 * surfaces only its limit failure. Every other structural problem (bad quoting,
 * a duplicated header, a short record) is a real diagnostic the report is meant
 * to explain, so it must not block the import.
 */

/** What the native file picker offers. Not a validation step. */
export const CSV_FILE_ACCEPT = '.csv,text/csv';

/**
 * Checked against `File.size` before the read starts, so an oversize file is
 * never pulled into memory at all.
 */
export function checkFileSize(byteSize: number): string | null {
  if (byteSize <= MAX_CSV_BYTES) return null;
  return (
    'This file is ' +
    byteSize +
    ' bytes. The demo limit is ' +
    MAX_CSV_BYTES +
    ' bytes, and oversize input is rejected rather than truncated.'
  );
}

/** Record-count and column-count caps, reported in the parser's own words. */
export function checkCsvLimits(csvText: string): string | null {
  const limit = parseCsv(csvText).errors.find((e) => e.code === 'DATA_LIMIT_EXCEEDED');
  return limit ? limit.message : null;
}

/** The caps, for the interface copy that states them up front. */
export const IMPORT_LIMITS = {
  maxBytes: MAX_CSV_BYTES,
  maxRecords: MAX_DATA_RECORDS,
  maxColumns: MAX_COLUMNS,
} as const;

/**
 * Reads a picked file as UTF-8 text. Rejects with a message fit to show in the
 * slot; a read failure is an import error and publishes no report.
 */
export function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error('The file could not be read. Nothing was imported.'));
    reader.onabort = () => reject(new Error('Reading the file was cancelled.'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('The file could not be read as UTF-8 text.'));
        return;
      }
      resolve(result);
    };
    reader.readAsText(file, 'utf-8');
  });
}
