'use client';

import { useCallback, useMemo, useReducer } from 'react';
import { evaluateBundle } from '@/domain/evaluateBundle';
import type { EvaluationReport, InputBundle, TableKind } from '@/domain/types';
import { BASELINE_SCENARIO_ID, loadScenario } from '@/fixtures/loadScenario';
import { buildInputPreview, type InputPreview } from './inputPreview';
import {
  buildPlanRows,
  buildTimeline,
  groupFindings,
  type SourceTarget,
} from './viewModel';

/**
 * All demo state lives here so components stay presentational.
 *
 * A report is "current" only while its revision still matches the input
 * revision. Every scenario change or reset replaces the whole bundle, bumps
 * the revision, clears the selected evidence, and drops the source highlight,
 * so a stale green badge from another scenario cannot survive on screen.
 */

interface State {
  scenarioId: string;
  bundle: InputBundle;
  inputRevision: number;
  lastReport: EvaluationReport | null;
  reportRevision: number;
  evaluationError: string | null;
  selectedFindingId: string | null;
  sourceTable: TableKind;
  sourceTarget: SourceTarget | null;
  showPassed: boolean;
  /** Increments on every completed run so dependents can drop stale results. */
  runSerial: number;
  /** The raw tables stay collapsed until a source link or the toggle opens them. */
  sourceExpanded: boolean;
  navigationNonce: number;
  announcement: string;
}

type Action =
  | { type: 'selectScenario'; scenarioId: string }
  | { type: 'run' }
  | { type: 'selectFinding'; findingId: string | null }
  | { type: 'openSource'; table: TableKind; recordNumber: number; column: string }
  | { type: 'selectSourceTable'; table: TableKind }
  | { type: 'toggleSource' }
  | { type: 'togglePassed' };

function freshState(scenarioId: string, inputRevision: number): State {
  return {
    scenarioId,
    bundle: loadScenario(scenarioId),
    inputRevision,
    lastReport: null,
    reportRevision: -1,
    evaluationError: null,
    selectedFindingId: null,
    sourceTable: 'orders',
    sourceTarget: null,
    showPassed: false,
    runSerial: 0,
    sourceExpanded: false,
    navigationNonce: 0,
    announcement: '',
  };
}

function initialState(): State {
  return freshState(BASELINE_SCENARIO_ID, 0);
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'selectScenario': {
      if (action.scenarioId === state.scenarioId) return state;
      const next = freshState(action.scenarioId, state.inputRevision + 1);
      return {
        ...next,
        showPassed: state.showPassed,
        // The superseded report is retained only so the UI can say that a
        // previous run has been invalidated. Because its revision no longer
        // matches the input revision, `report` stays null and none of its
        // numbers, badges, or findings can reach the screen.
        lastReport: state.lastReport,
        reportRevision: state.reportRevision,
        announcement: 'Inputs replaced. Run checks again.',
      };
    }

    case 'run': {
      try {
        // Evaluated against an immutable snapshot of the current bundle.
        const snapshot: InputBundle = {
          origin: state.bundle.origin,
          files: { ...state.bundle.files },
        };
        const report = evaluateBundle(snapshot);
        return {
          ...state,
          lastReport: report,
          reportRevision: state.inputRevision,
          runSerial: state.runSerial + 1,
          evaluationError: null,
          // Lead with the most important finding of THIS run, so the inspector
          // explains a real current result instead of sitting empty.
          selectedFindingId: groupFindings(report).headline?.id ?? null,
          sourceTarget: null,
          announcement: announcementFor(report),
        };
      } catch (error) {
        // A programming exception is never shown as a passed or skipped check.
        return {
          ...state,
          lastReport: null,
          reportRevision: -1,
          evaluationError:
            error instanceof Error ? error.message : 'An unexpected error occurred.',
          selectedFindingId: null,
          sourceTarget: null,
          announcement: 'Evaluation could not complete.',
        };
      }
    }

    case 'selectFinding':
      return { ...state, selectedFindingId: action.findingId };

    case 'openSource': {
      const nonce = state.navigationNonce + 1;
      return {
        ...state,
        sourceTable: action.table,
        sourceTarget: {
          table: action.table,
          recordNumber: action.recordNumber,
          column: action.column,
          nonce,
        },
        sourceExpanded: true,
        navigationNonce: nonce,
      };
    }

    case 'selectSourceTable':
      return { ...state, sourceTable: action.table, sourceExpanded: true };

    case 'toggleSource':
      return { ...state, sourceExpanded: !state.sourceExpanded };

    case 'togglePassed':
      return { ...state, showPassed: !state.showPassed };
  }
}

function announcementFor(report: EvaluationReport): string {
  if (report.dataStatus !== 'READY') {
    return 'Checks finished. Input data is not ready, so the plan was not evaluated.';
  }
  if (report.planStatus === 'VIOLATIONS') {
    return (
      'Checks finished. ' +
      report.checkCounts.failed +
      ' failed and ' +
      report.checkCounts.passed +
      ' passed.'
    );
  }
  if (report.planStatus === 'NOT_EVALUATED') {
    return 'Checks finished. Some checks were blocked, so the plan is not fully evaluated.';
  }
  return 'Checks finished. All ' + report.checkCounts.passed + ' implemented checks passed.';
}

export interface OpsCheckController {
  scenarioId: string;
  bundle: InputBundle;
  preview: InputPreview;
  /** The report only when it still matches the current inputs. */
  report: EvaluationReport | null;
  /** True when a report exists but the inputs have since been replaced. */
  stale: boolean;
  hasRun: boolean;
  evaluationError: string | null;
  findings: ReturnType<typeof groupFindings>;
  planRows: ReturnType<typeof buildPlanRows>;
  timeline: ReturnType<typeof buildTimeline>;
  selectedFindingId: string | null;
  sourceTable: TableKind;
  sourceTarget: SourceTarget | null;
  showPassed: boolean;
  runSerial: number;
  sourceExpanded: boolean;
  announcement: string;
  selectScenario: (scenarioId: string) => void;
  resetBaseline: () => void;
  run: () => void;
  selectFinding: (findingId: string | null) => void;
  openSource: (table: TableKind, recordNumber: number, column: string) => void;
  selectSourceTable: (table: TableKind) => void;
  toggleSource: () => void;
  togglePassed: () => void;
}

export function useOpsCheck(): OpsCheckController {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  const isCurrent = state.lastReport !== null && state.reportRevision === state.inputRevision;
  const report = isCurrent ? state.lastReport : null;

  const preview = useMemo(() => buildInputPreview(state.bundle), [state.bundle]);
  const findings = useMemo(() => groupFindings(report), [report]);
  const planRows = useMemo(() => buildPlanRows(preview, report), [preview, report]);
  const timeline = useMemo(() => buildTimeline(planRows, report), [planRows, report]);

  const selectScenario = useCallback(
    (scenarioId: string) => dispatch({ type: 'selectScenario', scenarioId }),
    [],
  );
  const resetBaseline = useCallback(
    () => dispatch({ type: 'selectScenario', scenarioId: BASELINE_SCENARIO_ID }),
    [],
  );
  const run = useCallback(() => dispatch({ type: 'run' }), []);
  const selectFinding = useCallback(
    (findingId: string | null) => dispatch({ type: 'selectFinding', findingId }),
    [],
  );
  const openSource = useCallback(
    (table: TableKind, recordNumber: number, column: string) =>
      dispatch({ type: 'openSource', table, recordNumber, column }),
    [],
  );
  const selectSourceTable = useCallback(
    (table: TableKind) => dispatch({ type: 'selectSourceTable', table }),
    [],
  );
  const toggleSource = useCallback(() => dispatch({ type: 'toggleSource' }), []);
  const togglePassed = useCallback(() => dispatch({ type: 'togglePassed' }), []);

  return {
    scenarioId: state.scenarioId,
    bundle: state.bundle,
    preview,
    report,
    stale: state.lastReport !== null && !isCurrent,
    hasRun: isCurrent,
    evaluationError: state.evaluationError,
    findings,
    planRows,
    timeline,
    selectedFindingId: state.selectedFindingId,
    sourceTable: state.sourceTable,
    sourceTarget: state.sourceTarget,
    showPassed: state.showPassed,
    runSerial: state.runSerial,
    sourceExpanded: state.sourceExpanded,
    announcement: state.announcement,
    selectScenario,
    resetBaseline,
    run,
    selectFinding,
    openSource,
    selectSourceTable,
    toggleSource,
    togglePassed,
  };
}
