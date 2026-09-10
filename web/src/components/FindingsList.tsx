'use client';

import { RULE_LABEL } from '@/domain/constants';
import type { EvaluationReport } from '@/domain/types';
import type { Finding, FindingGroups } from '@/features/viewModel';
import {
  AlertGlyph,
  BlockGlyph,
  CheckGlyph,
  ChevronGlyph,
  IdleGlyph,
  MissingGlyph,
  Panel,
  Pill,
} from './ui';

/**
 * Input diagnostics first when data is not ready, then modeled violations,
 * then blocked checks, then a collapsible inventory of passed checks.
 */
export function FindingsList({
  report,
  groups,
  hasRun,
  stale,
  selectedId,
  showPassed,
  onSelect,
  onTogglePassed,
}: {
  report: EvaluationReport | null;
  groups: FindingGroups;
  hasRun: boolean;
  stale: boolean;
  selectedId: string | null;
  showPassed: boolean;
  onSelect: (id: string) => void;
  onTogglePassed: () => void;
}) {
  const subtitle = hasRun
    ? 'Data problems and modeled plan violations, most important first.'
    : 'Nothing has been evaluated yet.';

  return (
    <Panel title="Findings" subtitle={subtitle} className="min-h-0" bodyClassName="scroll-panel">
      {!hasRun ? (
        <EmptyState stale={stale} />
      ) : (
        <div className="divide-y divide-line">
          {groups.diagnostics.length > 0 ? (
            <Group
              title="Input data problems"
              hint="These block plan evaluation."
              findings={groups.diagnostics}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ) : null}

          {groups.failed.length > 0 ? (
            <Group
              title="Modeled plan violations"
              hint="The submitted plan breaks an implemented rule."
              findings={groups.failed}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ) : null}

          {groups.blocked.length > 0 ? (
            <Group
              title="Not evaluated"
              hint="A dependency stopped these checks from running."
              findings={groups.blocked}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ) : null}

          {report && report.dataStatus === 'READY' && groups.failed.length === 0 &&
          groups.blocked.length === 0 ? (
            <div className="flex items-start gap-2.5 px-3.5 py-3">
              <span className="mt-0.5 text-ok">
                <CheckGlyph className="h-4 w-4" />
              </span>
              <p className="text-[12.5px] text-ink-soft">
                No violations were found among the {report.checkCounts.passed} implemented checks.
                That means the implemented rules passed, not that the plan is optimal, feasible in
                the real warehouse, or the only workable schedule.
              </p>
            </div>
          ) : null}

          {groups.passed.length > 0 ? (
            <div>
              <button
                type="button"
                onClick={onTogglePassed}
                aria-expanded={showPassed}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[12px] font-semibold text-ink-soft transition-colors hover:bg-sunken"
              >
                <ChevronGlyph open={showPassed} />
                Passed checks
                <span className="mono font-normal text-ink-muted">({groups.passed.length})</span>
              </button>
              {showPassed ? (
                <ul className="border-t border-line">
                  {groups.passed.map((finding) => (
                    <FindingRow
                      key={finding.id}
                      finding={finding}
                      selected={finding.id === selectedId}
                      onSelect={onSelect}
                    />
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </Panel>
  );
}

function EmptyState({ stale }: { stale: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-5 py-8 text-center">
      <span className="text-ink-muted">
        <IdleGlyph className="h-5 w-5" />
      </span>
      <p className="max-w-[40ch] text-[12.5px] text-ink-muted">
        {stale
          ? 'Inputs changed, so the previous report no longer applies. Run checks again to produce findings for the current inputs.'
          : 'The inputs below are loaded and inspectable. Choose Run checks to evaluate the submitted plan against the five implemented rules.'}
      </p>
    </div>
  );
}

function Group({
  title,
  hint,
  findings,
  selectedId,
  onSelect,
}: {
  title: string;
  hint: string;
  findings: Finding[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 bg-sunken px-3.5 py-1.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
          {title}
        </h3>
        <span className="text-[11.5px] text-ink-muted">{hint}</span>
      </div>
      <ul>
        {findings.map((finding) => (
          <FindingRow
            key={finding.id}
            finding={finding}
            selected={finding.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </div>
  );
}

function FindingRow({
  finding,
  selected,
  onSelect,
}: {
  finding: Finding;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const meta = describe(finding);

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(finding.id)}
        aria-current={selected ? 'true' : undefined}
        className={
          'flex w-full items-start gap-2.5 border-l-[3px] px-3 py-2 text-left transition-colors ' +
          (selected
            ? 'border-l-accent bg-accent-soft/50'
            : 'border-l-transparent hover:bg-sunken')
        }
      >
        <span className={'mt-0.5 shrink-0 ' + meta.iconClass}>{meta.glyph}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] leading-snug text-ink">{meta.summary}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <code className="mono text-[11px] text-ink-muted">{meta.code}</code>
            {meta.subject ? (
              <span className="mono text-[11px] text-ink-muted">{meta.subject}</span>
            ) : null}
          </span>
        </span>
      </button>
    </li>
  );
}

function describe(finding: Finding): {
  summary: string;
  code: string;
  subject: string | null;
  glyph: React.ReactNode;
  iconClass: string;
} {
  if (finding.kind === 'diagnostic') {
    const d = finding.diagnostic;
    const invalid = d.kind === 'INVALID_DATA';
    return {
      summary: d.message,
      code: d.code,
      subject: d.source ? d.table + ' · record ' + d.source.recordNumber : d.table,
      glyph: invalid ? <AlertGlyph className="h-4 w-4" /> : <MissingGlyph className="h-4 w-4" />,
      iconClass: invalid ? 'text-bad' : 'text-warn',
    };
  }
  const c = finding.check;
  return {
    summary: c.summary,
    code: c.ruleId,
    subject: RULE_LABEL[c.ruleId] + ' · ' + c.subjectIds.join(', '),
    glyph:
      c.status === 'FAIL' ? (
        <AlertGlyph className="h-4 w-4" />
      ) : c.status === 'BLOCKED' ? (
        <BlockGlyph className="h-4 w-4" />
      ) : (
        <CheckGlyph className="h-4 w-4" />
      ),
    iconClass:
      c.status === 'FAIL' ? 'text-bad' : c.status === 'BLOCKED' ? 'text-warn' : 'text-ok',
  };
}

/** Small inline badge used by the headline card. */
export function RuleBadge({ label }: { label: string }) {
  return (
    <Pill tone="idle" glyph={<IdleGlyph />}>
      {label}
    </Pill>
  );
}
