import { TABLE_ORDER, compareCodePoint } from './constants';
import { normalizeTable, type FieldOutcome, type NormalizedTable } from './normalize';
import { getMapping, type CanonicalField } from './profiles';
import type {
  Assignment,
  CanonicalDataset,
  DataDiagnostic,
  DataStatus,
  Departure,
  DiagnosticCode,
  DiagnosticKind,
  InputBundle,
  Order,
  RawTable,
  SourceRef,
  TableKind,
  Worker,
} from './types';

/**
 * Data-readiness stage (docs/03_DATA_CONTRACTS.md sections 7-8).
 *
 * Missing, invalid, and operationally violating inputs are three different
 * states. This stage never runs plan rules and never guesses a value for a
 * blank cell.
 */

export interface DataValidationResult {
  status: DataStatus;
  diagnostics: DataDiagnostic[];
  rawTables: Record<TableKind, RawTable>;
  /** Non-null only when status is READY. */
  dataset: CanonicalDataset | null;
}

const INVALID_CODES: ReadonlySet<DiagnosticCode> = new Set<DiagnosticCode>([
  'DATA_CSV_ERROR',
  'DATA_INVALID_HEADER',
  'DATA_DUPLICATE_HEADER',
  'DATA_ROW_WIDTH',
  'DATA_LIMIT_EXCEEDED',
  'DATA_UNSUPPORTED_PROFILE',
  'DATA_INVALID_ID',
  'DATA_INVALID_NUMBER',
  'DATA_INVALID_INTERVAL',
  'DATA_DUPLICATE_ID',
  'DATA_UNKNOWN_REFERENCE',
]);

function kindOf(code: DiagnosticCode): DiagnosticKind {
  return INVALID_CODES.has(code) ? 'INVALID_DATA' : 'MISSING_DATA';
}

const PRIMARY_KEY_FIELD: Record<TableKind, CanonicalField> = {
  orders: 'orderId',
  departures: 'departureId',
  workers: 'workerId',
  plan: 'assignmentId',
};

/** Human label for a canonical field, used in diagnostic messages. */
const FIELD_LABEL: Record<CanonicalField, string> = {
  orderId: 'order identifier',
  pickMinutes: 'picking duration',
  packMinutes: 'packing duration',
  departureId: 'departure reference',
  departureMinute: 'departure minute',
  workerId: 'worker identifier',
  availableFromMinute: 'available-from minute',
  availableToMinute: 'available-to minute',
  assignmentId: 'assignment identifier',
  startMinute: 'start minute',
  endMinute: 'end minute',
};

function diagnosticKey(
  code: DiagnosticCode,
  table: TableKind,
  recordNumber: number,
  column: string,
  disambiguator = '',
): string {
  return [code, table, String(recordNumber), column, disambiguator].join('|');
}

function sortDiagnostics(list: DataDiagnostic[]): DataDiagnostic[] {
  return list.slice().sort((a, b) => {
    const ta = TABLE_ORDER.indexOf(a.table);
    const tb = TABLE_ORDER.indexOf(b.table);
    if (ta !== tb) return ta - tb;
    const ra = a.source?.recordNumber ?? 0;
    const rb = b.source?.recordNumber ?? 0;
    if (ra !== rb) return ra - rb;
    const ca = compareCodePoint(a.source?.column ?? '', b.source?.column ?? '');
    if (ca !== 0) return ca;
    const cc = compareCodePoint(a.code, b.code);
    if (cc !== 0) return cc;
    return compareCodePoint(a.key, b.key);
  });
}

export function validateData(bundle: InputBundle): DataValidationResult {
  const normalized = {} as Record<TableKind, NormalizedTable>;
  for (const table of TABLE_ORDER) {
    const file = bundle.files[table];
    const mapping = file ? getMapping(table, file.profile) : null;
    normalized[table] = normalizeTable(table, file, mapping);
  }

  const diagnostics: DataDiagnostic[] = [];
  const push = (d: DataDiagnostic) => {
    diagnostics.push(d);
  };

  // ---- Structural diagnostics -------------------------------------------
  for (const table of TABLE_ORDER) {
    const nt = normalized[table];
    const fileName = nt.raw.fileName ?? table + '.csv';

    if (nt.fileMissing) {
      push({
        key: diagnosticKey('DATA_MISSING_FILE', table, 0, ''),
        code: 'DATA_MISSING_FILE',
        kind: kindOf('DATA_MISSING_FILE'),
        message: 'No ' + table + ' file is loaded. All four input tables are required.',
        table,
        source: null,
        relatedSources: [],
      });
      continue;
    }

    if (nt.unsupportedProfile) {
      push({
        key: diagnosticKey('DATA_UNSUPPORTED_PROFILE', table, 1, ''),
        code: 'DATA_UNSUPPORTED_PROFILE',
        kind: kindOf('DATA_UNSUPPORTED_PROFILE'),
        message:
          'The selected mapping profile "' +
          String(nt.raw.profile) +
          '" is not supported for the ' +
          table +
          ' table.',
        table,
        source: null,
        relatedSources: [],
      });
      continue;
    }

    for (const err of nt.structuralErrors) {
      const column = err.column ?? '';
      push({
        key: diagnosticKey(err.code, table, err.recordNumber, column),
        code: err.code,
        kind: kindOf(err.code),
        message: err.message,
        table,
        source: {
          table,
          fileName,
          recordNumber: err.recordNumber,
          column,
          rawValue: null,
        },
        relatedSources: [],
      });
    }
    if (nt.structuralErrors.length > 0) continue;

    // One diagnostic per absent required header, anchored at record 1.
    for (const column of nt.missingHeaders) {
      push({
        key: diagnosticKey('DATA_MISSING_HEADER', table, 1, column),
        code: 'DATA_MISSING_HEADER',
        kind: kindOf('DATA_MISSING_HEADER'),
        message:
          'The ' +
          table +
          ' header does not contain the required column "' +
          column +
          '". The schema itself is incomplete, so individual rows are not checked.',
        table,
        source: { table, fileName, recordNumber: 1, column, rawValue: null },
        relatedSources: [],
      });
    }
    if (nt.missingHeaders.length > 0) continue;

    // A header-only plan table is valid input; the other three are not.
    if (table !== 'plan' && nt.records.length === 0) {
      push({
        key: diagnosticKey('DATA_EMPTY_TABLE', table, 1, ''),
        code: 'DATA_EMPTY_TABLE',
        kind: kindOf('DATA_EMPTY_TABLE'),
        message: 'The ' + table + ' table has a header but no data records.',
        table,
        source: null,
        relatedSources: [],
      });
    }
  }

  // ---- Scalar diagnostics -----------------------------------------------
  for (const table of TABLE_ORDER) {
    const nt = normalized[table];
    if (!nt.structurallyAvailable) continue;
    const keyField = PRIMARY_KEY_FIELD[table];

    for (const record of nt.records) {
      // Name the record by its own primary identifier when that identifier is
      // itself valid; otherwise fall back to the logical record number.
      const keyOutcome = record.fields.get(keyField)?.outcome;
      const subject =
        keyOutcome && keyOutcome.state === 'VALID'
          ? String(keyOutcome.value)
          : 'Record ' + record.recordNumber;

      for (const fo of record.fields.values()) {
        const isIdentifier =
          fo.field === 'orderId' ||
          fo.field === 'departureId' ||
          fo.field === 'workerId' ||
          fo.field === 'assignmentId';

        if (fo.outcome.state === 'MISSING') {
          push({
            key: diagnosticKey('DATA_MISSING_VALUE', table, record.recordNumber, fo.column),
            code: 'DATA_MISSING_VALUE',
            kind: kindOf('DATA_MISSING_VALUE'),
            message:
              subject +
              ' is missing a ' +
              FIELD_LABEL[fo.field] +
              '. The source cell is blank, so no value was assumed' +
              (isIdentifier ? '.' : '; a blank cell is never read as zero.'),
            table,
            source: fo.source,
            relatedSources: [],
          });
        } else if (fo.outcome.state === 'INVALID') {
          const code: DiagnosticCode = isIdentifier ? 'DATA_INVALID_ID' : 'DATA_INVALID_NUMBER';
          push({
            key: diagnosticKey(code, table, record.recordNumber, fo.column),
            code,
            kind: kindOf(code),
            message:
              subject +
              ' has an unusable ' +
              FIELD_LABEL[fo.field] +
              ' of "' +
              (fo.source.rawValue ?? '') +
              '". ' +
              fo.outcome.reason,
            table,
            source: fo.source,
            relatedSources: [],
          });
        }
      }
    }
  }

  // ---- Interval relations ------------------------------------------------
  // Only when both endpoints already parsed as valid scalars; an invalid
  // endpoint must not cascade into a second interval diagnostic.
  const intervalSpecs: Array<{
    table: TableKind;
    from: CanonicalField;
    to: CanonicalField;
    message: string;
  }> = [
    {
      table: 'workers',
      from: 'availableFromMinute',
      to: 'availableToMinute',
      message: 'A worker availability window must start before it ends.',
    },
    {
      table: 'plan',
      from: 'startMinute',
      to: 'endMinute',
      message: 'An assignment must start before it ends.',
    },
  ];

  for (const spec of intervalSpecs) {
    const nt = normalized[spec.table];
    if (!nt.structurallyAvailable) continue;
    for (const record of nt.records) {
      const from = record.fields.get(spec.from);
      const to = record.fields.get(spec.to);
      if (!from || !to) continue;
      if (from.outcome.state !== 'VALID' || to.outcome.state !== 'VALID') continue;
      const start = from.outcome.value as number;
      const end = to.outcome.value as number;
      if (start < end) continue;
      push({
        key: diagnosticKey('DATA_INVALID_INTERVAL', spec.table, record.recordNumber, to.column),
        code: 'DATA_INVALID_INTERVAL',
        kind: kindOf('DATA_INVALID_INTERVAL'),
        message:
          spec.message +
          ' Record ' +
          record.recordNumber +
          ' has ' +
          from.column +
          ' ' +
          start +
          ' and ' +
          to.column +
          ' ' +
          end +
          '.',
        table: spec.table,
        source: to.source,
        relatedSources: [from.source],
      });
    }
  }

  // ---- Primary key uniqueness -------------------------------------------
  const keyIndex = {} as Record<TableKind, Map<string, FieldOutcome[]>>;
  for (const table of TABLE_ORDER) {
    keyIndex[table] = new Map<string, FieldOutcome[]>();
    const nt = normalized[table];
    if (!nt.structurallyAvailable) continue;
    const keyField = PRIMARY_KEY_FIELD[table];
    for (const record of nt.records) {
      const fo = record.fields.get(keyField);
      if (!fo || fo.outcome.state !== 'VALID') continue;
      const id = fo.outcome.value as string;
      const list = keyIndex[table].get(id);
      if (list) list.push(fo);
      else keyIndex[table].set(id, [fo]);
    }
  }

  for (const table of TABLE_ORDER) {
    const keyField = PRIMARY_KEY_FIELD[table];
    for (const [id, occurrences] of keyIndex[table]) {
      if (occurrences.length < 2) continue;
      // Anchored at the first repeated occurrence; every record is listed.
      const anchor = occurrences[1];
      push({
        key: diagnosticKey(
          'DATA_DUPLICATE_ID',
          table,
          anchor.source.recordNumber,
          anchor.column,
          id,
        ),
        code: 'DATA_DUPLICATE_ID',
        kind: kindOf('DATA_DUPLICATE_ID'),
        message:
          'The ' +
          FIELD_LABEL[keyField] +
          ' "' +
          id +
          '" appears in ' +
          occurrences.length +
          ' records of the ' +
          table +
          ' table. Primary identifiers must be unique; no record is chosen as the winner.',
        table,
        source: anchor.source,
        relatedSources: occurrences.map((o) => o.source),
        relatedRecordNumbers: occurrences.map((o) => o.source.recordNumber),
      });
    }
  }

  // ---- Foreign references ------------------------------------------------
  const referenceSpecs: Array<{
    table: TableKind;
    field: CanonicalField;
    target: TableKind;
    targetLabel: string;
  }> = [
    { table: 'orders', field: 'departureId', target: 'departures', targetLabel: 'departure' },
    { table: 'plan', field: 'orderId', target: 'orders', targetLabel: 'order' },
    { table: 'plan', field: 'workerId', target: 'workers', targetLabel: 'worker' },
  ];

  for (const spec of referenceSpecs) {
    const nt = normalized[spec.table];
    const target = normalized[spec.target];
    // A structurally unavailable target already has its own blocker; do not
    // emit a storm of unknown-reference messages on top of it.
    if (!nt.structurallyAvailable || !target.structurallyAvailable) continue;
    for (const record of nt.records) {
      const fo = record.fields.get(spec.field);
      if (!fo || fo.outcome.state !== 'VALID') continue;
      const id = fo.outcome.value as string;
      // An ID that exists but is duplicated is a duplicate-key problem, not a
      // missing reference, so a present key is never reported as unknown.
      if (keyIndex[spec.target].has(id)) continue;
      push({
        key: diagnosticKey('DATA_UNKNOWN_REFERENCE', spec.table, record.recordNumber, fo.column),
        code: 'DATA_UNKNOWN_REFERENCE',
        kind: kindOf('DATA_UNKNOWN_REFERENCE'),
        message:
          '"' +
          id +
          '" does not match any ' +
          spec.targetLabel +
          ' declared in the ' +
          spec.target +
          ' table.',
        table: spec.table,
        source: fo.source,
        relatedSources: [],
      });
    }
  }

  // ---- Readiness precedence ---------------------------------------------
  const sorted = sortDiagnostics(diagnostics);
  const status: DataStatus = sorted.some((d) => d.kind === 'INVALID_DATA')
    ? 'INVALID'
    : sorted.some((d) => d.kind === 'MISSING_DATA')
      ? 'INCOMPLETE'
      : 'READY';

  const rawTables: Record<TableKind, RawTable> = {
    orders: normalized.orders.raw,
    departures: normalized.departures.raw,
    workers: normalized.workers.raw,
    plan: normalized.plan.raw,
  };

  if (status !== 'READY') {
    return { status, diagnostics: sorted, rawTables, dataset: null };
  }

  return { status, diagnostics: sorted, rawTables, dataset: buildDataset(normalized) };
}

interface RecordWithFields {
  fields: Map<CanonicalField, FieldOutcome>;
}

function requireField(
  record: RecordWithFields,
  field: CanonicalField,
): { value: string | number; source: SourceRef } {
  const fo = record.fields.get(field);
  if (!fo || fo.outcome.state !== 'VALID') {
    // Unreachable for READY input; a thrown error is surfaced by the UI as
    // "Evaluation could not complete", never as a passed or skipped check.
    throw new Error('Internal error: field ' + field + ' is not valid in a READY dataset.');
  }
  return { value: fo.outcome.value, source: fo.source };
}

function buildDataset(normalized: Record<TableKind, NormalizedTable>): CanonicalDataset {
  const orders: Order[] = normalized.orders.records.map((r) => {
    const orderId = requireField(r, 'orderId');
    const pickMinutes = requireField(r, 'pickMinutes');
    const packMinutes = requireField(r, 'packMinutes');
    const departureId = requireField(r, 'departureId');
    return {
      orderId: orderId.value as string,
      pickMinutes: pickMinutes.value as number,
      packMinutes: packMinutes.value as number,
      departureId: departureId.value as string,
      source: {
        orderId: orderId.source,
        pickMinutes: pickMinutes.source,
        packMinutes: packMinutes.source,
        departureId: departureId.source,
      },
    };
  });

  const departures: Departure[] = normalized.departures.records.map((r) => {
    const departureId = requireField(r, 'departureId');
    const departureMinute = requireField(r, 'departureMinute');
    return {
      departureId: departureId.value as string,
      departureMinute: departureMinute.value as number,
      source: { departureId: departureId.source, departureMinute: departureMinute.source },
    };
  });

  const workers: Worker[] = normalized.workers.records.map((r) => {
    const workerId = requireField(r, 'workerId');
    const availableFromMinute = requireField(r, 'availableFromMinute');
    const availableToMinute = requireField(r, 'availableToMinute');
    return {
      workerId: workerId.value as string,
      availableFromMinute: availableFromMinute.value as number,
      availableToMinute: availableToMinute.value as number,
      source: {
        workerId: workerId.source,
        availableFromMinute: availableFromMinute.source,
        availableToMinute: availableToMinute.source,
      },
    };
  });

  const assignments: Assignment[] = normalized.plan.records.map((r) => {
    const assignmentId = requireField(r, 'assignmentId');
    const orderId = requireField(r, 'orderId');
    const workerId = requireField(r, 'workerId');
    const startMinute = requireField(r, 'startMinute');
    const endMinute = requireField(r, 'endMinute');
    return {
      assignmentId: assignmentId.value as string,
      orderId: orderId.value as string,
      workerId: workerId.value as string,
      startMinute: startMinute.value as number,
      endMinute: endMinute.value as number,
      source: {
        assignmentId: assignmentId.source,
        orderId: orderId.source,
        workerId: workerId.source,
        startMinute: startMinute.source,
        endMinute: endMinute.source,
      },
    };
  });

  return { orders, departures, workers, assignments };
}
