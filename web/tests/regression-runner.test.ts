import { describe, expect, it } from 'vitest';
import {
  firstDifference,
  runRegressionSuite,
  summarizeRegression,
} from '@/features/regression';

/**
 * The in-app sweep must agree with `fixture-oracles.test.ts`.
 *
 * That test is the authority: it compares the same projection against the same
 * frozen expectations with `toStrictEqual`. If this runner reported a pass the
 * test suite would not, the dashboard would be showing a green badge the
 * contract does not support, so the two are pinned together here.
 */

describe('in-app regression sweep', () => {
  const results = runRegressionSuite();

  it('covers all eighteen frozen cases exactly once', () => {
    expect(results).toHaveLength(18);
    expect(new Set(results.map((r) => r.scenarioId)).size).toBe(18);
  });

  it('reports every case as matching its frozen expectation', () => {
    const notPassing = results.filter((r) => r.status !== 'PASS');
    // Named explicitly so a regression says which case broke and why.
    expect(notPassing.map((r) => r.scenarioId + ': ' + r.detail)).toStrictEqual([]);
  });

  it('aggregates to eighteen of eighteen', () => {
    expect(summarizeRegression(results)).toStrictEqual({
      total: 18,
      passed: 18,
      failed: 0,
      errored: 0,
    });
  });

  it('carries the engine-computed summary for each case, not a restated one', () => {
    const s01 = results.find((r) => r.scenarioId === 'S01');
    expect(s01?.actual).toStrictEqual({
      dataStatus: 'READY',
      planStatus: 'VIOLATIONS',
      checkCounts: { passed: 43, failed: 1, blocked: 0 },
      diagnosticCount: 0,
    });
    expect(s01?.actual).toStrictEqual(s01?.expected);
  });

  it('reports a blocked case as blocked rather than as zero failures', () => {
    const s02 = results.find((r) => r.scenarioId === 'S02');
    expect(s02?.actual?.dataStatus).toBe('INCOMPLETE');
    expect(s02?.actual?.planStatus).toBe('NOT_EVALUATED');
    expect(s02?.actual?.checkCounts).toStrictEqual({ passed: 0, failed: 0, blocked: 0 });
    expect(s02?.actual?.diagnosticCount).toBeGreaterThan(0);
  });

  it('is repeatable: a second sweep produces identical results', () => {
    expect(runRegressionSuite()).toStrictEqual(results);
  });
});

describe('the comparison actually detects a mismatch', () => {
  const expected = {
    dataStatus: 'READY',
    checkCounts: { passed: 43, failed: 1, blocked: 0 },
    diagnostics: [{ code: 'DATA_MISSING_VALUE', recordNumber: 5 }],
  };

  it('accepts an identical structure', () => {
    expect(firstDifference(structuredClone(expected), expected, '')).toBeNull();
  });

  it('catches a changed number deep in the structure', () => {
    const actual = structuredClone(expected);
    actual.checkCounts.failed = 0;
    expect(firstDifference(actual, expected, '')).toBe(
      'checkCounts.failed: expected 1, got 0',
    );
  });

  it('catches a missing key', () => {
    const actual: Record<string, unknown> = structuredClone(expected);
    delete actual.dataStatus;
    expect(firstDifference(actual, expected, '')).toContain('dataStatus');
  });

  it('catches an unexpected extra key', () => {
    const actual = { ...structuredClone(expected), planStatus: 'PASS' };
    expect(firstDifference(actual, expected, '')).toContain('planStatus');
  });

  it('catches a differing array length', () => {
    const actual = { ...structuredClone(expected), diagnostics: [] };
    expect(firstDifference(actual, expected, '')).toBe(
      'diagnostics: expected 1 entry, got 0',
    );
  });

  it('catches a changed value inside an array entry', () => {
    const actual = structuredClone(expected);
    actual.diagnostics[0].recordNumber = 6;
    expect(firstDifference(actual, expected, '')).toBe(
      'diagnostics[0].recordNumber: expected 5, got 6',
    );
  });

  it('does not treat a different type as equal', () => {
    expect(firstDifference({ ...expected, dataStatus: ['READY'] }, expected, '')).toContain(
      'dataStatus',
    );
  });
});
