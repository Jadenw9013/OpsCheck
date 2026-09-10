import type { ProfileId, RuleId, TableKind } from './types';

/** Synthetic time basis: integer minute offsets from 08:00 on one day. */
export const CLOCK_ORIGIN_HOUR = 8;
export const MIN_MINUTE = 0;
export const MAX_MINUTE = 720;

/** Deliberate demo input caps, not performance benchmarks. */
export const MAX_CSV_BYTES = 262_144;
export const MAX_DATA_RECORDS = 100;
export const MAX_COLUMNS = 32;

export const TABLE_ORDER: readonly TableKind[] = ['orders', 'departures', 'workers', 'plan'];

export const RULE_ORDER: readonly RuleId[] = [
  'PLAN_ASSIGNMENT_COUNT',
  'PLAN_PICK_DURATION',
  'PLAN_WORKER_AVAILABILITY',
  'PLAN_WORKER_OVERLAP',
  'PLAN_READY_BY_DEPARTURE',
];

export const TABLE_LABEL: Record<TableKind, string> = {
  orders: 'Orders',
  departures: 'Departures',
  workers: 'Workers',
  plan: 'Plan',
};

export const PROFILE_LABEL: Record<ProfileId, string> = {
  standard: 'standard',
  warehouse_b: 'warehouse_b',
};

export const RULE_LABEL: Record<RuleId, string> = {
  PLAN_ASSIGNMENT_COUNT: 'Assignment count',
  PLAN_PICK_DURATION: 'Picking duration',
  PLAN_WORKER_AVAILABILITY: 'Worker availability',
  PLAN_WORKER_OVERLAP: 'Worker overlap',
  PLAN_READY_BY_DEPARTURE: 'Modeled departure readiness',
};

/**
 * Format an integer minute offset as a synthetic clock time.
 * Returns null for offsets outside the modeled 0..720 window, so callers
 * must show the raw minute value plus "outside modeled window" instead of
 * inventing a wrapped next-day time.
 */
export function formatClock(minute: number): string | null {
  if (!Number.isSafeInteger(minute) || minute < MIN_MINUTE || minute > MAX_MINUTE) return null;
  const totalMinutes = CLOCK_ORIGIN_HOUR * 60 + minute;
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Explicit code-point comparison; never locale-dependent collation. */
export function compareCodePoint(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
