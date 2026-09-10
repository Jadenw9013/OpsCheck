# 03 — Data contracts and source provenance

This document and `04_VALIDATION_ENGINE.md` are normative. IDs, statuses, bounds, and source semantics must not be improvised in the UI.

## 1. Shared assumptions
All bundled inputs are fictional. Time is an integer minute offset from **08:00 on one synthetic day**, with allowed offsets `0..720`. Format for display by integer arithmetic; minute 65 is 09:05 and minute 75 is 09:15. There are no dates, time zones, DST, overnight intervals, or actual event timestamps. A **derived** readyMinute can exceed 720 when two valid input values are added; do not clamp or wrap it. It will miss every allowed departure. Display that value as a minute offset with “outside modeled window,” rather than inventing a next-day clock time.

Every order references exactly one outbound departure. A proposed picking assignment has one worker and a contiguous time interval. Packing begins immediately after picking and consumes only a fixed assumed time lag; packing capacity, staging, loading, buffers, and transport uncertainty are not modeled.

## 2. Input bundle
Implement equivalent TypeScript types; the field names below are normative:
```ts
type TableKind = 'orders' | 'departures' | 'workers' | 'plan';
type ProfileId = 'standard' | 'warehouse_b';
type DataOrigin = 'SYNTHETIC' | 'USER_SUPPLIED_UNVERIFIED';

interface InputFile {
  fileName: string;
  profile: ProfileId;
  csvText: string;
}
interface InputBundle {
  origin: DataOrigin;
  files: Record<TableKind, InputFile | null>;
}
```

`loadScenario(id)` creates a fresh `InputBundle` from the seed JSON. Scenario ID/title are presentation metadata; do not pass them into rule logic. Replacing any file marks the bundle `USER_SUPPLIED_UNVERIFIED`, even when the filename resembles a supplied example. Resetting to an untouched bundled fixture restores `SYNTHETIC`.

## 3. CSV contract
- UTF-8, comma-separated, first logical record is the header; optional UTF-8 BOM at the start only.
- Parse with Papa Parse `header: false`, `dynamicTyping: false`, `skipEmptyLines: false`, `delimiter: ','`, and newline autodetection. Do not implement `split(',')` or enable automatic number conversion [S7].
- Preserve original parsed cell strings. Header matching uses trimmed headers; keep original header text for source display. Matching is case-sensitive.
- Reject duplicated headers after trimming, including duplicated extra/unused headers. Papa's header-object mode can rename duplicates; array mode avoids silently accepting that behavior [S7].
- A body record with exactly one empty/whitespace-only cell is a blank record and may be ignored. Preserve the original logical record indices for all remaining records. A record such as `,,,` is not ignored; validate its missing values.
- Ignore a trailing blank record from a terminal newline without shifting prior record numbers.
- Header must exist in record 1; do not guess by scanning past initial blank lines.
- Reject nonblank rows whose field count differs from the header count. Do not silently drop extra fields.
- Unknown extra columns are permitted, preserved in raw source view, and listed as ignored by the mapping preview. They do not affect validation.
- Reject parser errors, more than 32 columns, more than 100 nonblank data records, or UTF-8 file size greater than 262,144 bytes. No preview/truncation can be treated as a complete input.
- A missing table file or required mapped column is incomplete input. Malformed CSV is invalid input.
- Empty `orders`, `departures`, or `workers` tables are incomplete. A header-only `plan` is valid input and yields missing-assignment plan violations.

Use safe standard text/byte utilities in the parsing boundary. No DOM/File access inside the domain; UI code reads a File into text first. Handle file-read errors as import errors and do not publish a report for the attempted replacement.

## 4. Exact profiles
Each file slot has an explicitly selected profile. Do not infer one from its filename or auto-switch when headers do not match.

### Standard profile
| Table | Source column → canonical field |
|---|---|
| orders | `order_id → orderId`; `pick_minutes → pickMinutes`; `pack_minutes → packMinutes`; `departure_id → departureId` |
| departures | `departure_id → departureId`; `departure_minute → departureMinute` |
| workers | `worker_id → workerId`; `available_from_minute → availableFromMinute`; `available_to_minute → availableToMinute` |
| plan | `assignment_id → assignmentId`; `order_id → orderId`; `worker_id → workerId`; `start_minute → startMinute`; `end_minute → endMinute` |

### Warehouse B profile
| Table | Source column → canonical field |
|---|---|
| orders | `OrderRef → orderId`; `PickMins → pickMinutes`; `PackMins → packMinutes`; `TruckRef → departureId` |
| departures | `TruckRef → departureId`; `DepartsAtMinute → departureMinute` |

Warehouse B is unsupported for workers/plan; use standard there. This is a fixture profile, not a claim about any real vendor. Both profiles use the same minute units; no conversion or guessed business semantics.

## 5. Scalar validation
Keep source text unchanged; normalize only a separate parsed value.

| Field class | Accepted | Missing | Invalid |
|---|---|---|---|
| Identifier | Trimmed value matching `^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$`; case-sensitive | Empty after trimming | Other characters or length |
| Picking minutes | Decimal digit string, safe integer, `1..720` | Empty after trimming | Zero, negative, fractional, exponent, nonnumeric, out of range |
| Packing minutes | Decimal digit string, safe integer, `0..720` | Empty after trimming | Negative, fractional, exponent, nonnumeric, out of range |
| Time offsets | Decimal digit string, safe integer, `0..720` | Empty after trimming | Negative, fractional, exponent, nonnumeric, out of range |

After trimming, check `/^\d+$/`, convert with `Number`, then use `Number.isSafeInteger` and range checks. Leading zeros are allowed (`020 → 20`). Reject `20min`, `1e2`, `+5`, `2.5`, `NaN`, and `Infinity`. Do not use `parseInt` or `Number('')` as validation.

Required interval relations: `startMinute < endMinute`; `availableFromMinute < availableToMinute`. Check these only when both endpoint scalars are valid; do not cascade interval diagnostics from an already invalid endpoint.

## 6. Canonical entities
Use plain values plus field-level source references:
```ts
interface SourceRef {
  table: TableKind;
  fileName: string;
  recordNumber: number; // logical CSV record; header is 1
  column: string;       // actual source header, or expected header if absent
  rawValue: string | null;
}
interface Order {
  orderId: string;
  pickMinutes: number;
  packMinutes: number;
  departureId: string;
  source: Record<'orderId' | 'pickMinutes' | 'packMinutes' | 'departureId', SourceRef>;
}
interface Departure {
  departureId: string;
  departureMinute: number;
  source: Record<'departureId' | 'departureMinute', SourceRef>;
}
interface Worker {
  workerId: string;
  availableFromMinute: number;
  availableToMinute: number;
  source: Record<'workerId' | 'availableFromMinute' | 'availableToMinute', SourceRef>;
}
interface Assignment {
  assignmentId: string;
  orderId: string;
  workerId: string;
  startMinute: number;
  endMinute: number;
  source: Record<'assignmentId' | 'orderId' | 'workerId' | 'startMinute' | 'endMinute', SourceRef>;
}
interface CanonicalDataset {
  orders: Order[];
  departures: Departure[];
  workers: Worker[];
  assignments: Assignment[];
}
```

Retain a raw-table model for source viewing: original headers and an array of `{recordNumber, cells}`. Do not reconstruct raw text from canonical numbers. A partially parsed row can be inspected, but it must not be cast into a valid canonical entity.

## 7. Data diagnostics
```ts
type DataStatus = 'READY' | 'INCOMPLETE' | 'INVALID';
type DiagnosticKind = 'MISSING_DATA' | 'INVALID_DATA';
interface DataDiagnostic {
  key: string;
  code: string; // catalog below
  kind: DiagnosticKind;
  message: string;
  table: TableKind;
  source: SourceRef | null;
  relatedSources: SourceRef[];
  relatedRecordNumbers?: number[];
}
```

| Code | Kind | Meaning |
|---|---|---|
| DATA_MISSING_FILE | MISSING_DATA | Required slot has no file |
| DATA_MISSING_HEADER | MISSING_DATA | One required mapped header absent |
| DATA_EMPTY_TABLE | MISSING_DATA | orders/departures/workers has no data rows |
| DATA_MISSING_VALUE | MISSING_DATA | Required cell is blank |
| DATA_CSV_ERROR | INVALID_DATA | Malformed quoting or other parser failure |
| DATA_INVALID_HEADER | INVALID_DATA | Empty/invalid header record |
| DATA_DUPLICATE_HEADER | INVALID_DATA | Repeated trimmed header |
| DATA_ROW_WIDTH | INVALID_DATA | Record width differs from header |
| DATA_LIMIT_EXCEEDED | INVALID_DATA | Size, row, or column cap exceeded |
| DATA_UNSUPPORTED_PROFILE | INVALID_DATA | Unsupported table/profile pairing |
| DATA_INVALID_ID | INVALID_DATA | Identifier grammar invalid |
| DATA_INVALID_NUMBER | INVALID_DATA | Numeric grammar, integer, or range failure |
| DATA_INVALID_INTERVAL | INVALID_DATA | Valid endpoints in reversed/equal order |
| DATA_DUPLICATE_ID | INVALID_DATA | Repeated primary identifier in a table |
| DATA_UNKNOWN_REFERENCE | INVALID_DATA | Valid identifier refers to no declared record |

For missing headers, point at record 1 with the expected source-column name and `rawValue: null`. Emit one diagnostic per absent required header, not one per data row. Stop row-level parsing of that table when structural prerequisites fail.

For duplicate primary IDs, emit one diagnostic per repeated key, anchored at its first repeated occurrence; include all corresponding record numbers and source cells, including the original. Do not add fake missing-reference errors for an ID that exists but is duplicated.

For an unknown reference, use its referencing cell. When the referenced table is structurally unavailable, do not emit a storm of unknown-reference messages; its structural blocker is sufficient. Other independently parseable tables can still report genuine diagnostics.

## 8. Cross-table validation and dataset readiness
Unique primary keys: orderId, departureId, workerId, assignmentId, each within its own table. Repeated `plan.orderId` is **not** a duplicate primary key; it is an operational cardinality failure later.

Foreign references: every order's departureId; every assignment's orderId and workerId. Validate references only for valid scalar identifiers against a structurally available target table. Use key indexes without silently overwriting duplicates.

Collect independent data diagnostics. Precedence:
1. Any INVALID_DATA diagnostic → `INVALID`.
2. Otherwise any MISSING_DATA diagnostic → `INCOMPLETE`.
3. Otherwise → `READY` and a fully typed canonical dataset.

A non-READY result has no usable canonical dataset for plan evaluation. Preserve raw tables and diagnostics. Do not partially run plan rules in this MVP.

## 9. Provenance and ordering
Logical CSV record number is not always a physical line number; quoted multiline fields are legal. UI copy must say **record**, with header = record 1. The baseline O-104 order is record 5; its A-4 assignment is plan record 5; D-1 is departures record 2.

Sort diagnostics by table order `orders, departures, workers, plan`, then record number, normalized column name, then code. Sort text with explicit code-point comparison rather than locale-dependent collation. Keep all related sources in stable table/record/column order.

Do not regenerate IDs with timestamps or random UUIDs. Stable diagnostic keys can be code/table/record/column plus a deterministic disambiguator. Duplicate IDs cannot silently merge diagnostics.

## 10. Result boundary
The engine returns deterministic report data. UI wall-clock labels, elapsed durations, selection state, and input revisions live outside that result. Repeating the same exact input bundle must produce structurally equal report output. Equivalent mapping profiles need equal operational values and numeric outcomes, not identical source-header metadata.

Report fields and check semantics are defined in the next document. Never serialize sensitive uploads to a server, URL query, or analytics event.
