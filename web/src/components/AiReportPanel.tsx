'use client';

import { useState } from 'react';
import {
  GATE_LABEL,
  NARRATIVE_CHECK_LABEL,
  type GateResult,
  type NarrativeCheckResult,
  type RenderedBriefing,
  type RenderedNarrative,
  type RenderedStatement,
} from '@/briefing/contracts';
import { ratioText } from '@/briefing/render';
import type { SourceRef } from '@/domain/types';
import { ACTIVITY_STAGES, type BriefingController } from '@/features/useBriefing';
import {
  AlertGlyph,
  CheckGlyph,
  ChevronGlyph,
  IdleGlyph,
  SourceGlyph,
} from './ui';

/**
 * The AI report tab.
 *
 * Two scopes are kept visually and textually distinct:
 *
 *  - The engine-evidence manifest is application-owned, rendered from templates,
 *    and carries the mechanical "Evidence checks passed" label.
 *  - The narrative is the provider's actual words. Its structure and references
 *    are checked; its meaning is not. It always carries the review disclosure.
 *
 * All prose renders as plain React text, so it is escaped by construction. No
 * model-supplied markup or link is ever injected.
 */

const REVIEW_DISCLOSURE =
  'AI-written explanation. Evidence references checked; wording requires review.';

export function AiReportPanel({
  controller,
  onOpenSource,
}: {
  controller: BriefingController;
  onOpenSource: (source: SourceRef) => void;
}) {
  const { state, response, message, busy } = controller;
  const briefing = response?.briefing ?? null;
  const narrative = response?.narrative ?? null;
  const showNarrative = state === 'verified' && narrative !== null && narrative.overview.text !== '';

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <Header controller={controller} />

      {busy ? <Activity state={state} scenarioId={controller.scenarioId} /> : null}

      {message !== null && !showNarrative ? (
        <p
          role="status"
          className={
            'rounded-md border px-3 py-2 text-[12px] ' +
            (state === 'withheld'
              ? 'border-warn/30 bg-warn-soft text-warn'
              : 'border-line bg-sunken text-ink-soft')
          }
        >
          {message}
        </p>
      ) : null}

      {state === 'unavailable' ? (
        <button
          type="button"
          onClick={controller.retry}
          className="self-start rounded-md border border-line-strong bg-surface px-3 py-1.5 text-[12px] font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent"
        >
          Retry AI report
          <span className="ml-1.5 text-[11px] font-normal text-ink-muted">
            starts one new request
          </span>
        </button>
      ) : null}

      {showNarrative ? (
        <Assistant narrative={narrative} briefing={briefing} onOpenSource={onOpenSource} />
      ) : null}

      {briefing ? (
        <EvidenceTray
          briefing={briefing}
          narrative={narrative}
          gates={response!.gates}
          provider={response!.provider}
        />
      ) : null}
    </div>
  );
}

function Header({ controller }: { controller: BriefingController }) {
  const { response, config } = controller;
  const verdict = response?.briefing?.verdict ?? null;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-[14px] font-semibold text-ink">OpsCheck AI report</h3>
        {response?.provider ? (
          <span className="mono text-[10.5px] text-ink-muted">
            {response.provider.model ?? config?.model ?? 'model'} ·{' '}
            {response.provider.stopReason ?? 'unknown'}
            {response.provider.elapsedMs !== null
              ? ' · ' + (response.provider.elapsedMs / 1000).toFixed(1) + 's'
              : ''}
            {response.provider.usage
              ? ' · ' +
                response.provider.usage.inputTokens +
                ' in / ' +
                response.provider.usage.outputTokens +
                ' out'
              : ''}
          </span>
        ) : null}
      </div>
      {verdict ? <PlanStrip verdict={verdict} /> : null}
    </div>
  );
}

/** The engine verdict, repeated in both tabs and never softened by the model. */
export function PlanStrip({
  verdict,
}: {
  verdict: RenderedBriefing['verdict'];
}) {
  const failed = verdict.planStatus === 'VIOLATIONS';
  const blocked = verdict.dataStatus !== 'READY';
  const tone = failed
    ? 'border-bad/30 bg-bad-soft text-bad'
    : blocked
      ? 'border-warn/30 bg-warn-soft text-warn'
      : 'border-ok/30 bg-ok-soft text-ok';

  return (
    <p className={'mt-1.5 rounded-md border px-3 py-1.5 text-[12px] font-medium ' + tone}>
      {verdict.headline}
    </p>
  );
}

/** Real stages only: each one corresponds to an operation that happened. */
function Activity({ state, scenarioId }: { state: string; scenarioId: string | null }) {
  const activeIndex = ACTIVITY_STAGES.findIndex((s) => s.state === state);

  return (
    <div className="rounded-md border border-line bg-sunken px-3 py-2">
      <p className="text-[11px] text-ink-muted">
        Run event · scenario <span className="mono">{scenarioId ?? '—'}</span> · checks complete,
        generating report
      </p>
      <ol className="mt-1.5 space-y-0.5">
        {ACTIVITY_STAGES.map((stage, index) => {
          const done = activeIndex > index;
          const active = activeIndex === index;
          return (
            <li
              key={stage.state}
              className={
                'flex items-center gap-1.5 text-[11.5px] ' +
                (active ? 'text-ink' : done ? 'text-ink-muted' : 'text-ink-muted/60')
              }
            >
              <span className={done ? 'text-ok' : active ? 'text-accent' : 'text-ink-muted/60'}>
                {done ? <CheckGlyph className="h-3 w-3" /> : <IdleGlyph className="h-3 w-3" />}
              </span>
              {stage.label}
              {active ? <span className="text-ink-muted">…</span> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Assistant({
  narrative,
  briefing,
  onOpenSource,
}: {
  narrative: RenderedNarrative;
  briefing: RenderedBriefing | null;
  onOpenSource: (source: SourceRef) => void;
}) {
  const statementById = new Map(
    briefing ? [briefing.lead, ...briefing.findings, ...briefing.context].map((s) => [s.factId, s]) : [],
  );

  return (
    <section aria-label="AI explanation" className="rounded-lg border border-accent/25 bg-accent-soft/25">
      <div className="flex items-center gap-2 border-b border-accent/20 px-3 py-1.5">
        <span
          aria-hidden="true"
          className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white"
        >
          C
        </span>
        <span className="text-[11.5px] font-semibold text-accent-strong">Claude</span>
        <span className="ml-auto rounded-full border border-warn/30 bg-warn-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warn">
          Review required
        </span>
      </div>

      <div className="space-y-3 px-3 py-2.5">
        {/* The provider's own words, escaped by rendering as React text. */}
        <p className="text-[12.5px] leading-relaxed text-ink">{narrative.overview.text}</p>
        {narrative.overview.citations.length > 0 ? (
          <Citations
            citations={narrative.overview.citations}
            statementById={statementById}
            onOpenSource={onOpenSource}
          />
        ) : null}

        {narrative.findings.map((finding) => {
          const canonical = statementById.get(finding.factId);
          return (
            <div key={finding.factId} className="space-y-1.5">
              <p className="text-[12.5px] leading-relaxed text-ink">{finding.explanation}</p>
              {canonical ? (
                <CanonicalCard statement={canonical} onOpenSource={onOpenSource} />
              ) : null}
            </div>
          );
        })}

        {narrative.reviewNotes.length > 0 ? (
          <div>
            <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              Suggested review
            </h4>
            <ul className="space-y-1.5">
              {narrative.reviewNotes.map((note) => (
                <li key={note.reviewStepId} className="text-[12.5px] text-ink">
                  {note.explanation}
                  <span className="mt-0.5 block text-[11px] text-ink-muted">{note.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="border-t border-accent/20 pt-2 text-[11px] font-medium text-warn">
          {REVIEW_DISCLOSURE}
        </p>
      </div>
    </section>
  );
}

/**
 * The engine's own statement, shown beside the paraphrase.
 *
 * This is a separate source of truth so the real finding stays visible even if
 * the paraphrase is poor. Showing it is not an endorsement of the paraphrase.
 */
function CanonicalCard({
  statement,
  onOpenSource,
}: {
  statement: RenderedStatement;
  onOpenSource: (source: SourceRef) => void;
}) {
  return (
    <div className="rounded-md border border-line bg-surface px-2.5 py-2">
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-muted">
        OpsCheck finding
      </p>
      <p className="mt-0.5 text-[12px] text-ink">{statement.text}</p>
      {statement.sources.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {statement.sources.map((entry, index) => (
            <SourceChip key={index} source={entry.source} onOpenSource={onOpenSource} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Citations({
  citations,
  statementById,
  onOpenSource,
}: {
  citations: RenderedNarrative['overview']['citations'];
  statementById: Map<string, RenderedStatement>;
  onOpenSource: (source: SourceRef) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {citations.map((citation) => {
        const statement = statementById.get(citation.factId);
        const source = statement?.sources[0]?.source;
        if (!source) {
          return (
            <span
              key={citation.factId}
              className="mono rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] text-ink-muted"
            >
              {citation.factId}
            </span>
          );
        }
        return <SourceChip key={citation.factId} source={source} onOpenSource={onOpenSource} />;
      })}
    </div>
  );
}

function SourceChip({
  source,
  onOpenSource,
}: {
  source: SourceRef;
  onOpenSource: (source: SourceRef) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpenSource(source)}
      aria-label={
        'Open ' +
        source.fileName +
        ' record ' +
        source.recordNumber +
        ', column ' +
        source.column
      }
      className="mono inline-flex items-center gap-1 rounded border border-line-strong bg-surface px-1.5 py-0.5 text-[10px] text-accent transition-colors hover:border-accent hover:bg-accent-soft"
    >
      <SourceGlyph className="h-2.5 w-2.5" />
      {source.fileName} rec {source.recordNumber}
    </button>
  );
}

/** Scoped metrics. Engine evidence and narrative references are never merged. */
function EvidenceTray({
  briefing,
  narrative,
  gates,
  provider,
}: {
  briefing: RenderedBriefing;
  narrative: RenderedNarrative | null;
  gates: GateResult[];
  provider: NonNullable<BriefingController['response']>['provider'];
}) {
  const [open, setOpen] = useState(false);
  const { traceability, requiredFindings } = briefing.metrics;
  const applicable = gates.filter((g) => g.status !== 'NOT_APPLICABLE');
  const passed = applicable.filter((g) => g.status === 'PASSED').length;

  return (
    <section aria-label="Evidence and validation" className="rounded-md border border-line bg-sunken px-3 py-2.5">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        Evidence &amp; validation
      </h4>

      <dl className="mt-1.5 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
        <Metric
          label="Engine-fact traceability"
          value={ratioText(traceability.verified, traceability.total)}
        />
        <Metric
          label="Required findings displayed"
          value={
            requiredFindings.total === 0
              ? 'N/A — none required'
              : ratioText(requiredFindings.included, requiredFindings.total)
          }
        />
        <Metric
          label="Evidence checks passed"
          value={passed + '/' + applicable.length}
        />
        <Metric
          label="Explanation references"
          value={
            narrative === null || narrative.references.referenced === 0
              ? 'N/A'
              : narrative.references.resolved + '/' + narrative.references.referenced + ' resolve'
          }
        />
        <Metric label="Narrative factual confidence" value="Not calibrated" muted />
      </dl>

      <p className="mt-2 border-t border-line pt-2 text-[11px] text-ink-muted">
        The first three measure the deterministic evidence manifest. Explanation references confirm
        that cited ids resolve — <strong className="font-semibold text-ink-soft">not</strong> that the
        wording is entailed by them. There is no probability of real-world correctness here.
      </p>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="mt-2 flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-soft transition-colors hover:text-accent"
      >
        <ChevronGlyph open={open} />
        Check details
      </button>

      {open ? (
        <div className="mt-1.5 space-y-2">
          <CheckList title="Evidence publication gates" items={gates.map(toRow)} />
          {narrative ? (
            <CheckList
              title="Narrative structure and references"
              items={narrative.checks.map(toNarrativeRow)}
            />
          ) : null}
          {provider?.requestId ? (
            <p className="mono text-[10.5px] text-ink-muted">request {provider.requestId}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

interface CheckRow {
  key: string;
  label: string;
  status: string;
  detail: string;
  codes: string[];
}

function toRow(gate: GateResult): CheckRow {
  return {
    key: gate.id,
    label: GATE_LABEL[gate.id],
    status: gate.status,
    detail: gate.detail,
    codes: gate.codes,
  };
}

function toNarrativeRow(check: NarrativeCheckResult): CheckRow {
  return {
    key: check.id,
    label: NARRATIVE_CHECK_LABEL[check.id],
    status: check.status,
    detail: check.detail,
    codes: check.codes,
  };
}

function CheckList({ title, items }: { title: string; items: CheckRow[] }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-muted">{title}</p>
      <ul className="mt-1 space-y-1">
        {items.map((item) => (
          <li key={item.key} className="flex items-start gap-2 text-[11.5px]">
            <span
              className={
                'mt-0.5 shrink-0 ' +
                (item.status === 'PASSED'
                  ? 'text-ok'
                  : item.status === 'FAILED'
                    ? 'text-bad'
                    : 'text-ink-muted')
              }
            >
              {item.status === 'PASSED' ? (
                <CheckGlyph className="h-3 w-3" />
              ) : item.status === 'FAILED' ? (
                <AlertGlyph className="h-3 w-3" />
              ) : (
                <IdleGlyph className="h-3 w-3" />
              )}
            </span>
            <span className="min-w-0">
              <span className="font-medium text-ink">{item.label}</span>{' '}
              <span className="text-ink-muted">
                {item.status === 'NOT_APPLICABLE' ? 'not run' : item.status.toLowerCase()}
              </span>
              <span className="block text-ink-muted">{item.detail}</span>
              {item.codes.length > 0 ? (
                <span className="mono block text-[10.5px] text-bad">{item.codes.join(', ')}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Metric({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10.5px] uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd
        className={
          'mono text-[12.5px] font-semibold ' + (muted ? 'text-ink-muted' : 'text-ink')
        }
      >
        {value}
      </dd>
    </div>
  );
}
