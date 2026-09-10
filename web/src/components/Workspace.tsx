'use client';

import type { DataStatus, SourceRef } from '@/domain/types';
import { findFinding } from '@/features/viewModel';
import { useOpsCheck } from '@/features/useOpsCheck';
import { BASELINE_SCENARIO_ID, DEMO_SCENARIO_IDS, scenarioMeta } from '@/fixtures/loadScenario';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useBriefing } from '@/features/useBriefing';
import { AiReportPanel, PlanStrip } from './AiReportPanel';
import { EvidencePanel } from './EvidencePanel';
import { FindingsList } from './FindingsList';
import { OrderTimeline } from './OrderTimeline';
import { PlanTable } from './PlanTable';
import { SourceViewer } from './SourceViewer';
import {
  AlertGlyph,
  CheckGlyph,
  ChevronGlyph,
  IdleGlyph,
  MissingGlyph,
  Pill,
  type Tone,
} from './ui';

/**
 * What each scenario CHANGES about the inputs.
 *
 * The bundled fixture descriptions announce expected outcomes ("O-104 is
 * modeled ready at minute 75, ten minutes late"), which would state a
 * conclusion before anything has been evaluated. `scenarios.json` is a frozen
 * fixture that must stay byte-identical to `seed-data/`, so the presentation
 * copy lives here. Calculated conclusions belong to the evaluated result.
 */
const SCENARIO_INPUT_SUMMARY: Record<string, string> = {
  S00: 'Eight orders across two departures, D-1 at 10:00 and D-2 at 11:00, with two pickers.',
  S01: 'Baseline inputs, with departure D-1 moved earlier to 09:05.',
  S02: 'Baseline inputs, with the packing duration for order O-104 left blank.',
};

/**
 * The single OpsCheck workspace.
 *
 * All state and every derived number come from useOpsCheck, which delegates to
 * the pure engine. This component chooses wording and layout only; it evaluates
 * nothing, and it never branches on a scenario id to decide what to display.
 */
export function Workspace() {
  const c = useOpsCheck();
  const selected = findFinding(c.findings, c.selectedFindingId);

  // Any scenario change, reset, or new engine run invalidates the AI report.
  // Including runSerial means a re-run of identical inputs still produces a new
  // key, so an older report can never look current.
  const invalidationKey =
    c.scenarioId + ':' + (c.hasRun ? 'run' : 'not-run') + ':' + c.runSerial;
  const briefing = useBriefing({ invalidationKey });

  const [tab, setTab] = useState<'ai' | 'evidence'>('evidence');
  // Tracks what the user last chose, so a late completion cannot pull them back
  // to the AI tab after they moved to Evidence.
  const userChoseTab = useRef(false);

  const selectTab = useCallback((next: 'ai' | 'evidence') => {
    userChoseTab.current = true;
    setTab(next);
  }, []);

  /**
   * Run checks: the deterministic pipeline updates first and independently of
   * the network. Only then, and only with the switch on, is one provider
   * request authorized for this exact snapshot.
   */
  const runChecks = useCallback(() => {
    c.run();
    if (briefing.available && briefing.includeAi) {
      const nextKey = c.scenarioId + ':run:' + (c.runSerial + 1);
      userChoseTab.current = false;
      setTab('ai');
      briefing.startForRun({ scenarioId: c.scenarioId, bundle: c.bundle, key: nextKey });
    }
  }, [briefing, c]);

  // Selecting a finding is an explicit request to inspect evidence.
  const selectFinding = useCallback(
    (id: string) => {
      c.selectFinding(id);
      selectTab('evidence');
    },
    [c, selectTab],
  );

  const openSource = useCallback(
    (source: SourceRef) => c.openSource(source.table, source.recordNumber, source.column),
    [c],
  );

  // A new snapshot resets tab intent; nothing here starts a request.
  useEffect(() => {
    userChoseTab.current = false;
  }, [invalidationKey]);

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 px-3 py-3 sm:px-4">
      <Header />

      <ControlBar
        scenarioId={c.scenarioId}
        onSelectScenario={c.selectScenario}
        onRun={runChecks}
        onReset={c.resetBaseline}
        controller={c}
        briefing={briefing}
      />

      {c.evaluationError !== null ? (
        <p
          role="alert"
          className="rounded-lg border border-bad/25 bg-bad-soft px-3.5 py-2.5 text-[12.5px] text-bad"
        >
          <strong className="font-semibold">Evaluation could not complete.</strong>{' '}
          {c.evaluationError} No result is shown, and nothing is reported as passing.
        </p>
      ) : null}

      <div className="grid min-h-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <OrderTimeline
            model={c.timeline}
            hasRun={c.hasRun}
            selectedId={c.selectedFindingId}
            onSelect={selectFinding}
          />
          <FindingsList
            report={c.report}
            groups={c.findings}
            hasRun={c.hasRun}
            stale={c.stale}
            selectedId={c.selectedFindingId}
            showPassed={c.showPassed}
            onSelect={selectFinding}
            onTogglePassed={c.togglePassed}
          />
          <PlanTable
            rows={c.planRows}
            hasRun={c.hasRun}
            selectedId={c.selectedFindingId}
            onSelect={selectFinding}
          />
        </div>

        <div className="min-w-0 lg:sticky lg:top-3 lg:max-h-[calc(100vh-1.5rem)] lg:self-start lg:overflow-y-auto">
          <Inspector
            tab={tab}
            onSelectTab={selectTab}
            briefing={briefing}
            evidence={
              <EvidencePanel finding={selected} hasRun={c.hasRun} onOpenSource={openSource} />
            }
            onOpenSource={openSource}
          />
        </div>
      </div>

      <SourceSection controller={c} />

      <Assumptions />

      <p aria-live="polite" className="sr-only">
        {c.announcement}
      </p>
    </div>
  );
}

/**
 * Two real tabs over one inspector column. The deterministic plan strip stays
 * visible in both, so an AI report can never be the only thing on screen.
 */
function Inspector({
  tab,
  onSelectTab,
  briefing,
  evidence,
  onOpenSource,
}: {
  tab: 'ai' | 'evidence';
  onSelectTab: (tab: 'ai' | 'evidence') => void;
  briefing: ReturnType<typeof useBriefing>;
  evidence: React.ReactNode;
  onOpenSource: (source: SourceRef) => void;
}) {
  const verdict = briefing.response?.briefing?.verdict ?? null;

  return (
    <section
      aria-label="Inspector"
      className="flex min-h-0 flex-col rounded-lg border border-line bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
    >
      <div role="tablist" aria-label="Inspector view" className="flex gap-1 border-b border-line px-2 pt-2">
        {(['ai', 'evidence'] as const).map((id) => {
          const selected = tab === id;
          return (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={'inspector-' + id}
              onClick={() => onSelectTab(id)}
              className={
                'rounded-t-md px-3 py-1.5 text-[12.5px] font-semibold transition-colors ' +
                (selected
                  ? 'border-b-2 border-accent text-accent-strong'
                  : 'border-b-2 border-transparent text-ink-muted hover:text-ink')
              }
            >
              {id === 'ai' ? 'AI report' : 'Evidence'}
              {id === 'ai' && briefing.busy ? (
                <span className="ml-1.5 text-[10.5px] font-normal text-ink-muted">working…</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div id="inspector-ai" role="tabpanel" hidden={tab !== 'ai'} className="min-h-0 px-3 py-3">
        {tab === 'ai' ? (
          briefing.available ? (
            <AiReportPanel controller={briefing} onOpenSource={onOpenSource} />
          ) : (
            <div className="text-[12px] text-ink-muted">
              {verdict ? <PlanStrip verdict={verdict} /> : null}
              <p className="mt-1">
                The AI report is optional and currently{' '}
                <strong className="font-semibold text-ink-soft">
                  {briefing.config?.enabled ? 'not configured' : 'disabled'}
                </strong>
                . Every deterministic check is unaffected.
              </p>
              <p className="mt-1">
                To enable it, set <span className="mono">OPSCHECK_AI_ENABLED</span> and{' '}
                <span className="mono">ANTHROPIC_API_KEY</span> in{' '}
                <span className="mono">web/.env.local</span>, then restart the server.
              </p>
            </div>
          )
        ) : null}
      </div>

      <div
        id="inspector-evidence"
        role="tabpanel"
        hidden={tab !== 'evidence'}
        className="min-h-0"
      >
        {tab === 'evidence' ? evidence : null}
      </div>
    </section>
  );
}

function Header() {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1.5">
      <div className="flex items-baseline gap-2.5">
        <h1 className="text-[18px] font-semibold tracking-tight text-ink">OpsCheck</h1>
        <p className="text-[13px] text-ink-soft">Check the plan. Trace the problem.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-warn/30 bg-warn-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-warn">
          <MissingGlyph className="h-3 w-3" />
          Synthetic data
        </span>
        <span className="mono text-[10.5px] uppercase tracking-wide text-ink-muted">
          Independent prototype - No live warehouse integration
        </span>
      </div>
    </header>
  );
}

function ControlBar({
  scenarioId,
  onSelectScenario,
  onRun,
  onReset,
  controller,
  briefing,
}: {
  scenarioId: string;
  onSelectScenario: (id: string) => void;
  onRun: () => void;
  onReset: () => void;
  controller: ReturnType<typeof useOpsCheck>;
  briefing: ReturnType<typeof useBriefing>;
}) {
  const meta = scenarioMeta(scenarioId);

  return (
    <section
      aria-label="Scenario and checks"
      className="rounded-lg border border-line bg-surface px-3.5 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex flex-wrap gap-1.5">
          {DEMO_SCENARIO_IDS.map((id) => {
            const item = scenarioMeta(id);
            const active = id === scenarioId;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => onSelectScenario(id)}
                className={
                  'flex items-baseline gap-1.5 rounded-md border px-3 py-1.5 text-[13px] font-semibold transition-colors ' +
                  (active
                    ? 'border-accent bg-accent-soft text-accent-strong'
                    : 'border-line-strong bg-surface text-ink-soft hover:border-accent hover:text-accent')
                }
              >
                {item.title}
                <span className="mono text-[10.5px] font-normal text-ink-muted">{id}</span>
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <AiSwitch briefing={briefing} />
          <button
            type="button"
            onClick={onReset}
            disabled={scenarioId === BASELINE_SCENARIO_ID}
            className="rounded-md border border-line-strong bg-surface px-3 py-1.5 text-[12.5px] font-medium text-ink-soft transition-colors hover:border-ink-muted hover:text-ink disabled:cursor-not-allowed disabled:border-line disabled:text-ink-muted/60"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onRun}
            className="rounded-md bg-accent px-4 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-accent-strong"
          >
            Run checks
          </button>
        </div>
      </div>

      <p className="mt-1.5 text-[11.5px] text-ink-muted">
        {SCENARIO_INPUT_SUMMARY[scenarioId] ?? meta.description}
      </p>

      {briefing.available && briefing.includeAi ? (
        <p className="mt-1 text-[11px] text-warn">
          With AI on, Run checks sends this synthetic scenario’s evidence to Anthropic and may
          incur API charges.
        </p>
      ) : null}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-2.5">
        <StatusSummary label="Data" {...dataStatusView(controller)} />
        <StatusSummary label="Plan" {...planStatusView(controller)} />
        <InputSummary controller={controller} />
      </div>
    </section>
  );
}

/** Compact, accessible switch. Disabled with a reason when unconfigured. */
function AiSwitch({ briefing }: { briefing: ReturnType<typeof useBriefing> }) {
  const disabled = !briefing.available;
  const on = briefing.includeAi && !disabled;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Include AI report"
      disabled={disabled}
      title={
        disabled
          ? 'Set OPSCHECK_AI_ENABLED and ANTHROPIC_API_KEY in web/.env.local, then restart.'
          : 'One Run checks click sends one request to Anthropic.'
      }
      onClick={() => briefing.setIncludeAi(!on)}
      className={
        'flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition-colors ' +
        (disabled
          ? 'cursor-not-allowed border-line bg-sunken text-ink-muted/70'
          : on
            ? 'border-accent bg-accent-soft text-accent-strong'
            : 'border-line-strong bg-surface text-ink-soft hover:border-accent hover:text-accent')
      }
    >
      <span
        aria-hidden="true"
        className={
          'relative h-3.5 w-6 rounded-full transition-colors ' +
          (on ? 'bg-accent' : 'bg-line-strong')
        }
      >
        <span
          className={
            'absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white transition-all ' +
            (on ? 'left-3' : 'left-0.5')
          }
        />
      </span>
      Include AI report
    </button>
  );
}

interface StatusView {
  tone: Tone;
  text: string;
  detail?: string;
}

function dataStatusView(c: ReturnType<typeof useOpsCheck>): StatusView {
  if (c.stale) return { tone: 'warn', text: 'Inputs changed. Run checks again.' };
  if (!c.hasRun || c.report === null) return { tone: 'idle', text: 'Ready to check' };

  const label: Record<DataStatus, StatusView> = {
    READY: { tone: 'ok', text: 'Inputs ready' },
    INCOMPLETE: { tone: 'warn', text: 'Missing required data' },
    INVALID: { tone: 'bad', text: 'Invalid input data' },
  };
  const view = label[c.report.dataStatus];
  const count = c.report.diagnostics.length;
  return count === 0
    ? view
    : { ...view, detail: count + (count === 1 ? ' problem' : ' problems') + ' reported' };
}

function planStatusView(c: ReturnType<typeof useOpsCheck>): StatusView {
  if (c.evaluationError !== null) {
    return { tone: 'bad', text: 'Evaluation could not complete' };
  }
  if (c.stale || !c.hasRun || c.report === null) {
    return { tone: 'idle', text: 'Plan not evaluated' };
  }
  const { report } = c;
  if (report.dataStatus !== 'READY') {
    return {
      tone: 'warn',
      text: 'Plan not evaluated',
      detail: 'resolve the input issues first',
    };
  }
  const counts = report.checkCounts;
  const detail =
    counts.passed + ' passed / ' + counts.failed + ' failed / ' + counts.blocked + ' blocked';

  if (report.planStatus === 'VIOLATIONS') {
    return { tone: 'bad', text: 'Submitted plan has modeled violations', detail };
  }
  if (report.planStatus === 'NOT_EVALUATED') {
    return { tone: 'warn', text: 'Plan not fully evaluated', detail };
  }
  return { tone: 'ok', text: 'Passed implemented checks', detail };
}

function StatusSummary({ label, tone, text, detail }: StatusView & { label: string }) {
  const glyph =
    tone === 'ok' ? (
      <CheckGlyph />
    ) : tone === 'bad' ? (
      <AlertGlyph />
    ) : tone === 'warn' ? (
      <MissingGlyph />
    ) : (
      <IdleGlyph />
    );

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </span>
      <Pill tone={tone} glyph={glyph}>
        {text}
      </Pill>
      {detail ? <span className="mono text-[11.5px] text-ink-muted">{detail}</span> : null}
    </div>
  );
}

function InputSummary({ controller }: { controller: ReturnType<typeof useOpsCheck> }) {
  const p = controller.preview;
  const parts = [
    p.orders.recordCount + ' orders',
    p.departures.recordCount + ' departures',
    p.workers.recordCount + ' workers',
    p.plan.recordCount + ' assignments',
  ];
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        Inputs
      </span>
      <span className="mono text-[11.5px] text-ink-soft">{parts.join(' / ')}</span>
    </div>
  );
}

/**
 * The raw tables stay collapsed to keep the workspace compact, but they are
 * always reachable, including while missing data blocks evaluation, and any
 * source link expands this section and targets the real cell.
 */
function SourceSection({ controller }: { controller: ReturnType<typeof useOpsCheck> }) {
  const { sourceExpanded, toggleSource } = controller;

  return (
    <section aria-label="Raw source" className="flex flex-col gap-2">
      <button
        type="button"
        onClick={toggleSource}
        aria-expanded={sourceExpanded}
        aria-controls="source-viewer"
        className="flex items-center gap-2 self-start rounded-md border border-line-strong bg-surface px-3 py-1.5 text-[12.5px] font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent"
      >
        <ChevronGlyph open={sourceExpanded} />
        {sourceExpanded ? 'Hide raw source records' : 'Show raw source records'}
        <span className="mono text-[11px] font-normal text-ink-muted">
          orders, departures, workers, plan
        </span>
      </button>

      {sourceExpanded ? (
        <SourceViewer
          preview={controller.preview}
          activeTable={controller.sourceTable}
          target={controller.sourceTarget}
          onSelectTable={controller.selectSourceTable}
        />
      ) : null}
    </section>
  );
}

function Assumptions() {
  return (
    <footer className="rounded-lg border border-line bg-sunken px-3.5 py-2.5 text-[11.5px] leading-relaxed text-ink-muted">
      <p>
        <span className="font-semibold text-ink-soft">Assumptions.</span> Time is an integer minute
        offset from a synthetic 08:00 on a single day; there are no dates, time zones, or overnight
        shifts. Worker intervals are half-open, so an assignment ending at the minute another
        begins does not overlap. Packing is modeled as a fixed delay starting the moment picking
        ends, with unlimited packing capacity: no queue, staging, loading, or transport is modeled.
      </p>
      <p className="mt-1.5">
        <span className="font-semibold text-ink-soft">Limits.</span> OpsCheck checks a plan that was
        submitted to it. It does not build, optimize, or repair a plan, and a passing report means
        only that the five implemented rules found no violation in this synthetic data. It does not
        establish optimality, real-world feasibility, safety, or that no better alternative exists.
        All inputs here are synthetic and this prototype has no connection to any live system.
      </p>
    </footer>
  );
}
