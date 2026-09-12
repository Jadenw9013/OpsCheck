import { compareCodePoint } from '@/domain/constants';
import { evaluateBundle } from '@/domain/evaluateBundle';
import { projectReport, type ProjectedReport } from '@/domain/report';
import type { CheckCounts, DataStatus, PlanStatus } from '@/domain/types';
import expectedJson from '@/fixtures/expected-results.json';
import { loadScenario, scenarioList } from '@/fixtures/loadScenario';

/**
 * In-app regression sweep over the frozen fixtures.
 *
 * This is the same comparison `tests/fixture-oracles.test.ts` performs: every
 * bundled case is evaluated, projected with `projectReport`, and compared
 * field-for-field against the independently supplied expectation. The
 * expectations are normative and are never adjusted to accommodate the
 * implementation, so a mismatch here is reported as a failure, never absorbed.
 *
 * Pure: no React, no clock, no network. It reads the bundled SYNTHETIC
 * fixtures only and cannot see or change the inputs loaded in the workspace.
 */

interface Expectation extends ProjectedReport {
  scenarioId: string;
}

const expectations = (expectedJson as { expectations: Expectation[] }).expectations;

export type RegressionStatus = 'PASS' | 'FAIL' | 'ERROR';

/** The headline numbers of one projected report, for the results table. */
export interface RegressionSummary {
  dataStatus: DataStatus;
  planStatus: PlanStatus;
  checkCounts: CheckCounts;
  diagnosticCount: number;
}

export interface RegressionResult {
  scenarioId: string;
  title: string;
  status: RegressionStatus;
  /** What matched, or the first field that did not. */
  detail: string;
  /** The frozen expectation, absent when there is none for this case. */
  expected: RegressionSummary | null;
  /** The actual evaluation, absent when it could not be produced. */
  actual: RegressionSummary | null;
}

export interface RegressionTotals {
  total: number;
  passed: number;
  failed: number;
  errored: number;
}

function summarize(projection: ProjectedReport): RegressionSummary {
  return {
    dataStatus: projection.dataStatus,
    planStatus: projection.planStatus,
    checkCounts: { ...projection.checkCounts },
    diagnosticCount: projection.diagnostics.length,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function show(value: unknown): string {
  return JSON.stringify(value) ?? String(value);
}

function join(path: string, key: string): string {
  return path === '' ? key : path + '.' + key;
}

/**
 * The first difference between an actual projection and its expectation, or
 * null when they are identical.
 *
 * A key present on only one side is a difference, not something to skip: an
 * expectation that omits a field expects it to be absent. Exported so that the
 * comparison itself can be tested for actually detecting a mismatch; a
 * dashboard whose comparison always agreed would be worthless.
 */
export function firstDifference(
  actual: unknown,
  expected: unknown,
  path: string,
): string | null {
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual)) {
      return path + ': expected ' + show(expected) + ', got ' + show(actual);
    }
    if (expected.length !== actual.length) {
      return (
        path +
        ': expected ' +
        expected.length +
        (expected.length === 1 ? ' entry' : ' entries') +
        ', got ' +
        actual.length
      );
    }
    for (let i = 0; i < expected.length; i += 1) {
      const diff = firstDifference(actual[i], expected[i], path + '[' + i + ']');
      if (diff !== null) return diff;
    }
    return null;
  }

  if (isPlainObject(expected) || isPlainObject(actual)) {
    if (!isPlainObject(expected) || !isPlainObject(actual)) {
      return path + ': expected ' + show(expected) + ', got ' + show(actual);
    }
    const keys = Array.from(
      new Set([...Object.keys(expected), ...Object.keys(actual)]),
    ).sort(compareCodePoint);
    for (const key of keys) {
      const inExpected = Object.hasOwn(expected, key);
      const inActual = Object.hasOwn(actual, key);
      if (inExpected !== inActual) {
        return (
          join(path, key) +
          (inExpected
            ? ': expected ' + show(expected[key]) + ', absent from the actual report'
            : ': present in the actual report as ' + show(actual[key]) + ', not expected')
        );
      }
      const diff = firstDifference(actual[key], expected[key], join(path, key));
      if (diff !== null) return diff;
    }
    return null;
  }

  if (!Object.is(expected, actual)) {
    return path + ': expected ' + show(expected) + ', got ' + show(actual);
  }
  return null;
}

function evaluateCase(scenarioId: string, title: string): RegressionResult {
  const expectation = expectations.find((e) => e.scenarioId === scenarioId);
  if (expectation === undefined) {
    return {
      scenarioId,
      title,
      status: 'ERROR',
      detail: 'No frozen expectation exists for this case, so nothing can be compared.',
      expected: null,
      actual: null,
    };
  }

  const { scenarioId: _ignored, ...expectedProjection } = expectation;
  void _ignored;

  let actual: ProjectedReport;
  try {
    actual = projectReport(evaluateBundle(loadScenario(scenarioId)));
  } catch (error) {
    return {
      scenarioId,
      title,
      status: 'ERROR',
      detail:
        'Evaluation threw: ' +
        (error instanceof Error ? error.message : 'an unexpected error occurred.'),
      expected: summarize(expectedProjection),
      actual: null,
    };
  }

  const difference = firstDifference(actual, expectedProjection, '');
  return {
    scenarioId,
    title,
    status: difference === null ? 'PASS' : 'FAIL',
    detail:
      difference === null ? 'Matches the frozen expectation exactly.' : difference,
    expected: summarize(expectedProjection),
    actual: summarize(actual),
  };
}

/**
 * Runs every bundled case against its frozen expectation, in pack order.
 *
 * An expectation with no bundled case is reported too: a silently skipped
 * oracle would be indistinguishable from a passing one.
 */
export function runRegressionSuite(): RegressionResult[] {
  const results = scenarioList.map((s) => evaluateCase(s.id, s.title));

  const covered = new Set(results.map((r) => r.scenarioId));
  for (const expectation of expectations) {
    if (covered.has(expectation.scenarioId)) continue;
    results.push({
      scenarioId: expectation.scenarioId,
      title: 'Not bundled',
      status: 'ERROR',
      detail: 'A frozen expectation exists, but no bundled case produces this input.',
      expected: summarize(expectation),
      actual: null,
    });
  }

  return results;
}

export function summarizeRegression(results: RegressionResult[]): RegressionTotals {
  return {
    total: results.length,
    passed: results.filter((r) => r.status === 'PASS').length,
    failed: results.filter((r) => r.status === 'FAIL').length,
    errored: results.filter((r) => r.status === 'ERROR').length,
  };
}
