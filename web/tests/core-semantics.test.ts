import { describe, expect, it } from 'vitest';
import { evaluateBundle } from '@/domain/evaluateBundle';
import { evaluatePlan } from '@/domain/evaluatePlan';
import { parsePackMinutes, parsePickMinutes, parseTimeOffset } from '@/domain/parseFields';
import { projectReport } from '@/domain/report';
import { loadScenario } from '@/fixtures/loadScenario';
import type { Assignment, CanonicalDataset, InputBundle, SourceRef } from '@/domain/types';

/** Correctness properties that must survive every later change. */

describe('a missing numeric value is not a legitimate zero', () => {
  it('distinguishes blank from "0" at the scalar level', () => {
    expect(parsePackMinutes('')).toStrictEqual({ state: 'MISSING' });
    expect(parsePackMinutes('   ')).toStrictEqual({ state: 'MISSING' });
    expect(parsePackMinutes(null)).toStrictEqual({ state: 'MISSING' });
    expect(parsePackMinutes('0')).toStrictEqual({ state: 'VALID', value: 0 });
  });

  it('accepts a real zero packing duration but rejects a zero picking duration', () => {
    expect(parsePackMinutes('0').state).toBe('VALID');
    expect(parsePickMinutes('0').state).toBe('INVALID');
  });

  it('rejects lookalike numbers rather than coercing them', () => {
    for (const raw of ['20min', '1e2', '+5', '2.5', 'NaN', 'Infinity', '-1', ' 5 5 ']) {
      expect(parseTimeOffset(raw).state, raw).toBe('INVALID');
    }
    expect(parseTimeOffset('020')).toStrictEqual({ state: 'VALID', value: 20 });
  });

  it('changes the blank packing cell to a real 0 and gets an evaluated plan', () => {
    // Same fixture text, one blank replaced by an explicit zero. Blank blocks
    // evaluation; zero does not. Nothing else about the bundle differs.
    const blank = loadScenario('S02');
    const withZero: InputBundle = {
      origin: blank.origin,
      files: {
        ...blank.files,
        orders: {
          fileName: blank.files.orders!.fileName,
          profile: blank.files.orders!.profile,
          csvText: blank.files.orders!.csvText.replace('O-104,20,,D-1', 'O-104,20,0,D-1'),
        },
      },
    };

    expect(evaluateBundle(blank).dataStatus).toBe('INCOMPLETE');
    expect(evaluateBundle(blank).planStatus).toBe('NOT_EVALUATED');

    const zeroReport = evaluateBundle(withZero);
    expect(zeroReport.dataStatus).toBe('READY');
    expect(zeroReport.planStatus).toBe('PASS');
    const readiness = zeroReport.checks.find(
      (c) => c.ruleId === 'PLAN_READY_BY_DEPARTURE' && c.subjectIds[0] === 'O-104',
    );
    expect(readiness?.metrics.packMinutes).toBe(0);
    expect(readiness?.metrics.readyMinute).toBe(45);
  });
});

describe('half-open worker intervals: touching is not overlapping', () => {
  const ref = (id: string, column: string): SourceRef => ({
    table: 'plan',
    fileName: 'plan.csv',
    recordNumber: 2,
    column,
    rawValue: id,
  });

  function assignment(
    assignmentId: string,
    orderId: string,
    startMinute: number,
    endMinute: number,
  ): Assignment {
    return {
      assignmentId,
      orderId,
      workerId: 'W-1',
      startMinute,
      endMinute,
      source: {
        assignmentId: ref(assignmentId, 'assignment_id'),
        orderId: ref(orderId, 'order_id'),
        workerId: ref('W-1', 'worker_id'),
        startMinute: ref(String(startMinute), 'start_minute'),
        endMinute: ref(String(endMinute), 'end_minute'),
      },
    };
  }

  function datasetWith(assignments: Assignment[]): CanonicalDataset {
    const orderRef = (id: string, column: string): SourceRef => ({
      table: 'orders',
      fileName: 'orders.csv',
      recordNumber: 2,
      column,
      rawValue: id,
    });
    return {
      orders: assignments.map((a) => ({
        orderId: a.orderId,
        pickMinutes: 1,
        packMinutes: 0,
        departureId: 'D-1',
        source: {
          orderId: orderRef(a.orderId, 'order_id'),
          pickMinutes: orderRef('1', 'pick_minutes'),
          packMinutes: orderRef('0', 'pack_minutes'),
          departureId: orderRef('D-1', 'departure_id'),
        },
      })),
      departures: [
        {
          departureId: 'D-1',
          departureMinute: 720,
          source: {
            departureId: {
              table: 'departures',
              fileName: 'departures.csv',
              recordNumber: 2,
              column: 'departure_id',
              rawValue: 'D-1',
            },
            departureMinute: {
              table: 'departures',
              fileName: 'departures.csv',
              recordNumber: 2,
              column: 'departure_minute',
              rawValue: '720',
            },
          },
        },
      ],
      workers: [
        {
          workerId: 'W-1',
          availableFromMinute: 0,
          availableToMinute: 720,
          source: {
            workerId: {
              table: 'workers',
              fileName: 'workers.csv',
              recordNumber: 2,
              column: 'worker_id',
              rawValue: 'W-1',
            },
            availableFromMinute: {
              table: 'workers',
              fileName: 'workers.csv',
              recordNumber: 2,
              column: 'available_from_minute',
              rawValue: '0',
            },
            availableToMinute: {
              table: 'workers',
              fileName: 'workers.csv',
              recordNumber: 2,
              column: 'available_to_minute',
              rawValue: '720',
            },
          },
        },
      ],
      assignments,
    };
  }

  it('passes back-to-back intervals [0,20) and [20,35)', () => {
    const result = evaluatePlan(
      datasetWith([assignment('A-1', 'O-1', 0, 20), assignment('A-2', 'O-2', 20, 35)]),
    );
    const overlap = result.checks.filter((c) => c.ruleId === 'PLAN_WORKER_OVERLAP');
    expect(overlap).toHaveLength(1);
    expect(overlap[0].status).toBe('PASS');
    expect(overlap[0].metrics).toStrictEqual({ overlapMinutes: 0 });
  });

  it('fails a genuine one-minute overlap [0,20) and [19,35)', () => {
    const result = evaluatePlan(
      datasetWith([assignment('A-1', 'O-1', 0, 20), assignment('A-2', 'O-2', 19, 35)]),
    );
    const overlap = result.checks.filter((c) => c.ruleId === 'PLAN_WORKER_OVERLAP');
    expect(overlap[0].status).toBe('FAIL');
    expect(overlap[0].metrics).toStrictEqual({ overlapMinutes: 1 });
  });

  it('catches a nested interval that an adjacent-pairs-only check would miss', () => {
    // [0,60) fully contains [10,20). Sorted by start, the adjacent pairs are
    // (A-1,A-2) and (A-2,A-3); the nesting is only found by checking all pairs.
    const result = evaluatePlan(
      datasetWith([
        assignment('A-1', 'O-1', 0, 60),
        assignment('A-2', 'O-2', 10, 20),
        assignment('A-3', 'O-3', 60, 70),
      ]),
    );
    const overlap = result.checks.filter((c) => c.ruleId === 'PLAN_WORKER_OVERLAP');
    expect(overlap).toHaveLength(3);
    const failed = overlap.filter((c) => c.status === 'FAIL');
    expect(failed).toHaveLength(1);
    expect(failed[0].subjectIds).toStrictEqual(['A-1', 'A-2']);
    expect(failed[0].metrics).toStrictEqual({ overlapMinutes: 10 });
  });
});

describe('scenario and reset isolation', () => {
  it('running one case cannot mutate the baseline fixture', () => {
    const before = projectReport(evaluateBundle(loadScenario('S00')));

    // Evaluate the other demo cases in between, then reload the baseline.
    evaluateBundle(loadScenario('S01'));
    evaluateBundle(loadScenario('S02'));

    const after = projectReport(evaluateBundle(loadScenario('S00')));
    expect(after).toStrictEqual(before);
    expect(after.checkCounts).toStrictEqual({ passed: 44, failed: 0, blocked: 0 });
  });

  it('hands out an independent deep clone on every load', () => {
    const first = loadScenario('S00');
    const second = loadScenario('S00');
    expect(first).not.toBe(second);
    expect(first.files.orders).not.toBe(second.files.orders);

    // A caller mutating its own bundle must not affect the next load.
    first.files.orders!.csvText = 'order_id\n';
    expect(loadScenario('S00').files.orders!.csvText).toBe(second.files.orders!.csvText);
  });

  it('does not mutate a deep-frozen input bundle', () => {
    const bundle = loadScenario('S01');
    Object.freeze(bundle);
    Object.freeze(bundle.files);
    for (const file of Object.values(bundle.files)) if (file) Object.freeze(file);

    expect(() => evaluateBundle(bundle)).not.toThrow();
  });

  it('produces structurally identical output for the same input, run twice', () => {
    const first = projectReport(evaluateBundle(loadScenario('S01')));
    const second = projectReport(evaluateBundle(loadScenario('S01')));
    expect(second).toStrictEqual(first);
  });
});
