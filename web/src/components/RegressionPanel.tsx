'use client';

import { useCallback, useState } from 'react';
import {
  runRegressionSuite,
  summarizeRegression,
  type RegressionResult,
  type RegressionStatus,
  type RegressionSummary,
} from '@/features/regression';
import { AlertGlyph, BlockGlyph, CheckGlyph, Disclosure } from './ui';

/**
 * The frozen-fixture sweep, on demand.
 *
 * It reads the bundled synthetic fixtures, evaluates each one, and compares the
 * result to the independently supplied expectation. It never reads, changes, or
 * is affected by the files loaded in the workspace above, and it runs only when
 * the button is pressed: importing a file does not silently start a sweep.
 */

interface RunState {
  running: boolean;
  results: RegressionResult[] | null;
}

function useRegression() {
  const [state, setState] = useState<RunState>({ running: false, results: null });

  const run = useCallback(() => {
    setState({ running: true, results: null });
    // The sweep is synchronous and fast. Deferring by one turn lets the button
    // actually reach its running state instead of claiming one after the fact.
    window.setTimeout(() => {
      setState({ running: false, results: runRegressionSuite() });
    }, 0);
  }, []);

  return { ...state, run };
}

const STATUS_CLASS: Record<RegressionStatus, string> = {
  PASS: 'bg-ok-soft text-ok border-ok/25',
  FAIL: 'bg-bad-soft text-bad border-bad/25',
  ERROR: 'bg-warn-soft text-warn border-warn/25',
};

function StatusBadge({ status }: { status: RegressionStatus }) {
  const glyph =
    status === 'PASS' ? (
      <CheckGlyph />
    ) : status === 'FAIL' ? (
      <AlertGlyph />
    ) : (
      <BlockGlyph />
    );
  return (
    <span
      className={
        'ops-meta inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-semibold ' +
        STATUS_CLASS[status]
      }
    >
      {glyph}
      {status}
    </span>
  );
}

function summaryText(summary: RegressionSummary | null): string {
  if (summary === null) return '—';
  const c = summary.checkCounts;
  return (
    summary.dataStatus +
    ' · ' +
    summary.planStatus +
    ' · ' +
    c.passed +
    '/' +
    c.failed +
    '/' +
    c.blocked +
    ' · ' +
    summary.diagnosticCount +
    (summary.diagnosticCount === 1 ? ' diagnostic' : ' diagnostics')
  );
}

export function RegressionPanel() {
  const { running, results, run } = useRegression();
  const totals = results === null ? null : summarizeRegression(results);
  const allPassed = totals !== null && totals.passed === totals.total;

  return (
    <Disclosure
      summary="Regression cases"
      hint="Every frozen fixture against its supplied expectation."
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <button
            type="button"
            onClick={run}
            disabled={running}
            className="ops-control ops-control--primary"
          >
            {running ? 'Running…' : 'Run all regression cases'}
          </button>

          <p aria-live="polite" className="ops-body text-ink-soft">
            {running ? (
              'Evaluating every bundled case…'
            ) : totals === null ? (
              'Not run in this session.'
            ) : (
              <>
                <strong className={'font-semibold ' + (allPassed ? 'text-ok' : 'text-bad')}>
                  {totals.passed} of {totals.total} matched
                </strong>
                {totals.failed > 0 ? ' · ' + totals.failed + ' mismatched' : ''}
                {totals.errored > 0 ? ' · ' + totals.errored + ' could not be compared' : ''}
              </>
            )}
          </p>
        </div>

        <p className="ops-meta max-w-[80ch] text-ink-muted">
          Each case is evaluated from its bundled synthetic files and compared field-for-field with
          the frozen expectation in <span className="mono">expected-results.json</span>. The
          expectations are the contract: a mismatch is reported as a failure and is never resolved
          by editing the expectation. The counts below read passed/failed/blocked.
        </p>

        {results !== null ? (
          <div className="ops-scroll-region max-h-[28rem] overflow-auto">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">
                Regression results: each bundled case against its frozen expectation
              </caption>
              <thead className="sticky top-0 bg-surface">
                <tr className="ops-meta text-ink-muted">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Case
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Result
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Expected
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Actual
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Detail
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.scenarioId} className="border-t border-line align-top">
                    <td className="py-2 pr-4">
                      <span className="mono ops-meta font-medium text-ink">{r.scenarioId}</span>
                      <span className="ops-meta ml-2 text-ink-soft">{r.title}</span>
                    </td>
                    <td className="py-2 pr-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="mono ops-meta py-2 pr-4 text-ink-muted">
                      {summaryText(r.expected)}
                    </td>
                    <td className="mono ops-meta py-2 pr-4 text-ink-muted">
                      {summaryText(r.actual)}
                    </td>
                    <td
                      className={
                        'ops-meta py-2 ' +
                        (r.status === 'PASS' ? 'text-ink-muted' : 'font-medium text-bad')
                      }
                    >
                      {r.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </Disclosure>
  );
}
