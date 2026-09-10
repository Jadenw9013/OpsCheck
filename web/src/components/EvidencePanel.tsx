'use client';

import { RULE_LABEL, formatClock } from '@/domain/constants';
import type {
  CheckResult,
  DataDiagnostic,
  Operand,
  OperandUnit,
  SourceRef,
} from '@/domain/types';
import type { Finding } from '@/features/viewModel';
import { AlertGlyph, BlockGlyph, CheckGlyph, Panel, Pill, SourceGlyph } from './ui';

/**
 * Evidence for one selected finding: its rule id or diagnostic code, a
 * plain-language explanation, the named inputs and calculation the engine
 * produced, the raw source values, and working source-navigation controls.
 */

const PACKING_CAVEAT =
  'Packing is modeled as a fixed delay that starts the moment picking ends. Packing capacity, staging, loading, and transport are not modeled, so this ready time is a modeled value rather than a forecast.';

const CODE_NOTE: Record<string, string> = {
  DATA_MISSING_VALUE:
    'A blank required cell is missing input, not a zero. OpsCheck refuses to invent a value, so no plan rule runs against this dataset.',
  DATA_MISSING_HEADER:
    'The mapped column is absent from the header, so the schema itself is incomplete. Individual rows are not reported as blank.',
  DATA_MISSING_FILE: 'All four input tables are required before any plan rule can run.',
  DATA_EMPTY_TABLE: 'The file parsed cleanly but declares no records to check.',
  DATA_INVALID_NUMBER:
    'The value is present but does not parse as a whole number in the allowed range, so it cannot be used in a calculation.',
  DATA_INVALID_ID: 'The identifier does not match the allowed identifier grammar.',
  DATA_INVALID_INTERVAL:
    'Both endpoints parsed, but they do not form a forward interval. Intervals are half-open, so the start must be strictly before the end.',
  DATA_DUPLICATE_ID:
    'Primary identifiers must be unique. OpsCheck does not pick a winner between duplicate records.',
  DATA_UNKNOWN_REFERENCE:
    'The identifier is well formed but no matching record exists in the referenced table.',
  DATA_ROW_WIDTH: 'The record does not have the same number of fields as the header.',
  DATA_DUPLICATE_HEADER: 'Two columns share a name after trimming, so the mapping is ambiguous.',
  DATA_CSV_ERROR: 'The file could not be parsed as CSV.',
  DATA_INVALID_HEADER: 'Record 1 does not contain usable column headers.',
  DATA_LIMIT_EXCEEDED: 'The file is larger than this demo accepts. Oversize input is rejected, never truncated.',
  DATA_UNSUPPORTED_PROFILE: 'This table does not support the selected mapping profile.',
};

function splitHeadline(message: string): { headline: string; rest: string } {
  const at = message.indexOf('. ');
  if (at === -1) return { headline: message, rest: '' };
  return { headline: message.slice(0, at + 1), rest: message.slice(at + 2) };
}

/**
 * A number is only shown as a clock time when the engine declared it a point on
 * the synthetic clock. A duration is labelled "min", and a value with no
 * declared unit is printed exactly as the engine produced it.
 */
function operandDisplay(
  value: string | number,
  unit: OperandUnit | undefined,
): { text: string; clock: string | null } {
  if (typeof value !== 'number') return { text: String(value), clock: null };
  if (unit === 'MINUTE_OFFSET') {
    return { text: String(value), clock: formatClock(value) ?? 'outside modeled window' };
  }
  if (unit === 'DURATION_MINUTES') return { text: value + ' min', clock: null };
  return { text: String(value), clock: null };
}

export function EvidencePanel({
  finding,
  hasRun,
  onOpenSource,
}: {
  finding: Finding | null;
  hasRun: boolean;
  onOpenSource: (source: SourceRef) => void;
}) {
  if (finding === null) {
    return (
      <Panel
        title="Evidence"
        subtitle="Named inputs, the calculation, and the raw source cells behind a finding."
        bodyClassName="flex items-center justify-center px-5 py-8"
      >
        <div className="max-w-[38ch] text-center">
          <p className="text-[12.5px] text-ink-soft">
            {hasRun
              ? 'Select an order in the schedule, or a finding below, to see the inputs behind it.'
              : 'Nothing has been evaluated yet.'}
          </p>
          <p className="mt-1.5 text-[11.5px] text-ink-muted">
            {hasRun
              ? 'Every value shown here comes from the evaluated report, and each one links to the exact source cell it was read from.'
              : 'Choose Run checks. The schedule above shows only the submitted picking times until then.'}
          </p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title="Evidence"
      subtitle="Named inputs, the calculation, and the raw source cells behind this finding."
      bodyClassName="scroll-panel px-3.5 py-3"
    >
      {finding.kind === 'diagnostic' ? (
        <DiagnosticEvidence diagnostic={finding.diagnostic} onOpenSource={onOpenSource} />
      ) : (
        <CheckEvidence check={finding.check} onOpenSource={onOpenSource} />
      )}
    </Panel>
  );
}

function DiagnosticEvidence({
  diagnostic,
  onOpenSource,
}: {
  diagnostic: DataDiagnostic;
  onOpenSource: (source: SourceRef) => void;
}) {
  const { headline, rest } = splitHeadline(diagnostic.message);
  const note = CODE_NOTE[diagnostic.code];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Pill
          tone={diagnostic.kind === 'INVALID_DATA' ? 'bad' : 'warn'}
          glyph={<AlertGlyph />}
        >
          {diagnostic.kind === 'INVALID_DATA' ? 'Invalid data' : 'Missing data'}
        </Pill>
        <code className="mono rounded bg-sunken px-1.5 py-0.5 text-[11.5px] text-ink-soft">
          {diagnostic.code}
        </code>
      </div>

      <div className="rounded-md border border-warn/30 bg-warn-soft/60 px-3 py-2.5">
        <h3 className="text-[16px] font-semibold leading-snug text-ink">
          Cannot evaluate this plan
        </h3>
        <p className="mt-1 text-[13px] font-medium text-ink-soft">{headline}</p>
      </div>

      {rest ? <p className="text-[12.5px] text-ink-soft">{rest}</p> : null}
      {note ? <p className="text-[12.5px] text-ink-muted">{note}</p> : null}

      {diagnostic.source ? (
        <SourceCard
          label="Reported cell"
          source={diagnostic.source}
          onOpenSource={onOpenSource}
        />
      ) : (
        <p className="rounded-md border border-line bg-sunken px-3 py-2 text-[12.5px] text-ink-muted">
          This problem is about the {diagnostic.table} table as a whole, so there is no single
          source cell to open.
        </p>
      )}

      {diagnostic.relatedRecordNumbers && diagnostic.relatedRecordNumbers.length > 0 ? (
        <p className="text-[12.5px] text-ink-soft">
          All affected records:{' '}
          <span className="mono">{diagnostic.relatedRecordNumbers.join(', ')}</span>
        </p>
      ) : null}

      {diagnostic.relatedSources.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            Related source cells
          </h4>
          {diagnostic.relatedSources.map((source, index) => (
            <SourceCard
              key={index}
              label={'Record ' + source.recordNumber}
              source={source}
              onOpenSource={onOpenSource}
            />
          ))}
        </div>
      ) : null}

      <p className="border-t border-line pt-2.5 text-[11.5px] text-ink-muted">
        While input data is not ready, all five plan rule families are blocked. A blocked rule is
        not a passed rule.
      </p>
    </div>
  );
}

function CheckEvidence({
  check,
  onOpenSource,
}: {
  check: CheckResult;
  onOpenSource: (source: SourceRef) => void;
}) {
  const tone = check.status === 'FAIL' ? 'bad' : check.status === 'BLOCKED' ? 'warn' : 'ok';
  const glyph =
    check.status === 'FAIL' ? (
      <AlertGlyph />
    ) : check.status === 'BLOCKED' ? (
      <BlockGlyph />
    ) : (
      <CheckGlyph />
    );
  const statusText =
    check.status === 'FAIL'
      ? 'Modeled violation'
      : check.status === 'BLOCKED'
        ? 'Not evaluated'
        : 'Passed check';

  const isReadiness = check.ruleId === 'PLAN_READY_BY_DEPARTURE';
  const hasMetrics = Object.keys(check.metrics).length > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={tone} glyph={glyph}>
          {statusText}
        </Pill>
        <code className="mono rounded bg-sunken px-1.5 py-0.5 text-[11.5px] text-ink-soft">
          {check.ruleId}
        </code>
        <span className="text-[11.5px] text-ink-muted">{RULE_LABEL[check.ruleId]}</span>
      </div>

      <h3 className="text-[15px] font-semibold leading-snug text-ink">{check.summary}</h3>

      {check.status === 'BLOCKED' && check.blockedBy.length > 0 ? (
        <p className="rounded-md border border-warn/25 bg-warn-soft px-3 py-2 text-[12.5px] text-warn">
          Blocked by <span className="mono">{check.blockedBy.join(', ')}</span>. No readiness time
          was calculated, and no assignment was implicitly chosen.
        </p>
      ) : null}

      {isReadiness && hasMetrics ? (
        <ReadinessCalculation check={check} onOpenSource={onOpenSource} />
      ) : null}

      {!isReadiness && check.formula ? (
        <div>
          <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            Calculation
          </h4>
          <p className="mono rounded-md border border-line bg-sunken px-3 py-2 text-[13px] text-ink">
            {check.formula}
          </p>
        </div>
      ) : null}

      {hasMetrics && !isReadiness ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12.5px]">
          {Object.entries(check.metrics).map(([name, value]) => (
            <div key={name} className="flex items-baseline justify-between gap-2">
              <dt className="text-ink-muted">{humanizeMetric(name)}</dt>
              <dd className="mono text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {check.operands.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            Named inputs and source records
          </h4>
          {check.operands.map((operand, index) => (
            <OperandCard key={index} operand={operand} onOpenSource={onOpenSource} />
          ))}
        </div>
      ) : null}

      {isReadiness ? (
        <p className="border-t border-line pt-2.5 text-[11.5px] text-ink-muted">
          {PACKING_CAVEAT}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The documented readiness breakdown, read straight from engine metrics.
 *
 * Each named value carries a chip that opens the exact source cell the engine
 * read it from. Nothing here is recomputed: the chain displays metrics and the
 * verdict line uses the engine's own lateMinutes/slackMinutes.
 */
function ReadinessCalculation({
  check,
  onOpenSource,
}: {
  check: CheckResult;
  onOpenSource: (source: SourceRef) => void;
}) {
  const m = check.metrics;
  const operandFor = (label: string): Operand | undefined =>
    check.operands.find((o) => o.label === label);

  const late = typeof m.lateMinutes === 'number' && m.lateMinutes > 0;

  return (
    <div className="rounded-md border border-line bg-sunken px-3 py-2.5">
      <ChainRow
        op=""
        label="Picking complete"
        minute={m.pickEndMinute}
        kind="clock"
        operand={operandFor('Picking ends')}
        onOpenSource={onOpenSource}
      />
      <ChainRow
        op="+"
        label="Assumed packing"
        minute={m.packMinutes}
        kind="duration"
        operand={operandFor('Assumed packing')}
        onOpenSource={onOpenSource}
      />
      <div className="my-1 border-t border-line-strong" />
      <ChainRow
        op="="
        label="Modeled ready"
        minute={m.readyMinute}
        kind="clock"
        emphasis
      />
      <ChainRow
        op=""
        label="Departure"
        minute={m.departureMinute}
        kind="clock"
        operand={operandFor('Departure')}
        onOpenSource={onOpenSource}
      />

      <p
        className={
          'mt-2 rounded border px-2.5 py-1.5 text-[13px] font-semibold ' +
          (late
            ? 'border-bad/30 bg-bad-soft text-bad'
            : 'border-ok/30 bg-ok-soft text-ok')
        }
      >
        {late
          ? 'Misses departure by ' + m.lateMinutes + ' min'
          : 'Ready ' + m.slackMinutes + ' min before departure'}
      </p>

      <p className="mono mt-2 border-t border-line pt-2 text-[12px] text-ink-muted">
        {check.formula}
      </p>

      {formatClock(m.readyMinute) === null ? (
        <p className="mt-1.5 text-[11.5px] text-warn">
          The modeled ready minute falls outside the modeled 0-720 window, so no clock time is
          shown for it.
        </p>
      ) : null}
    </div>
  );
}

function sourceChipLabel(operand: Operand): string {
  return (
    'Open ' +
    operand.source.fileName +
    ' record ' +
    operand.source.recordNumber +
    ', column ' +
    operand.source.column
  );
}

function ChainRow({
  op,
  label,
  minute,
  kind,
  emphasis = false,
  operand,
  onOpenSource,
}: {
  op: string;
  label: string;
  minute: number;
  kind: 'clock' | 'duration';
  emphasis?: boolean;
  operand?: Operand;
  onOpenSource?: (source: SourceRef) => void;
}) {
  const clock = kind === 'clock' ? formatClock(minute) : null;
  const primary = kind === 'clock' ? (clock ?? minute + ' min') : minute + ' min';
  const secondary = kind === 'clock' ? minute + ' min' : '';

  return (
    <div className="flex items-baseline gap-2 py-[3px]">
      <span className="mono w-3 shrink-0 text-[13px] text-ink-muted">{op}</span>
      <span className={'flex-1 text-[12.5px] ' + (emphasis ? 'text-ink' : 'text-ink-soft')}>
        {label}
      </span>
      <span
        className={
          'mono tabular-nums ' +
          (emphasis ? 'text-[15px] font-bold text-ink' : 'text-[13.5px] font-semibold text-ink')
        }
      >
        {primary}
      </span>
      <span className="mono w-12 shrink-0 text-right text-[11px] tabular-nums text-ink-muted">
        {secondary}
      </span>
      {operand && onOpenSource ? (
        <button
          type="button"
          onClick={() => onOpenSource(operand.source)}
          // The visible chip is terse, so the control needs a full spoken name.
          aria-label={sourceChipLabel(operand)}
          title={sourceChipLabel(operand)}
          className="mono shrink-0 rounded border border-line-strong bg-surface px-1.5 py-0.5 text-[10px] text-accent transition-colors hover:border-accent hover:bg-accent-soft"
        >
          rec {operand.source.recordNumber}
        </button>
      ) : (
        <span className="w-[52px] shrink-0" />
      )}
    </div>
  );
}

function humanizeMetric(name: string): string {
  const spaced = name.replace(/([A-Z])/g, ' $1').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function OperandCard({
  operand,
  onOpenSource,
}: {
  operand: Operand;
  onOpenSource: (source: SourceRef) => void;
}) {
  return (
    <SourceCard
      label={operand.label}
      value={operand.value}
      unit={operand.unit}
      source={operand.source}
      onOpenSource={onOpenSource}
    />
  );
}

function SourceCard({
  label,
  value,
  unit,
  source,
  onOpenSource,
}: {
  label: string;
  value?: string | number;
  unit?: OperandUnit;
  source: SourceRef;
  onOpenSource: (source: SourceRef) => void;
}) {
  const raw = source.rawValue;
  const shown = value === undefined ? null : operandDisplay(value, unit);

  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12.5px] text-ink-soft">{label}</span>
        {shown ? (
          <span className="mono text-[13px] font-semibold text-ink">
            {shown.text}
            {shown.clock ? (
              <span className="ml-1.5 font-normal text-ink-muted">({shown.clock})</span>
            ) : null}
          </span>
        ) : null}
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <span className="mono text-[11.5px] text-ink-muted">
          {source.fileName} · record {source.recordNumber} · {source.column}
        </span>
        <button
          type="button"
          onClick={() => onOpenSource(source)}
          className="inline-flex items-center gap-1.5 rounded border border-line-strong bg-surface px-2 py-1 text-[11.5px] font-medium text-accent transition-colors hover:border-accent hover:bg-accent-soft"
        >
          <SourceGlyph />
          Open source cell
        </button>
      </div>
      <p className="mt-1 text-[11.5px] text-ink-muted">
        Raw value:{' '}
        <span className="mono text-ink-soft">
          {raw === null ? '[column absent]' : raw === '' ? '[empty]' : raw}
        </span>
      </p>
    </div>
  );
}
