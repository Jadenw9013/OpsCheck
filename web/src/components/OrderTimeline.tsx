'use client';

import { formatClock } from '@/domain/constants';
import {
  axisPercent,
  segmentPercent,
  type TimelineAxis,
  type TimelineModel,
  type TimelineRow,
} from '@/features/viewModel';
import { AlertGlyph, BlockGlyph, CheckGlyph, IdleGlyph, Panel } from './ui';

/**
 * The submitted-order schedule.
 *
 * One row per submitted order. Every position comes from the timeline adapter,
 * which reads submitted inputs and published engine results; this component
 * decides no operational outcome. Before evaluation only the submitted picking
 * interval is drawn, so no readiness or deadline verdict can be implied.
 *
 * Geometry rule: the axis header and every order row use the SAME shell, so the
 * plotting area shares one origin and one width. A time position is rendered as
 * a zero-width anchor at its exact percentage; visible labels and bars are
 * shifted relative to that anchor for legibility, which never moves the anchor
 * itself.
 */

function clockOf(minute: number): string {
  return formatClock(minute) ?? minute + ' min';
}

/**
 * Keep an edge label inside the plotted area. A label centred on 0% or 100%
 * would hang outside the track and widen the page on a narrow screen. This
 * shifts the visible element only; its anchor stays at the true time position.
 */
function edgeTransform(percent: number): string {
  if (percent <= 0.5) return 'translateX(0)';
  if (percent >= 99.5) return 'translateX(-100%)';
  return 'translateX(-50%)';
}

/**
 * Identical column geometry for the axis header and every row: same left
 * border, label column, gap, plotting area, and status column. Changing this
 * in one place changes both, so the axis cannot drift away from the tracks.
 */
const ROW_SHELL = 'flex w-full items-center gap-2 border-l-[3px] py-1 pr-1';
const LABEL_WIDTH = 'w-[76px] shrink-0 sm:w-[104px]';
const STATUS_WIDTH = 'w-[74px] shrink-0 sm:w-[96px]';

/** Below this share of the axis, the bar cannot hold its label legibly. */
const MIN_LABEL_PERCENT = 8;

export function OrderTimeline({
  model,
  hasRun,
  selectedId,
  onSelect,
}: {
  model: TimelineModel;
  hasRun: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const subtitle = model.evaluated
    ? 'Submitted picking, modeled packing, and each order’s departure, positioned on one shared clock.'
    : model.blocked
      ? 'Submitted picking times only. Required data is missing, so nothing derived is drawn.'
      : 'Submitted picking times as supplied. Run checks to model packing and readiness.';

  return (
    <Panel title="Order schedule" subtitle={subtitle}>
      {model.blocked ? (
        <p className="border-b border-line bg-warn-soft/50 px-3.5 py-2 text-[12px] text-warn">
          <strong className="font-semibold">Not evaluated.</strong> Required input data is missing,
          so no modeled packing, readiness, or deadline result is drawn for any order. The submitted
          picking times below are shown exactly as supplied.
        </p>
      ) : null}

      <div className="px-3.5 py-2.5">
        <Legend evaluated={model.evaluated} />
        <AxisHeader axis={model.axis} />

        {model.rows.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-ink-muted">
            No submitted assignments could be read, so there is nothing to plot.
          </p>
        ) : (
          <ul className="mt-1 space-y-0.5">
            {model.rows.map((row) => (
              <Row
                key={row.key}
                row={row}
                axis={model.axis}
                selected={row.findingIds.length > 0 && row.findingIds.includes(selectedId ?? '')}
                onSelect={onSelect}
              />
            ))}
          </ul>
        )}

        <p className="mt-2.5 border-t border-line pt-2 text-[11px] text-ink-muted">
          Packing is a modeled fixed delay beginning the moment picking ends.{' '}
          <strong className="font-semibold text-ink-soft">
            Packing capacity is not modeled
          </strong>{' '}
          — the hatched band is an assumed duration, not a reserved packing resource.
          {hasRun ? '' : ' Nothing derived is drawn until checks run.'}
        </p>
      </div>
    </Panel>
  );
}

/**
 * A zero-width marker at an exact time position.
 *
 * Tests measure these anchors rather than the visible text, whose box moves
 * with its own alignment transform.
 */
function TimeAnchor({
  percent,
  minute,
  className = '',
  children,
}: {
  percent: number;
  minute: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      data-time-anchor={minute}
      className={'absolute w-0 ' + className}
      style={{ left: percent + '%' }}
    >
      {children}
    </span>
  );
}

function AxisHeader({ axis }: { axis: TimelineAxis }) {
  return (
    <div className={ROW_SHELL + ' border-l-transparent'}>
      <div className={LABEL_WIDTH + ' pl-1.5'} />
      <div data-plot="axis" className="relative h-4 flex-1">
        {axis.ticks.map((tick) => {
          const percent = axisPercent(axis, tick);
          return (
            <TimeAnchor key={tick} percent={percent} minute={tick} className="axis-tick top-0 h-4">
              <span
                className="mono absolute left-0 top-0 whitespace-nowrap text-[10px] tabular-nums text-ink-muted"
                style={{ transform: edgeTransform(percent) }}
              >
                {clockOf(tick)}
              </span>
            </TimeAnchor>
          );
        })}
      </div>
      <div className={STATUS_WIDTH} />
    </div>
  );
}

function Row({
  row,
  axis,
  selected,
  onSelect,
}: {
  row: TimelineRow;
  axis: TimelineAxis;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const target = row.findingIds[0] ?? null;
  const selectable = target !== null;

  const late = row.status === 'FAIL';
  const statusLabel =
    row.status === 'FAIL'
      ? 'misses departure'
      : row.status === 'BLOCKED'
        ? 'not evaluated'
        : row.status === 'PASS'
          ? 'ready before departure'
          : 'not evaluated';

  // The whole row is one control, so selection is reachable by keyboard.
  const Wrapper = selectable ? 'button' : 'div';

  const pickPercent = row.pick === null ? 0 : segmentPercent(axis, row.pick);
  const showPickLabel = pickPercent >= MIN_LABEL_PERCENT;

  return (
    <li>
      <Wrapper
        {...(selectable
          ? {
              type: 'button' as const,
              onClick: () => onSelect(target),
              'aria-pressed': selected,
              'aria-label':
                row.orderId +
                ', worker ' +
                row.workerId +
                ', ' +
                describeRow(row) +
                ', ' +
                statusLabel,
            }
          : {})}
        className={
          ROW_SHELL +
          ' rounded text-left transition-colors ' +
          (selected
            ? 'border-l-accent bg-accent-soft/60'
            : 'border-l-transparent ' + (selectable ? 'hover:bg-sunken' : ''))
        }
      >
        <span className={LABEL_WIDTH + ' pl-1.5'}>
          <span className="mono flex items-center gap-1 text-[12px] font-semibold text-ink">
            {late ? (
              <span className="text-bad">
                <AlertGlyph className="h-3 w-3" />
              </span>
            ) : null}
            {row.orderId}
          </span>
          <span className="mono block text-[10.5px] text-ink-muted">{row.workerId}</span>
        </span>

        <span data-plot="row" className="relative h-8 flex-1 overflow-hidden rounded-sm bg-sunken">
          <Gridlines axis={axis} />

          {row.pick ? (
            <span
              className={
                'absolute top-1.5 flex h-5 items-center justify-center overflow-hidden rounded-[3px] text-[10px] font-semibold ' +
                (row.status === 'NOT_EVALUATED' ? 'bg-idle text-white' : 'bg-accent text-white')
              }
              style={{
                left: axisPercent(axis, row.pick.startMinute) + '%',
                width: pickPercent + '%',
              }}
              title={
                'Submitted picking ' +
                clockOf(row.pick.startMinute) +
                ' to ' +
                clockOf(row.pick.endMinute)
              }
            >
              {/* Decorative: the row's accessible name already states the times.
                  Hidden when the bar is too narrow to hold it without clipping. */}
              {showPickLabel ? <span className="hidden px-1 sm:inline">pick</span> : null}
            </span>
          ) : (
            <span className="absolute inset-y-0 left-0 flex items-center pl-1 text-[10.5px] text-ink-muted">
              {row.note ?? 'Not plottable'}
            </span>
          )}

          {row.pack ? (
            <span
              className="pack-band absolute top-1.5 h-5 rounded-[3px]"
              style={{
                left: axisPercent(axis, row.pack.startMinute) + '%',
                width: segmentPercent(axis, row.pack) + '%',
              }}
              title={
                'Modeled packing, ' +
                (row.pack.endMinute - row.pack.startMinute) +
                ' min assumed delay'
              }
            />
          ) : null}

          {row.overrun ? (
            <span
              className="overrun-band absolute bottom-0.5 h-1.5 rounded-full"
              style={{
                left: axisPercent(axis, row.overrun.startMinute) + '%',
                width: segmentPercent(axis, row.overrun) + '%',
              }}
            />
          ) : null}

          {row.departureMinute !== null ? (
            <TimeAnchor
              percent={axisPercent(axis, row.departureMinute)}
              minute={row.departureMinute}
              className="inset-y-0 z-10"
            >
              <span
                className={
                  'absolute inset-y-0 left-0 w-[3px] rounded-full ' + (late ? 'bg-bad' : 'bg-ink')
                }
                style={{ transform: edgeTransform(axisPercent(axis, row.departureMinute)) }}
                title={'Departure ' + clockOf(row.departureMinute)}
              />
            </TimeAnchor>
          ) : null}

          {row.readyMinute !== null ? (
            <TimeAnchor
              percent={axisPercent(axis, row.readyMinute)}
              minute={row.readyMinute}
              className="top-0 z-20"
            >
              <span
                className={
                  'mono absolute left-0 top-0 block whitespace-nowrap rounded-full px-1 text-[9.5px] font-semibold ' +
                  (late ? 'bg-bad text-white' : 'bg-ok text-white')
                }
                style={{ transform: edgeTransform(axisPercent(axis, row.readyMinute)) }}
              >
                {clockOf(row.readyMinute)}
              </span>
            </TimeAnchor>
          ) : null}
        </span>

        <span className={STATUS_WIDTH + ' text-right'}>
          {row.status === 'FAIL' && row.lateMinutes !== null ? (
            <span className="mono text-[11px] font-semibold text-bad">
              +{row.lateMinutes} min late
            </span>
          ) : row.status === 'PASS' ? (
            <span className="inline-flex items-center justify-end gap-1 text-[11px] text-ok">
              <CheckGlyph className="h-3 w-3" />
              on time
            </span>
          ) : row.status === 'BLOCKED' ? (
            <span className="inline-flex items-center justify-end gap-1 text-[11px] text-warn">
              <BlockGlyph className="h-3 w-3" />
              blocked
            </span>
          ) : (
            <span className="inline-flex items-center justify-end gap-1 text-[10.5px] text-ink-muted">
              <IdleGlyph className="h-3 w-3" />
              not evaluated
            </span>
          )}
        </span>
      </Wrapper>
    </li>
  );
}

function describeRow(row: TimelineRow): string {
  if (row.pick === null) return row.note ?? 'no plottable interval';
  const base =
    'picking ' + clockOf(row.pick.startMinute) + ' to ' + clockOf(row.pick.endMinute);
  if (row.readyMinute === null) return base;
  const ready = ', modeled ready ' + clockOf(row.readyMinute);
  const departure =
    row.departureMinute === null ? '' : ', departure ' + clockOf(row.departureMinute);
  return base + ready + departure;
}

function Gridlines({ axis }: { axis: TimelineAxis }) {
  return (
    <>
      {axis.ticks.map((tick) => (
        <span
          key={tick}
          aria-hidden="true"
          className="absolute inset-y-0 w-px bg-line"
          style={{ left: axisPercent(axis, tick) + '%' }}
        />
      ))}
    </>
  );
}

function Legend({ evaluated }: { evaluated: boolean }) {
  return (
    <ul
      aria-label="Schedule legend"
      className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-ink-muted"
    >
      <li className="flex items-center gap-1.5">
        <span className={'h-2.5 w-4 rounded-[2px] ' + (evaluated ? 'bg-accent' : 'bg-idle')} />
        Submitted picking
      </li>
      {evaluated ? (
        <>
          <li className="flex items-center gap-1.5">
            <span className="pack-band h-2.5 w-4 rounded-[2px]" />
            Modeled packing
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-3 w-[3px] rounded-full bg-ink" />
            Departure
          </li>
          <li className="flex items-center gap-1.5">
            <span className="overrun-band h-1.5 w-4 rounded-full" />
            Deadline miss
          </li>
        </>
      ) : null}
    </ul>
  );
}
