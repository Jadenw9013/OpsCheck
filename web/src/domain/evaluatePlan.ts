import { RULE_ORDER, compareCodePoint, formatClock } from './constants';
import type {
  Assignment,
  CanonicalDataset,
  CheckCounts,
  CheckResult,
  Departure,
  Operand,
  Order,
  PlanStatus,
  RuleCoverage,
  RuleId,
  Worker,
} from './types';

/**
 * Plan rules R1-R5 (docs/04_VALIDATION_ENGINE.md section 4).
 *
 * These run only for a READY canonical dataset. Every numeric explanation is
 * produced here, so components format results rather than recomputing them.
 * Nothing here inspects a scenario id, title, or expected outcome.
 */

export interface PlanEvaluation {
  planStatus: PlanStatus;
  checks: CheckResult[];
  checkCounts: CheckCounts;
  ruleCoverage: RuleCoverage[];
}

function checkKey(ruleId: RuleId, subjectIds: string[]): string {
  return ruleId + ':' + subjectIds.join(':');
}

function minuteWithClock(minute: number): string {
  const clock = formatClock(minute);
  return clock === null
    ? minute + ' min (outside modeled window)'
    : minute + ' min (' + clock + ')';
}

function plural(n: number, singular: string): string {
  return n + ' ' + singular + (n === 1 ? '' : 's');
}

export function evaluatePlan(dataset: CanonicalDataset): PlanEvaluation {
  const orderById = new Map<string, Order>(dataset.orders.map((o) => [o.orderId, o]));
  const departureById = new Map<string, Departure>(
    dataset.departures.map((d) => [d.departureId, d]),
  );
  const workerById = new Map<string, Worker>(dataset.workers.map((w) => [w.workerId, w]));

  const assignmentsByOrder = new Map<string, Assignment[]>();
  for (const a of dataset.assignments) {
    const list = assignmentsByOrder.get(a.orderId);
    if (list) list.push(a);
    else assignmentsByOrder.set(a.orderId, [a]);
  }

  const checks: CheckResult[] = [];

  // ---- R1 PLAN_ASSIGNMENT_COUNT: one check per declared order ------------
  for (const order of dataset.orders) {
    const matches = assignmentsByOrder.get(order.orderId) ?? [];
    const n = matches.length;
    const operands: Operand[] = [
      { label: 'Order', value: order.orderId, source: order.source.orderId },
    ];
    for (const a of matches) {
      operands.push({
        label: 'Assignment ' + a.assignmentId,
        value: a.assignmentId,
        source: a.source.assignmentId,
      });
      operands.push({
        label: 'Assignment ' + a.assignmentId + ' order reference',
        value: a.orderId,
        source: a.source.orderId,
      });
    }
    checks.push({
      key: checkKey('PLAN_ASSIGNMENT_COUNT', [order.orderId]),
      ruleId: 'PLAN_ASSIGNMENT_COUNT',
      subjectIds: [order.orderId],
      status: n === 1 ? 'PASS' : 'FAIL',
      summary:
        n === 1
          ? order.orderId + ' has exactly 1 picking assignment.'
          : order.orderId +
            ' has ' +
            plural(n, 'picking assignment') +
            '; exactly 1 is required.',
      formula: null,
      operands,
      metrics: { assignmentCount: n },
      blockedBy: [],
    });
  }

  // ---- R2 PLAN_PICK_DURATION: one check per declared assignment ----------
  for (const a of dataset.assignments) {
    const order = orderById.get(a.orderId) as Order;
    const allocatedMinutes = a.endMinute - a.startMinute;
    const requiredMinutes = order.pickMinutes;
    const shortfallMinutes = Math.max(0, requiredMinutes - allocatedMinutes);
    const pass = allocatedMinutes >= requiredMinutes;
    checks.push({
      key: checkKey('PLAN_PICK_DURATION', [a.assignmentId]),
      ruleId: 'PLAN_PICK_DURATION',
      subjectIds: [a.assignmentId],
      status: pass ? 'PASS' : 'FAIL',
      summary: pass
        ? a.assignmentId +
          ' allocates ' +
          allocatedMinutes +
          ' min for ' +
          a.orderId +
          ', which needs ' +
          requiredMinutes +
          ' min.'
        : a.assignmentId +
          ' allocates ' +
          allocatedMinutes +
          ' min but ' +
          a.orderId +
          ' needs ' +
          requiredMinutes +
          ' min, short by ' +
          shortfallMinutes +
          ' min.',
      formula:
        a.endMinute +
        ' - ' +
        a.startMinute +
        ' = ' +
        allocatedMinutes +
        '; ' +
        allocatedMinutes +
        (pass ? ' >= ' : ' < ') +
        requiredMinutes,
      operands: [
        {
          label: 'Assignment start',
          value: a.startMinute,
          unit: 'MINUTE_OFFSET',
          source: a.source.startMinute,
        },
        {
          label: 'Assignment end',
          value: a.endMinute,
          unit: 'MINUTE_OFFSET',
          source: a.source.endMinute,
        },
        {
          label: 'Required picking minutes',
          value: requiredMinutes,
          unit: 'DURATION_MINUTES',
          source: order.source.pickMinutes,
        },
      ],
      metrics: { allocatedMinutes, requiredMinutes, shortfallMinutes },
      blockedBy: [],
    });
  }

  // ---- R3 PLAN_WORKER_AVAILABILITY: one check per assignment -------------
  for (const a of dataset.assignments) {
    const worker = workerById.get(a.workerId) as Worker;
    const withinStart = worker.availableFromMinute <= a.startMinute;
    const withinEnd = a.endMinute <= worker.availableToMinute;
    const pass = withinStart && withinEnd;
    checks.push({
      key: checkKey('PLAN_WORKER_AVAILABILITY', [a.assignmentId]),
      ruleId: 'PLAN_WORKER_AVAILABILITY',
      subjectIds: [a.assignmentId],
      status: pass ? 'PASS' : 'FAIL',
      summary: pass
        ? a.assignmentId +
          ' sits inside ' +
          a.workerId +
          "'s availability window."
        : a.assignmentId +
          ' runs ' +
          a.startMinute +
          '-' +
          a.endMinute +
          ', outside ' +
          a.workerId +
          "'s window of " +
          worker.availableFromMinute +
          '-' +
          worker.availableToMinute +
          '.',
      formula:
        worker.availableFromMinute +
        ' <= ' +
        a.startMinute +
        ' and ' +
        a.endMinute +
        ' <= ' +
        worker.availableToMinute,
      operands: [
        { label: 'Worker', value: a.workerId, source: a.source.workerId },
        {
          label: 'Assignment start',
          value: a.startMinute,
          unit: 'MINUTE_OFFSET',
          source: a.source.startMinute,
        },
        {
          label: 'Assignment end',
          value: a.endMinute,
          unit: 'MINUTE_OFFSET',
          source: a.source.endMinute,
        },
        {
          label: 'Worker available from',
          value: worker.availableFromMinute,
          unit: 'MINUTE_OFFSET',
          source: worker.source.availableFromMinute,
        },
        {
          label: 'Worker available to',
          value: worker.availableToMinute,
          unit: 'MINUTE_OFFSET',
          source: worker.source.availableToMinute,
        },
      ],
      metrics: {
        startMinute: a.startMinute,
        endMinute: a.endMinute,
        availableFromMinute: worker.availableFromMinute,
        availableToMinute: worker.availableToMinute,
      },
      blockedBy: [],
    });
  }

  // ---- R4 PLAN_WORKER_OVERLAP: every same-worker unordered pair ----------
  // All pairs, not only adjacent sorted intervals, so a nested interval is
  // not missed. Intervals are half-open, so touching assignments pass.
  const byWorker = new Map<string, Assignment[]>();
  for (const a of dataset.assignments) {
    const list = byWorker.get(a.workerId);
    if (list) list.push(a);
    else byWorker.set(a.workerId, [a]);
  }

  for (const worker of dataset.workers) {
    const list = byWorker.get(worker.workerId) ?? [];
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const [first, second] =
          compareCodePoint(list[i].assignmentId, list[j].assignmentId) <= 0
            ? [list[i], list[j]]
            : [list[j], list[i]];
        const intersectionStart = Math.max(first.startMinute, second.startMinute);
        const intersectionEnd = Math.min(first.endMinute, second.endMinute);
        const overlapMinutes = Math.max(0, intersectionEnd - intersectionStart);
        const pass = overlapMinutes === 0;
        const subjectIds = [first.assignmentId, second.assignmentId];
        checks.push({
          key: checkKey('PLAN_WORKER_OVERLAP', subjectIds),
          ruleId: 'PLAN_WORKER_OVERLAP',
          subjectIds,
          status: pass ? 'PASS' : 'FAIL',
          summary: pass
            ? first.assignmentId +
              ' and ' +
              second.assignmentId +
              ' do not overlap for ' +
              worker.workerId +
              '.'
            : first.assignmentId +
              ' and ' +
              second.assignmentId +
              ' overlap by ' +
              overlapMinutes +
              ' min for ' +
              worker.workerId +
              '.',
          formula:
            'max(0, min(' +
            first.endMinute +
            ', ' +
            second.endMinute +
            ') - max(' +
            first.startMinute +
            ', ' +
            second.startMinute +
            ')) = ' +
            overlapMinutes,
          operands: [
            {
              label: first.assignmentId + ' worker',
              value: first.workerId,
              source: first.source.workerId,
            },
            {
              label: first.assignmentId + ' start',
              value: first.startMinute,
              unit: 'MINUTE_OFFSET',
              source: first.source.startMinute,
            },
            {
              label: first.assignmentId + ' end',
              value: first.endMinute,
              unit: 'MINUTE_OFFSET',
              source: first.source.endMinute,
            },
            {
              label: second.assignmentId + ' worker',
              value: second.workerId,
              source: second.source.workerId,
            },
            {
              label: second.assignmentId + ' start',
              value: second.startMinute,
              unit: 'MINUTE_OFFSET',
              source: second.source.startMinute,
            },
            {
              label: second.assignmentId + ' end',
              value: second.endMinute,
              unit: 'MINUTE_OFFSET',
              source: second.source.endMinute,
            },
          ],
          metrics: { overlapMinutes },
          blockedBy: [],
        });
      }
    }
  }

  // ---- R5 PLAN_READY_BY_DEPARTURE: one check per declared order ----------
  for (const order of dataset.orders) {
    const matches = assignmentsByOrder.get(order.orderId) ?? [];
    const subjectIds = [order.orderId];

    if (matches.length !== 1) {
      // No ready time is invented, and no assignment is implicitly chosen.
      checks.push({
        key: checkKey('PLAN_READY_BY_DEPARTURE', subjectIds),
        ruleId: 'PLAN_READY_BY_DEPARTURE',
        subjectIds,
        status: 'BLOCKED',
        summary:
          order.orderId +
          ' has ' +
          plural(matches.length, 'picking assignment') +
          ', so no single picking end time exists and readiness was not evaluated.',
        formula: null,
        operands: [{ label: 'Order', value: order.orderId, source: order.source.orderId }],
        metrics: {},
        blockedBy: [checkKey('PLAN_ASSIGNMENT_COUNT', subjectIds)],
      });
      continue;
    }

    const assignment = matches[0];
    const departure = departureById.get(order.departureId) as Departure;
    const pickEndMinute = assignment.endMinute;
    const packMinutes = order.packMinutes;
    const readyMinute = pickEndMinute + packMinutes;
    const departureMinute = departure.departureMinute;
    const slackMinutes = departureMinute - readyMinute;
    const lateMinutes = Math.max(0, -slackMinutes);
    const pass = readyMinute <= departureMinute;

    checks.push({
      key: checkKey('PLAN_READY_BY_DEPARTURE', subjectIds),
      ruleId: 'PLAN_READY_BY_DEPARTURE',
      subjectIds,
      status: pass ? 'PASS' : 'FAIL',
      summary: pass
        ? order.orderId +
          ' is modeled ready at ' +
          minuteWithClock(readyMinute) +
          ', ' +
          slackMinutes +
          ' min before its ' +
          order.departureId +
          ' departure.'
        : order.orderId +
          ' is modeled ready ' +
          lateMinutes +
          ' minutes after its departure.',
      formula:
        pickEndMinute +
        ' + ' +
        packMinutes +
        ' = ' +
        readyMinute +
        '; ' +
        readyMinute +
        (pass ? ' <= ' : ' > ') +
        departureMinute,
      operands: [
        {
          label: 'Picking ends',
          value: pickEndMinute,
          unit: 'MINUTE_OFFSET',
          source: assignment.source.endMinute,
        },
        {
          label: 'Assumed packing',
          value: packMinutes,
          unit: 'DURATION_MINUTES',
          source: order.source.packMinutes,
        },
        {
          label: 'Departure reference',
          value: order.departureId,
          source: order.source.departureId,
        },
        {
          label: 'Departure',
          value: departureMinute,
          unit: 'MINUTE_OFFSET',
          source: departure.source.departureMinute,
        },
      ],
      metrics: {
        pickEndMinute,
        packMinutes,
        readyMinute,
        departureMinute,
        slackMinutes,
        lateMinutes,
      },
      blockedBy: [],
    });
  }

  // ---- Stable ordering ---------------------------------------------------
  const sorted = checks.slice().sort((a, b) => {
    const ra = RULE_ORDER.indexOf(a.ruleId);
    const rb = RULE_ORDER.indexOf(b.ruleId);
    if (ra !== rb) return ra - rb;
    const len = Math.max(a.subjectIds.length, b.subjectIds.length);
    for (let i = 0; i < len; i += 1) {
      const c = compareCodePoint(a.subjectIds[i] ?? '', b.subjectIds[i] ?? '');
      if (c !== 0) return c;
    }
    return 0;
  });

  const checkCounts: CheckCounts = {
    passed: sorted.filter((c) => c.status === 'PASS').length,
    failed: sorted.filter((c) => c.status === 'FAIL').length,
    blocked: sorted.filter((c) => c.status === 'BLOCKED').length,
  };

  const ruleCoverage: RuleCoverage[] = RULE_ORDER.map((ruleId) => {
    const members = sorted.filter((c) => c.ruleId === ruleId);
    const passed = members.filter((c) => c.status === 'PASS').length;
    const failed = members.filter((c) => c.status === 'FAIL').length;
    const blocked = members.filter((c) => c.status === 'BLOCKED').length;
    const status: RuleCoverage['status'] =
      failed > 0 ? 'FAIL' : blocked > 0 ? 'BLOCKED' : passed > 0 ? 'PASS' : 'NOT_APPLICABLE';
    return { ruleId, passed, failed, blocked, status };
  });

  const planStatus: PlanStatus =
    checkCounts.failed > 0 ? 'VIOLATIONS' : checkCounts.blocked > 0 ? 'NOT_EVALUATED' : 'PASS';

  return { planStatus, checks: sorted, checkCounts, ruleCoverage };
}
