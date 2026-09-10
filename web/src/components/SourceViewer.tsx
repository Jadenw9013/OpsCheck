'use client';

import { useEffect, useRef } from 'react';
import { TABLE_LABEL, TABLE_ORDER } from '@/domain/constants';
import type { TableKind } from '@/domain/types';
import type { InputPreview } from '@/features/inputPreview';
import type { SourceTarget } from '@/features/viewModel';

/**
 * The raw CSV tables, always inspectable, including when invalid or missing
 * data blocks plan evaluation. All text renders through normal React
 * interpolation; no raw HTML is ever injected.
 */
export function SourceViewer({
  preview,
  activeTable,
  target,
  onSelectTable,
}: {
  preview: InputPreview;
  activeTable: TableKind;
  target: SourceTarget | null;
  onSelectTable: (table: TableKind) => void;
}) {
  const regionRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef(new Map<string, HTMLElement>());

  const table = preview[activeTable];
  const headers = table.raw.headers;
  const trimmed = headers.map((h) => h.trim());

  const isTargetTable = target !== null && target.table === activeTable;
  const targetColumnIndex = isTargetTable ? trimmed.indexOf(target.column) : -1;
  // A missing column has no cell to point at, so the whole header row is marked.
  const headerRowIsTarget =
    isTargetTable && target.recordNumber === 1 && targetColumnIndex === -1;

  useEffect(() => {
    if (target === null) return;
    const region = regionRef.current;
    if (region) region.focus({ preventScroll: true });
    const cell = cellRefs.current.get(target.recordNumber + ':' + target.column);
    const element = cell ?? region;
    element?.scrollIntoView({ block: 'center', inline: 'nearest' });
  }, [target]);

  const registerCell = (key: string) => (node: HTMLElement | null) => {
    if (node) cellRefs.current.set(key, node);
    else cellRefs.current.delete(key);
  };

  return (
    <div
      ref={regionRef}
      tabIndex={-1}
      id="source-viewer"
      aria-label="Raw source records"
      className="flex min-h-0 flex-col rounded-lg border border-line bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <h2 className="ops-body font-semibold text-ink">Raw source records</h2>
          <span className="ops-meta text-ink-muted">
            Record numbers are logical CSV records, not physical line numbers. The header is
            record&nbsp;1.
          </span>
        </div>
        <div
          role="tablist"
          aria-label="Source table"
          className="flex rounded-md border border-line bg-sunken p-0.5"
        >
          {TABLE_ORDER.map((kind) => {
            const selected = kind === activeTable;
            return (
              <button
                key={kind}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls={'source-panel-' + kind}
                onClick={() => onSelectTable(kind)}
                className={
                  'rounded px-2.5 py-1 ops-body font-medium transition-colors ' +
                  (selected
                    ? 'bg-surface text-ink shadow-[0_1px_2px_rgba(16,24,40,0.10)]'
                    : 'text-ink-muted hover:text-ink')
                }
              >
                {TABLE_LABEL[kind]}
                <span className="ml-1.5 mono ops-meta text-ink-muted">
                  {preview[kind].recordCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        id={'source-panel-' + activeTable}
        role="tabpanel"
        aria-label={TABLE_LABEL[activeTable] + ' source records'}
        className="min-h-0"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-sunken px-3.5 py-1.5 ops-meta text-ink-muted">
          <span className="mono text-ink-soft">{table.fileName ?? 'no file loaded'}</span>
          <span>
            profile <span className="mono">{table.profile ?? '—'}</span>
          </span>
          <span>
            {table.recordCount} data {table.recordCount === 1 ? 'record' : 'records'}
          </span>
          {table.missingHeaders.length > 0 ? (
            <span className="text-bad">
              missing required column{table.missingHeaders.length === 1 ? '' : 's'}:{' '}
              <span className="mono">{table.missingHeaders.join(', ')}</span>
            </span>
          ) : null}
          {table.raw.ignoredColumns.length > 0 ? (
            <span>
              ignored: <span className="mono">{table.raw.ignoredColumns.join(', ')}</span>
            </span>
          ) : null}
        </div>

        {headers.length === 0 ? (
          <p className="px-3.5 py-6 ops-body text-ink-muted">
            This file could not be read as CSV, so no records are available to inspect.
          </p>
        ) : (
          <div className="scroll-panel max-h-[220px]">
            <table className="w-full border-collapse ops-body">
              <thead className="sticky top-0 z-10 bg-sunken">
                <tr className={headerRowIsTarget ? 'cell-hit' : undefined}>
                  <th
                    scope="col"
                    className="w-14 border-b border-line px-2.5 py-1.5 text-left ops-meta font-semibold uppercase tracking-wide text-ink-muted"
                  >
                    Rec
                  </th>
                  {headers.map((header, index) => {
                    const key = '1:' + trimmed[index];
                    const hit =
                      isTargetTable && target.recordNumber === 1 && index === targetColumnIndex;
                    return (
                      <th
                        key={index}
                        scope="col"
                        ref={registerCell(key)}
                        className={
                          'mono border-b border-line px-2.5 py-1.5 text-left font-semibold text-ink-soft ' +
                          (hit ? 'cell-hit' : '')
                        }
                      >
                        {header}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {table.raw.records.map((record) => {
                  const rowIsTarget = isTargetTable && target.recordNumber === record.recordNumber;
                  return (
                    <tr
                      key={record.recordNumber}
                      className={rowIsTarget ? 'bg-accent-soft/40' : 'even:bg-sunken/60'}
                    >
                      <th
                        scope="row"
                        className="mono border-b border-line px-2.5 py-1 text-left font-normal text-ink-muted"
                      >
                        {record.recordNumber}
                      </th>
                      {headers.map((_header, index) => {
                        const value = record.cells[index] ?? '';
                        const hit = rowIsTarget && index === targetColumnIndex;
                        return (
                          <td
                            key={index}
                            ref={registerCell(record.recordNumber + ':' + trimmed[index])}
                            className={
                              'mono border-b border-line px-2.5 py-1 text-ink ' +
                              (hit ? 'cell-hit' : '')
                            }
                          >
                            {value === '' ? <span className="sr-only">empty</span> : value}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
