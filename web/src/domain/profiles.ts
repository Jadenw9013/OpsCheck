import type {
  AssignmentField,
  DepartureField,
  OrderField,
  ProfileId,
  TableKind,
  WorkerField,
} from './types';

/**
 * Explicit curated mapping profiles (docs/03_DATA_CONTRACTS.md section 4).
 * Header matching is case-sensitive against trimmed headers. Profiles are
 * never inferred from a filename and never auto-switched.
 */

export type CanonicalField = OrderField | DepartureField | WorkerField | AssignmentField;

export interface FieldMapping {
  /** Canonical field name. */
  field: CanonicalField;
  /** Source column header expected in the CSV. */
  column: string;
  /** Display unit/type for the mapping preview. */
  kind: 'identifier' | 'pickMinutes' | 'packMinutes' | 'timeOffset';
}

export type TableMapping = readonly FieldMapping[];

const ORDERS_STANDARD: TableMapping = [
  { field: 'orderId', column: 'order_id', kind: 'identifier' },
  { field: 'pickMinutes', column: 'pick_minutes', kind: 'pickMinutes' },
  { field: 'packMinutes', column: 'pack_minutes', kind: 'packMinutes' },
  { field: 'departureId', column: 'departure_id', kind: 'identifier' },
];

const ORDERS_WAREHOUSE_B: TableMapping = [
  { field: 'orderId', column: 'OrderRef', kind: 'identifier' },
  { field: 'pickMinutes', column: 'PickMins', kind: 'pickMinutes' },
  { field: 'packMinutes', column: 'PackMins', kind: 'packMinutes' },
  { field: 'departureId', column: 'TruckRef', kind: 'identifier' },
];

const DEPARTURES_STANDARD: TableMapping = [
  { field: 'departureId', column: 'departure_id', kind: 'identifier' },
  { field: 'departureMinute', column: 'departure_minute', kind: 'timeOffset' },
];

const DEPARTURES_WAREHOUSE_B: TableMapping = [
  { field: 'departureId', column: 'TruckRef', kind: 'identifier' },
  { field: 'departureMinute', column: 'DepartsAtMinute', kind: 'timeOffset' },
];

const WORKERS_STANDARD: TableMapping = [
  { field: 'workerId', column: 'worker_id', kind: 'identifier' },
  { field: 'availableFromMinute', column: 'available_from_minute', kind: 'timeOffset' },
  { field: 'availableToMinute', column: 'available_to_minute', kind: 'timeOffset' },
];

const PLAN_STANDARD: TableMapping = [
  { field: 'assignmentId', column: 'assignment_id', kind: 'identifier' },
  { field: 'orderId', column: 'order_id', kind: 'identifier' },
  { field: 'workerId', column: 'worker_id', kind: 'identifier' },
  { field: 'startMinute', column: 'start_minute', kind: 'timeOffset' },
  { field: 'endMinute', column: 'end_minute', kind: 'timeOffset' },
];

const MAPPINGS: Record<TableKind, Partial<Record<ProfileId, TableMapping>>> = {
  orders: { standard: ORDERS_STANDARD, warehouse_b: ORDERS_WAREHOUSE_B },
  departures: { standard: DEPARTURES_STANDARD, warehouse_b: DEPARTURES_WAREHOUSE_B },
  workers: { standard: WORKERS_STANDARD },
  plan: { standard: PLAN_STANDARD },
};

/** Returns null for an unsupported table/profile pairing (warehouse_b workers/plan). */
export function getMapping(table: TableKind, profile: ProfileId): TableMapping | null {
  return MAPPINGS[table][profile] ?? null;
}

export function supportedProfiles(table: TableKind): ProfileId[] {
  return (Object.keys(MAPPINGS[table]) as ProfileId[]).slice();
}
