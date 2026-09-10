import type { EvaluationReport } from '@/domain/types';
import type {
  BriefingCatalog,
  BriefingMetrics,
  BriefingSelection,
  GateResult,
  RenderedBriefing,
  RenderedStatement,
} from './contracts';
import {
  ASSUMPTIONS,
  LIMITATIONS,
  factSources,
  renderFact,
  reviewStepText,
  verdictHeadline,
} from './templates';
import { uniqueFactualIds } from './validate';

/**
 * Builds the final render manifest from a selection that has already passed
 * every gate.
 *
 * The verdict, assumptions and limitations are renderer-owned and always
 * present, regardless of what the model selected. Nothing is appended after
 * validation: what is measured here is exactly what is displayed.
 */
export function renderBriefing(
  selection: BriefingSelection,
  catalog: BriefingCatalog,
  report: EvaluationReport,
  gates: GateResult[],
): RenderedBriefing | null {
  const byId = new Map(catalog.facts.map((f) => [f.id, f]));

  const statementFor = (id: string): RenderedStatement | null => {
    const fact = byId.get(id);
    if (!fact) return null;
    const rendered = renderFact(fact, report, selection.detailLevel);
    if (rendered === null) return null;
    return {
      factId: fact.id,
      kind: fact.kind,
      text: rendered.text,
      detail: rendered.detail,
      isAssumption: rendered.isAssumption,
      sources: factSources(fact, report),
    };
  };

  const lead = statementFor(selection.leadFactId);
  if (lead === null) return null;

  const findings: RenderedStatement[] = [];
  for (const id of selection.orderedFindingFactIds) {
    const statement = statementFor(id);
    if (statement === null) return null;
    findings.push(statement);
  }

  const context: RenderedStatement[] = [];
  for (const id of selection.contextFactIds) {
    const statement = statementFor(id);
    if (statement === null) return null;
    context.push(statement);
  }

  const reviewSteps: string[] = [];
  for (const id of selection.reviewStepIds) {
    const text = reviewStepText(id);
    if (text === null) return null;
    reviewSteps.push(text);
  }

  return {
    catalogVersion: catalog.catalogVersion,
    inputFingerprint: catalog.inputFingerprint,
    detailLevel: selection.detailLevel,
    verdict: {
      dataStatus: report.dataStatus,
      planStatus: report.planStatus,
      headline: verdictHeadline(report),
      checkCounts: { ...report.checkCounts },
    },
    lead,
    findings,
    context,
    assumptions: [...ASSUMPTIONS],
    limitations: [...LIMITATIONS],
    reviewSteps,
    metrics: computeMetrics(selection, catalog, report, gates),
  };
}

/**
 * Measured quantities, never a confidence probability.
 *
 * Traceability counts the complete rendered fact manifest, not just the
 * optional items the model chose. Fixed scope disclosures are renderer-owned
 * and are not counted as empirical facts.
 */
export function computeMetrics(
  selection: BriefingSelection,
  catalog: BriefingCatalog,
  report: EvaluationReport,
  gates: GateResult[],
): BriefingMetrics {
  const byId = new Map(catalog.facts.map((f) => [f.id, f]));
  const displayed = uniqueFactualIds(selection);

  let verified = 0;
  for (const id of displayed) {
    const fact = byId.get(id);
    if (!fact) continue;
    if (renderFact(fact, report, selection.detailLevel) !== null) verified += 1;
  }

  const requiredTotal = catalog.requiredFindingIds.length;
  const includedRequired = catalog.requiredFindingIds.filter((id) =>
    selection.orderedFindingFactIds.includes(id),
  ).length;

  const applicable = gates.filter((g) => g.status !== 'NOT_APPLICABLE');

  return {
    traceability: { verified, total: displayed.length },
    requiredFindings: { included: includedRequired, total: requiredTotal },
    gates: {
      passed: applicable.filter((g) => g.status === 'PASSED').length,
      applicable: applicable.length,
      results: gates,
    },
  };
}

/**
 * Publication requires full traceability, complete required-finding coverage,
 * and every applicable gate passing. These are not averaged: a missing critical
 * finding cannot be offset by other successes, and empty factual content cannot
 * earn a percentage.
 */
export function isPublishable(metrics: BriefingMetrics): boolean {
  const { traceability, requiredFindings, gates } = metrics;
  if (traceability.total === 0) return false;
  if (traceability.verified !== traceability.total) return false;
  if (requiredFindings.included !== requiredFindings.total) return false;
  if (gates.applicable === 0) return false;
  return gates.passed === gates.applicable;
}

/** n/N plus a percentage, or null when a percentage would be meaningless. */
export function ratioText(n: number, total: number): string {
  if (total === 0) return 'n/a';
  return n + '/' + total + ' (' + Math.round((n / total) * 100) + '%)';
}
