import { describe, expect, it } from 'vitest';
import { evaluateBundle } from '@/domain/evaluateBundle';
import { projectReport, type ProjectedReport } from '@/domain/report';
import { loadScenario } from '@/fixtures/loadScenario';
import expectedJson from '@/fixtures/expected-results.json';

/**
 * Frozen-fixture parity: every supplied scenario is compared against the
 * independently supplied expectations using the documented projection.
 *
 * The expectations are normative and are never edited to accommodate the
 * implementation.
 */

interface Expectation extends ProjectedReport {
  scenarioId: string;
}

const expectations = (expectedJson as { expectations: Expectation[] }).expectations;

function expectationFor(scenarioId: string): Expectation {
  const found = expectations.find((e) => e.scenarioId === scenarioId);
  if (!found) throw new Error('No supplied expectation for ' + scenarioId);
  return found;
}

const ALL_CASES = expectations.map((e) => e.scenarioId);

describe('frozen-fixture parity with the supplied expectations', () => {
  it('covers every supplied expectation', () => {
    expect(ALL_CASES).toHaveLength(18);
  });

  for (const scenarioId of ALL_CASES) {
    it(scenarioId + ' actual report matches the independent expectation', () => {
      const expectation = expectationFor(scenarioId);
      const { scenarioId: _ignored, ...expectedProjection } = expectation;
      void _ignored;

      const actual = projectReport(evaluateBundle(loadScenario(scenarioId)));

      expect(actual).toStrictEqual(expectedProjection);
    });
  }
});

describe('S01 ten-minute miss carries its real source references', () => {
  const report = evaluateBundle(loadScenario('S01'));
  const failed = report.checks.filter((c) => c.status === 'FAIL');

  it('produces exactly one failing check on the readiness rule', () => {
    expect(failed).toHaveLength(1);
    expect(failed[0].ruleId).toBe('PLAN_READY_BY_DEPARTURE');
    expect(failed[0].subjectIds).toStrictEqual(['O-104']);
  });

  it('computes 45 + 30 = 75 against a departure at 65', () => {
    expect(failed[0].metrics).toStrictEqual({
      pickEndMinute: 45,
      packMinutes: 30,
      readyMinute: 75,
      departureMinute: 65,
      slackMinutes: -10,
      lateMinutes: 10,
    });
  });

  it('marks packing as a duration and the endpoints as clock offsets', () => {
    // A duration must never be presentable as a time of day: 30 packing minutes
    // is not 08:30. The engine declares the unit so the UI cannot guess wrong.
    const byLabel = new Map(failed[0].operands.map((o) => [o.label, o]));
    expect(byLabel.get('Assumed packing')?.unit).toBe('DURATION_MINUTES');
    expect(byLabel.get('Picking ends')?.unit).toBe('MINUTE_OFFSET');
    expect(byLabel.get('Departure')?.unit).toBe('MINUTE_OFFSET');
    // Identifiers carry no unit at all.
    expect(byLabel.get('Departure reference')?.unit).toBeUndefined();
  });

  it('points at the three documented source cells', () => {
    const refs = failed[0].operands.map((o) => o.source);
    expect(refs).toContainEqual({
      table: 'plan',
      fileName: 'plan.csv',
      recordNumber: 5,
      column: 'end_minute',
      rawValue: '45',
    });
    expect(refs).toContainEqual({
      table: 'orders',
      fileName: 'orders.csv',
      recordNumber: 5,
      column: 'pack_minutes',
      rawValue: '30',
    });
    expect(refs).toContainEqual({
      table: 'departures',
      fileName: 'departures.csv',
      recordNumber: 2,
      column: 'departure_minute',
      rawValue: '65',
    });
  });
});

describe('S02 blocks operational evaluation instead of assuming zero', () => {
  const report = evaluateBundle(loadScenario('S02'));

  it('reports INCOMPLETE data and an unevaluated plan', () => {
    expect(report.dataStatus).toBe('INCOMPLETE');
    expect(report.planStatus).toBe('NOT_EVALUATED');
  });

  it('runs no plan checks at all', () => {
    expect(report.checks).toStrictEqual([]);
    expect(report.checkCounts).toStrictEqual({ passed: 0, failed: 0, blocked: 0 });
  });

  it('blocks all five rule families', () => {
    expect(report.blockedRuleIds).toStrictEqual([
      'PLAN_ASSIGNMENT_COUNT',
      'PLAN_PICK_DURATION',
      'PLAN_WORKER_AVAILABILITY',
      'PLAN_WORKER_OVERLAP',
      'PLAN_READY_BY_DEPARTURE',
    ]);
    expect(report.ruleCoverage.every((r) => r.status === 'BLOCKED')).toBe(true);
  });

  it('exposes the real blank cell rather than a zero', () => {
    const missing = report.diagnostics.filter((d) => d.code === 'DATA_MISSING_VALUE');
    expect(missing).toHaveLength(1);
    expect(missing[0].source).toStrictEqual({
      table: 'orders',
      fileName: 'orders.csv',
      recordNumber: 5,
      column: 'pack_minutes',
      rawValue: '',
    });
  });

  it('keeps all four raw tables inspectable', () => {
    for (const table of ['orders', 'departures', 'workers', 'plan'] as const) {
      expect(report.rawTables[table].records.length).toBeGreaterThan(0);
      expect(report.rawTables[table].unreadable).toBe(false);
    }
  });
});
