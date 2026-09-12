import { describe, expect, it } from 'vitest';
import { evaluateBundle } from '@/domain/evaluateBundle';
import { buildExportPayload, reportFileName } from '@/features/exportReport';
import { loadScenario } from '@/fixtures/loadScenario';

/**
 * The export is a record of one evaluation, not a second opinion about it.
 *
 * It must carry the engine's own statuses and counts, must not carry the CSV
 * text, and must never make a blocked evaluation look like a passing one.
 */

const EXPORTED_AT = new Date(2026, 8, 11, 9, 5); // local time, 2026-09-11 09:05

function exportFor(scenarioId: string) {
  const bundle = loadScenario(scenarioId);
  const report = evaluateBundle(bundle);
  return {
    report,
    payload: buildExportPayload(bundle, report, { scenarioId, exportedAt: EXPORTED_AT }),
  };
}

describe('file name', () => {
  it('names the bundled case and pads the timestamp', () => {
    expect(reportFileName('S01', EXPORTED_AT)).toBe('opscheck-report-S01-202609110905.json');
  });

  it('says custom when the inputs are the user’s own', () => {
    expect(reportFileName(null, EXPORTED_AT)).toBe('opscheck-report-custom-202609110905.json');
  });
});

describe('payload contents', () => {
  it('carries the engine statuses, counts, and every check', () => {
    const { report, payload } = exportFor('S01');
    expect(payload.result.dataStatus).toBe('READY');
    expect(payload.result.planStatus).toBe('VIOLATIONS');
    expect(payload.result.checkCounts).toStrictEqual(report.checkCounts);
    expect(payload.result.checks).toHaveLength(report.checks.length);
    expect(payload.result.ruleCoverage).toStrictEqual(report.ruleCoverage);
  });

  it('keeps the cited source cells, so a finding stays traceable', () => {
    const { payload } = exportFor('S01');
    const failed = payload.result.checks.filter((c) => c.status === 'FAIL');
    expect(failed).toHaveLength(1);
    expect(failed[0].operands.map((o) => o.source)).toContainEqual({
      table: 'departures',
      fileName: 'departures.csv',
      recordNumber: 2,
      column: 'departure_minute',
      rawValue: '65',
    });
  });

  it('records provenance: the files, their profiles, and the data origin', () => {
    const { payload } = exportFor('S16');
    expect(payload.inputs.origin).toBe('SYNTHETIC');
    expect(payload.inputs.scenarioId).toBe('S16');
    const orders = payload.inputs.files.find((f) => f.table === 'orders');
    expect(orders?.profile).toBe('warehouse_b');
    expect(orders?.recordCount).toBe(8);
  });

  it('does not include the CSV text of any file', () => {
    const { payload } = exportFor('S00');
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('order_id,pick_minutes');
    expect(serialized).not.toContain('csvText');
    // The raw tables are the whole file content in another shape; also excluded.
    expect(serialized).not.toContain('rawTables');
  });

  it('exports a blocked evaluation as blocked, never as a pass', () => {
    const { payload } = exportFor('S02');
    expect(payload.result.dataStatus).toBe('INCOMPLETE');
    expect(payload.result.planStatus).toBe('NOT_EVALUATED');
    expect(payload.result.checks).toStrictEqual([]);
    expect(payload.result.checkCounts).toStrictEqual({ passed: 0, failed: 0, blocked: 0 });
    expect(payload.result.blockedRuleIds).toHaveLength(5);
    expect(payload.result.diagnostics.length).toBeGreaterThan(0);
  });

  it('states what a result does not establish', () => {
    const { payload } = exportFor('S00');
    expect(payload.result.planStatus).toBe('PASS');
    expect(payload.limitations.join(' ')).toContain('does not establish optimality');
    expect(payload.limitations.join(' ')).toContain('blocked is not the same as passed');
  });

  it('is deterministic for the same inputs and timestamp', () => {
    expect(exportFor('S01').payload).toStrictEqual(exportFor('S01').payload);
  });
});
