import { describe, expect, it } from 'vitest';
import { evaluateBundle } from '@/domain/evaluateBundle';
import { buildInputPreview } from '@/features/inputPreview';
import {
  axisPercent,
  buildPlanRows,
  buildTimeline,
  segmentPercent,
  type TimelineAxis,
} from '@/features/viewModel';
import { loadScenario } from '@/fixtures/loadScenario';

/**
 * The timeline adapter positions values; it must never decide them.
 *
 * These checks pin the honesty rules the visualization depends on: nothing
 * derived is plotted before an evaluation, a blocked dataset draws no modeled
 * band, and the geometry stays finite for degenerate input.
 */

function timelineFor(scenarioId: string, evaluated: boolean) {
  const bundle = loadScenario(scenarioId);
  const preview = buildInputPreview(bundle);
  const report = evaluated ? evaluateBundle(bundle) : null;
  return buildTimeline(buildPlanRows(preview, report), report);
}

function rowFor(scenarioId: string, evaluated: boolean, orderId: string) {
  const found = timelineFor(scenarioId, evaluated).rows.find((r) => r.orderId === orderId);
  if (!found) throw new Error('No timeline row for ' + orderId);
  return found;
}

describe('before evaluation the timeline plots only submitted inputs', () => {
  const model = timelineFor('S00', false);

  it('reports itself as unevaluated', () => {
    expect(model.evaluated).toBe(false);
    expect(model.blocked).toBe(false);
  });

  it('plots the submitted picking interval', () => {
    const row = rowFor('S00', false, 'O-101');
    expect(row.pick).toStrictEqual({ startMinute: 0, endMinute: 20 });
  });

  it('invents no packing, readiness, departure, or verdict', () => {
    for (const row of model.rows) {
      expect(row.pack).toBeNull();
      expect(row.overrun).toBeNull();
      expect(row.readyMinute).toBeNull();
      expect(row.departureMinute).toBeNull();
      expect(row.lateMinutes).toBeNull();
      expect(row.status).toBe('NOT_EVALUATED');
    }
  });
});

describe('S01 draws the ten-minute miss from engine values only', () => {
  const row = rowFor('S01', true, 'O-104');

  it('runs packing from the submitted picking end to the modeled ready minute', () => {
    expect(row.pick).toStrictEqual({ startMinute: 25, endMinute: 45 });
    expect(row.pack).toStrictEqual({ startMinute: 45, endMinute: 75 });
  });

  it('marks the overrun between departure and modeled readiness', () => {
    expect(row.departureMinute).toBe(65);
    expect(row.readyMinute).toBe(75);
    expect(row.overrun).toStrictEqual({ startMinute: 65, endMinute: 75 });
    expect(row.lateMinutes).toBe(10);
    expect(row.status).toBe('FAIL');
  });

  it('extends the axis far enough to include the late readiness point', () => {
    const model = timelineFor('S01', true);
    expect(model.axis.maxMinute).toBeGreaterThanOrEqual(75);
  });

  it('gives the failing row a finding to select', () => {
    expect(row.findingIds.length).toBeGreaterThan(0);
  });

  it('leaves every on-time order without an overrun', () => {
    const model = timelineFor('S01', true);
    const overrunning = model.rows.filter((r) => r.overrun !== null);
    expect(overrunning.map((r) => r.orderId)).toStrictEqual(['O-104']);
  });
});

describe('a blocked dataset draws no derived band at all', () => {
  const model = timelineFor('S02', true);

  it('is reported as blocked rather than evaluated', () => {
    expect(model.evaluated).toBe(false);
    expect(model.blocked).toBe(true);
  });

  it('plots submitted picking but nothing modeled', () => {
    const row = rowFor('S02', true, 'O-104');
    expect(row.pick).toStrictEqual({ startMinute: 25, endMinute: 45 });
    expect(row.pack).toBeNull();
    expect(row.overrun).toBeNull();
    expect(row.readyMinute).toBeNull();
    expect(row.departureMinute).toBeNull();
    expect(row.status).toBe('NOT_EVALUATED');
  });

  it('shows no lateness anywhere, including for the order with the blank cell', () => {
    for (const row of model.rows) {
      expect(row.lateMinutes).toBeNull();
      expect(row.overrun).toBeNull();
    }
  });
});

describe('geometry stays finite for degenerate input', () => {
  it('produces a usable axis when there is nothing to plot', () => {
    const model = buildTimeline([], null);
    expect(model.rows).toStrictEqual([]);
    expect(model.axis.maxMinute).toBeGreaterThan(model.axis.minMinute);
    expect(Number.isFinite(model.axis.minMinute)).toBe(true);
    expect(Number.isFinite(model.axis.maxMinute)).toBe(true);
  });

  it('never returns NaN or a negative width from a zero-width axis', () => {
    const axis: TimelineAxis = { minMinute: 30, maxMinute: 30, ticks: [30] };
    expect(axisPercent(axis, 30)).toBe(0);
    expect(Number.isNaN(axisPercent(axis, 45))).toBe(false);
    const width = segmentPercent(axis, { startMinute: 45, endMinute: 20 });
    expect(width).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(width)).toBe(false);
  });

  it('clamps positions outside the plotted range instead of overflowing', () => {
    const axis: TimelineAxis = { minMinute: 0, maxMinute: 60, ticks: [0, 60] };
    expect(axisPercent(axis, -30)).toBe(0);
    expect(axisPercent(axis, 600)).toBe(100);
    expect(axisPercent(axis, 30)).toBe(50);
  });
});
