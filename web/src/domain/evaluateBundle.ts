import { RULE_ORDER } from './constants';
import { evaluatePlan } from './evaluatePlan';
import { validateData } from './validateData';
import type { EvaluationReport, InputBundle, RuleCoverage } from './types';

/**
 * The one shared, pure entry point. The UI, the unit tests, and any regression
 * runner all call this function.
 *
 * It never inspects a scenario id or title, imports expected results, calls a
 * model, touches the network or filesystem, mutates its input, or reads the
 * clock.
 */
export function evaluateBundle(input: InputBundle): EvaluationReport {
  const data = validateData(input);

  if (data.status !== 'READY' || data.dataset === null) {
    // The global data gate: five BLOCKED rule families with zero instances.
    // This is not "0 failed, all clear".
    const ruleCoverage: RuleCoverage[] = RULE_ORDER.map((ruleId) => ({
      ruleId,
      passed: 0,
      failed: 0,
      blocked: 0,
      status: 'BLOCKED',
    }));
    return {
      schemaVersion: '1.0',
      origin: input.origin,
      dataStatus: data.status,
      planStatus: 'NOT_EVALUATED',
      diagnostics: data.diagnostics,
      checks: [],
      checkCounts: { passed: 0, failed: 0, blocked: 0 },
      ruleCoverage,
      blockedRuleIds: RULE_ORDER.slice(),
      rawTables: data.rawTables,
      dataset: null,
    };
  }

  const plan = evaluatePlan(data.dataset);

  return {
    schemaVersion: '1.0',
    origin: input.origin,
    dataStatus: data.status,
    planStatus: plan.planStatus,
    diagnostics: data.diagnostics,
    checks: plan.checks,
    checkCounts: plan.checkCounts,
    ruleCoverage: plan.ruleCoverage,
    blockedRuleIds: [],
    rawTables: data.rawTables,
    dataset: data.dataset,
  };
}
