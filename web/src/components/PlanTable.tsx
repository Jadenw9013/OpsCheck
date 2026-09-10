'use client';

import { formatClock } from '@/domain/constants';
import type { PlanRow } from '@/features/viewModel';
import { AlertGlyph, BlockGlyph, CheckGlyph, IdleGlyph, Panel } from './ui';

/**
 * The submitted plan, exactly as supplied, plus the columns the engine derived.
 *
 * Every derived cell is read straight off the PlanRow the engine populated.
 * This component never adds, subtracts, or compares a minute value itself, so
 * it cannot drift away from the rule results shown in the evidence panel.
 */

const NOT_EVALUATED = 'Not evaluated';

export function PlanTable({
  rows,
  hasRun,
  selectedId,
  onSelect,
}: {
  rows: PlanRow[];
  hasRun: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const subtitle = hasRun
    ? 'Submitted assignments with the values the engine derived for them.'
    : 'Submitted assignments as supplied. Derived columns stay empty until checks run.';

  return (
    <Panel title="Submitted plan" subtitle={subtitle} bodyClassName="scroll-panel max-h-[19rem]">
      {rows.length === 0 ? (
        <p className="px-3.5 py-6 text-center text-[12.5px] text-ink-muted">
          The plan table could not be read, so there are no assignments to show. The raw file is
          still inspectable below.
        </p>
      ) : (
        <table className="w-full border-collapse text-[12.5px]">
          <caption className="sr-only">
            Submitted picking assignments and engine-derived readiness
          </caption>
          <thead className="sticky top-0 z-10 bg-sunken text-[11px] uppercase tracking-wide text-ink-muted">
            <tr>
              <Th className="text-left">Assignment</Th>
              <Th className="text-left">Order</Th>
              <Th className="text-left">Worker</Th>
              <Th className="text-right">Start</Th>
              <Th className="text-right">End</Th>
              <Th className="text-right">Pick req.</Th>
              <Th className="text-right">Pack</Th>
              <Th className="text-left">Departure</Th>
              <Th className="text-right">Modeled ready</Th>
              <Th className="text-left">Status</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <Row key={row.key} row={row} selectedId={selectedId} onSelect={onSelect} />
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={'whitespace-nowrap px-2.5 py-1.5 font-semibold ' + className}>
      {children}
    </th>
  );
}

function Row({
  row,
  selectedId,
  onSelect,
}: {
  row: PlanRow;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const target = row.findingIds[0] ?? null;
  const selected = target !== null && row.findingIds.includes(selectedId ?? '');
  const clickable = target !== null;

  const tint =
    row.rowStatus === 'FAIL'
      ? 'bg-bad-soft/45'
      : row.rowStatus === 'BLOCKED'
        ? 'bg-warn-soft/40'
        : '';

  return (
    <tr
      className={
        'transition-colors ' +
        tint +
        (selected ? ' outline outline-1 -outline-offset-1 outline-accent' : '') +
        (clickable ? ' cursor-pointer hover:bg-accent-soft/40' : '')
      }
      onClick={clickable ? () => onSelect(target) : undefined}
    >
      <td className="mono whitespace-nowrap px-2.5 py-1.5 text-ink">
        {clickable ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect(target);
            }}
            className="rounded text-left text-accent underline decoration-line-strong underline-offset-2 hover:decoration-accent"
          >
            {row.assignmentId}
          </button>
        ) : (
          row.assignmentId
        )}
      </td>
      <td className="mono whitespace-nowrap px-2.5 py-1.5 text-ink">{row.orderId}</td>
      <td className="mono whitespace-nowrap px-2.5 py-1.5 text-ink-soft">{row.workerId}</td>
      <MinuteCell text={row.startText} />
      <MinuteCell text={row.endText} />
      <NumberCell value={row.pickRequired} />
      <NumberCell value={row.packAssumed} />
      <td className="mono whitespace-nowrap px-2.5 py-1.5 text-ink-soft">
        {row.departureId ?? <Pending />}
        {row.departureMinute !== null ? (
          <span className="ml-1.5 text-ink-muted">{minuteText(row.departureMinute)}</span>
        ) : null}
      </td>
      <td className="mono whitespace-nowrap px-2.5 py-1.5 text-right">
        {row.readyState === 'VALUE' && row.readyMinute !== null ? (
          <span className={row.rowStatus === 'FAIL' ? 'font-semibold text-bad' : 'text-ink'}>
            {row.readyMinute} min
            <span className="ml-1.5 font-normal text-ink-muted">
              {minuteText(row.readyMinute)}
            </span>
          </span>
        ) : (
          <Pending />
        )}
      </td>
      <td className="whitespace-nowrap px-2.5 py-1.5">
        <StatusTag status={row.rowStatus} />
      </td>
    </tr>
  );
}

/** Raw source text for a submitted interval endpoint; never reformatted. */
function MinuteCell({ text }: { text: string }) {
  return <td className="mono whitespace-nowrap px-2.5 py-1.5 text-right text-ink-soft">{text}</td>;
}

function NumberCell({ value }: { value: number | null }) {
  return (
    <td className="mono whitespace-nowrap px-2.5 py-1.5 text-right text-ink-soft">
      {value === null ? <Pending /> : value}
    </td>
  );
}

function Pending() {
  return <span className="text-[11px] font-normal not-italic text-ink-muted">{NOT_EVALUATED}</span>;
}

function minuteText(minute: number): string {
  return formatClock(minute) ?? 'outside modeled window';
}

function StatusTag({ status }: { status: PlanRow['rowStatus'] }) {
  if (status === 'FAIL') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-bad">
        <AlertGlyph className="h-3 w-3" />
        Violation
      </span>
    );
  }
  if (status === 'BLOCKED') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-warn">
        <BlockGlyph className="h-3 w-3" />
        Blocked
      </span>
    );
  }
  if (status === 'PASS') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ok">
        <CheckGlyph className="h-3 w-3" />
        Passed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-ink-muted">
      <IdleGlyph className="h-3 w-3" />
      {NOT_EVALUATED}
    </span>
  );
}
