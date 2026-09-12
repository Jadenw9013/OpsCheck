import { describe, expect, it } from 'vitest';
import { MAX_COLUMNS, MAX_CSV_BYTES, MAX_DATA_RECORDS } from '@/domain/constants';
import { checkCsvLimits, checkFileSize } from '@/features/importFile';

/**
 * The import boundary refuses over-limit files before the engine sees them.
 *
 * The point of these checks is that rejection is total: an over-limit file is
 * not truncated, previewed, or partially evaluated. Everything else that is
 * merely wrong with a file must pass this boundary, because a malformed export
 * is exactly what the report is supposed to explain.
 */

function csv(columns: number, records: number): string {
  const header = Array.from({ length: columns }, (_, i) => 'c' + i).join(',');
  const row = Array.from({ length: columns }, (_, i) => 'v' + i).join(',');
  return [header, ...Array.from({ length: records }, () => row)].join('\n');
}

describe('file size cap', () => {
  it('accepts a file at exactly the cap', () => {
    expect(checkFileSize(MAX_CSV_BYTES)).toBeNull();
  });

  it('rejects one byte over the cap and says so in bytes', () => {
    const message = checkFileSize(MAX_CSV_BYTES + 1);
    expect(message).not.toBeNull();
    expect(message).toContain(String(MAX_CSV_BYTES));
    expect(message).toContain('rejected rather than truncated');
  });
});

describe('record and column caps', () => {
  it('accepts a file at exactly both caps', () => {
    expect(checkCsvLimits(csv(MAX_COLUMNS, MAX_DATA_RECORDS))).toBeNull();
  });

  it('rejects one record over the cap', () => {
    const message = checkCsvLimits(csv(3, MAX_DATA_RECORDS + 1));
    expect(message).toContain(String(MAX_DATA_RECORDS + 1));
    expect(message).toContain('data records');
  });

  it('rejects one column over the cap', () => {
    const message = checkCsvLimits(csv(MAX_COLUMNS + 1, 1));
    expect(message).toContain(String(MAX_COLUMNS + 1));
    expect(message).toContain('columns');
  });
});

describe('problems that are diagnostics, not import refusals', () => {
  it('imports a file whose record width does not match its header', () => {
    expect(checkCsvLimits('order_id,pick_minutes\nO-101,20,extra\n')).toBeNull();
  });

  it('imports a file with a blank required cell', () => {
    expect(checkCsvLimits('order_id,pick_minutes\nO-101,\n')).toBeNull();
  });

  it('imports a file whose quoting is broken', () => {
    expect(checkCsvLimits('order_id,pick_minutes\n"O-101,20\n')).toBeNull();
  });

  it('imports a header-only file', () => {
    expect(checkCsvLimits('assignment_id,order_id,worker_id,start_minute,end_minute\n')).toBeNull();
  });
});
