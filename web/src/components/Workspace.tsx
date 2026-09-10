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
import { ChevronGlyph, MissingGlyph } from './ui';

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
    <div className="mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-col gap-8">
        <Header />

        <ControlBar
          scenarioId={c.scenarioId}
          onSelectScenario={c.selectScenario}
          onRun={runChecks}
          onReset={c.resetBaseline}
          briefing={briefing}
        />

        {c.evaluationError !== null ? (
          <p
            role="alert"
            className="ops-body rounded-xl border border-bad/30 bg-bad-soft px-6 py-4 text-bad"
          >
            <strong className="font-semibold">Evaluation could not complete.</strong>{' '}
            {c.evaluationError} No result is shown, and nothing is reported as passing.
          </p>
        ) : null}

        <ResultSummary controller={c} />

        {/*
          The schedule and the explanation are the workspace. Everything else is
          an inspection tool and sits below in its own disclosures.
        */}
        <div className="grid min-h-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(27rem,1fr)] xl:items-start">
          <OrderTimeline
            model={c.timeline}
            hasRun={c.hasRun}
            selectedId={c.selectedFindingId}
            onSelect={selectFinding}
          />

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

        <div className="flex flex-col gap-6">
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

          <Disclosure summary="Submitted plan" hint="Every assignment with the values the engine derived.">
            <PlanTable
              rows={c.planRows}
              hasRun={c.hasRun}
              selectedId={c.selectedFindingId}
              onSelect={selectFinding}
            />
          </Disclosure>

          <SourceSection controller={c} />

          <Assumptions />
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {c.announcement}
      </p>
    </div>
  );
}

/**
 * One reusable native disclosure for the secondary inspection tools.
 *
 * `<details>` gives correct keyboard and screen-reader behaviour without a
 * hand-rolled widget, and the summary row is a comfortable target.
 */
function Disclosure({
  summary,
  hint,
  children,
  open = false,
}: {
  summary: string;
  hint?: string;
  children: React.ReactNode;
  open?: boolean;
}) {
  return (
    <details open={open} className="ops-panel group">
      <summary className="flex min-h-[3.25rem] cursor-pointer list-none items-center gap-3 px-6 py-4">
        <span className="text-ink-muted transition-transform group-open:rotate-90">
          <ChevronGlyph open={false} className="h-4 w-4" />
        </span>
        <span className="ops-panel-title text-ink">{summary}</span>
        {hint ? <span className="ops-meta hidden text-ink-muted sm:inline">{hint}</span> : null}
      </summary>
      <div className="border-t border-line">{children}</div>
    </details>
  );
}

/**
 * The single current outcome, stated plainly.
 *
 * Every value here comes from the engine result: the wording is chosen from the
 * actual status, never from the scenario id, and the counts are the engine's.
 */
function ResultSummary({ controller }: { controller: ReturnType<typeof useOpsCheck> }) {
  const c = controller;
  const report = c.report;
  const headline = c.findings.headline;

  let outcome: string;
  let tone: 'ok' | 'warn' | 'bad' | 'idle' = 'idle';
  let supporting: string | null = null;

  if (c.stale) {
    outcome = 'Inputs changed. Run checks again.';
    tone = 'warn';
    supporting = 'The previous result no longer describes these inputs.';
  } else if (!c.hasRun || report === null) {
    outcome = 'Ready to check the submitted plan.';
    supporting = 'The schedule below shows the submitted picking times only.';
  } else if (report.dataStatus !== 'READY') {
    outcome = 'Cannot evaluate this plan.';
    tone = 'warn';
    supporting =
      headline !== null && headline.kind === 'diagnostic'
        ? headline.diagnostic.message
        : 'Required input data is missing or invalid.';
  } else if (report.planStatus === 'VIOLATIONS') {
    const n = report.checkCounts.failed;
    outcome = n + (n === 1 ? ' modeled violation' : ' modeled violations');
    tone = 'bad';
    supporting =
      headline !== null && headline.kind === 'check' ? headline.check.summary : null;
  } else if (report.planStatus === 'PASS') {
    outcome = 'Passed implemented checks.';
    tone = 'ok';
    supporting = 'No violation was found among the implemented rules on this synthetic data.';
  } else {
    outcome = 'Plan not fully evaluated.';
    tone = 'warn';
    supporting = 'Some checks were blocked, so the plan has no complete result.';
  }

  const accent =
    tone === 'bad'
      ? 'border-l-bad'
      : tone === 'ok'
        ? 'border-l-ok'
        : tone === 'warn'
          ? 'border-l-warn'
          : 'border-l-line-strong';

  return (
    <section
      aria-label="Current plan result"
      className={'ops-panel border-l-4 px-6 py-5 ' + accent}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <p className="ops-meta font-medium text-ink-muted">Current plan result</p>
          <h2 className="ops-outcome mt-1 text-ink">{outcome}</h2>
          {supporting ? (
            <p className="ops-body mt-2 max-w-[65ch] text-ink-soft">{supporting}</p>
          ) : null}
        </div>

        <dl className="flex flex-wrap items-start gap-x-8 gap-y-3">
          <Stat label="Input data" value={dataStatusText(c)} />
          <Stat
            label="Checks"
            value={
              report !== null && !c.stale && report.dataStatus === 'READY'
                ? report.checkCounts.passed +
                  ' passed / ' +
                  report.checkCounts.failed +
                  ' failed / ' +
                  report.checkCounts.blocked +
                  ' blocked'
                : 'Not evaluated'
            }
          />
          <Stat label="Inputs" value={inputSummaryText(c)} />
        </dl>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="ops-meta font-medium text-ink-muted">{label}</dt>
      <dd className="ops-body ops-numeric mt-1 font-medium text-ink">{value}</dd>
    </div>
  );
}

function dataStatusText(c: ReturnType<typeof useOpsCheck>): string {
  if (c.stale) return 'Changed since last run';
  if (!c.hasRun || c.report === null) return 'Not checked yet';
  const label: Record<DataStatus, string> = {
    READY: 'Ready',
    INCOMPLETE: 'Missing required data',
    INVALID: 'Invalid data',
  };
  const count = c.report.diagnostics.length;
  return label[c.report.dataStatus] + (count > 0 ? ' (' + count + ')' : '');
}

function inputSummaryText(c: ReturnType<typeof useOpsCheck>): string {
  const p = c.preview;
  return (
    p.orders.recordCount +
    ' orders / ' +
    p.departures.recordCount +
    ' departures / ' +
    p.workers.recordCount +
    ' workers / ' +
    p.plan.recordCount +
    ' assignments'
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
    <section aria-label="Inspector" className="ops-panel flex min-h-0 flex-col">
      <div role="tablist" aria-label="Inspector view" className="flex gap-2 border-b border-line px-4 pt-2">
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
                'min-h-[2.75rem] rounded-t-md px-4 ops-body font-semibold transition-colors ' +
                (selected
                  ? 'border-b-[3px] border-accent text-accent-strong'
                  : 'border-b-[3px] border-transparent text-ink-soft hover:text-ink')
              }
            >
              {id === 'ai' ? 'AI report' : 'Evidence'}
              {id === 'ai' && briefing.busy ? (
                <span className="ml-1.5 ops-meta font-normal text-ink-muted">working…</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div id="inspector-ai" role="tabpanel" hidden={tab !== 'ai'} className="min-h-0 px-6 py-6">
        {tab === 'ai' ? (
          briefing.available ? (
            <AiReportPanel controller={briefing} onOpenSource={onOpenSource} />
          ) : (
            <div className="ops-body text-ink-soft">
              {verdict ? <PlanStrip verdict={verdict} /> : null}
              <p className="mt-4 max-w-[65ch]">
                The AI report is optional and currently{' '}
                <strong className="font-semibold text-ink-soft">
                  {briefing.config?.enabled ? 'not configured' : 'disabled'}
                </strong>
                . Every deterministic check is unaffected.
              </p>
              <p className="mt-3 max-w-[65ch]">
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
    <header className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
      <div className="min-w-0">
        <h1 className="ops-title text-ink">OpsCheck</h1>
        <p className="ops-body mt-1 text-ink-soft">Check the plan. Trace the problem.</p>
      </div>
      {/*
        Synthetic data is a neutral provenance label, not a warning: an amber
        treatment here would read as an error state the app is not in.
      */}
      <div className="flex flex-col items-start gap-1 sm:items-end">
        <span className="ops-meta inline-flex items-center gap-2 rounded-full border border-line bg-sunken px-3 py-1 font-medium text-ink-soft">
          <MissingGlyph className="h-4 w-4" />
          Synthetic data
        </span>
        <span className="ops-meta text-ink-muted">
          Independent prototype · No live warehouse connection
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
  briefing,
}: {
  scenarioId: string;
  onSelectScenario: (id: string) => void;
  onRun: () => void;
  onReset: () => void;
  briefing: ReturnType<typeof useBriefing>;
}) {
  const meta = scenarioMeta(scenarioId);

  return (
    <section aria-label="Scenario and checks" className="ops-panel px-6 py-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <div
          role="group"
          aria-label="Scenario"
          className="flex flex-wrap gap-2"
        >
          {DEMO_SCENARIO_IDS.map((id) => {
            const item = scenarioMeta(id);
            const active = id === scenarioId;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => onSelectScenario(id)}
                className={'ops-control' + (active ? ' ops-control--selected' : '')}
              >
                {item.title}
                <span className="mono ops-meta font-normal text-ink-muted">{id}</span>
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-3">
          <AiSwitch briefing={briefing} />
          <button
            type="button"
            onClick={onReset}
            disabled={scenarioId === BASELINE_SCENARIO_ID}
            className="ops-control"
          >
            Reset
          </button>
          <button type="button" onClick={onRun} className="ops-control ops-control--primary">
            Run checks
          </button>
        </div>
      </div>

      <p className="ops-body mt-4 max-w-[65ch] text-ink-soft">
        {SCENARIO_INPUT_SUMMARY[scenarioId] ?? meta.description}
      </p>

      {briefing.available && briefing.includeAi ? (
        <p className="ops-meta mt-2 text-warn">
          With AI on, Run checks sends this synthetic scenario’s evidence to Anthropic and may
          incur API charges.
        </p>
      ) : null}
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
      className={'ops-control' + (on ? ' ops-control--selected' : '')}
    >
      <span
        aria-hidden="true"
        className={
          'relative h-5 w-9 shrink-0 rounded-full transition-colors ' +
          (on ? 'bg-accent' : 'bg-line-strong')
        }
      >
        <span
          className={
            'absolute top-1 h-3 w-3 rounded-full bg-white transition-all ' +
            (on ? 'left-5' : 'left-1')
          }
        />
      </span>
      Include AI report
    </button>
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
    <section aria-label="Raw source" className="ops-panel">
      <button
        type="button"
        onClick={toggleSource}
        aria-expanded={sourceExpanded}
        aria-controls="source-viewer"
        className="flex min-h-[3.25rem] w-full items-center gap-3 px-6 py-4 text-left"
      >
        <span className="text-ink-muted">
          <ChevronGlyph open={sourceExpanded} className="h-4 w-4" />
        </span>
        <span className="ops-panel-title text-ink">Raw source records</span>
        <span className="ops-meta hidden text-ink-muted sm:inline">
          orders, departures, workers, plan
        </span>
      </button>

      {sourceExpanded ? (
        <div className="border-t border-line">
          <SourceViewer
            preview={controller.preview}
            activeTable={controller.sourceTable}
            target={controller.sourceTarget}
            onSelectTable={controller.selectSourceTable}
          />
        </div>
      ) : null}
    </section>
  );
}

function Assumptions() {
  return (
    <Disclosure summary="Assumptions and modeling limits">
      <div className="ops-body space-y-4 px-6 py-5 text-ink-soft">
        <p className="max-w-[65ch]">
          Time is an integer minute offset from a synthetic 08:00 on a single day; there are no
          dates, time zones, or overnight shifts. Worker intervals are half-open, so an assignment
          ending at the minute another begins does not overlap.
        </p>
        <p className="max-w-[65ch]">
          Packing is modeled as a fixed delay starting the moment picking ends, with unlimited
          packing capacity: no queue, staging, loading, or transport is modeled.
        </p>
        <p className="max-w-[65ch]">
          OpsCheck checks a plan that was submitted to it. It does not build, optimize, or repair a
          plan, and a passing report means only that the five implemented rules found no violation
          in this synthetic data. It does not establish optimality, real-world feasibility, safety,
          or that no better alternative exists. All inputs here are synthetic and this prototype has
          no connection to any live system.
        </p>
      </div>
    </Disclosure>
  );
}
