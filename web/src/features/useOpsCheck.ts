'use client';

import { useCallback, useMemo, useReducer, useRef } from 'react';
import { TABLE_ORDER } from '@/domain/constants';
import { evaluateBundle } from '@/domain/evaluateBundle';
import type { EvaluationReport, InputBundle, ProfileId, TableKind } from '@/domain/types';
import { BASELINE_SCENARIO_ID, loadScenario } from '@/fixtures/loadScenario';
import { checkCsvLimits, checkFileSize, readFileText } from './importFile';
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

type PerTable<T> = Record<TableKind, T>;

interface State {
  /** The bundled case the current inputs started from. */
  scenarioId: string;
  bundle: InputBundle;
  /**
   * The profile chosen for each slot, including a slot with no file yet:
   * choosing the mapping before importing is valid, and a profile is never
   * inferred from a filename.
   */
  profiles: PerTable<ProfileId>;
  /** True once the user replaced, removed, or remapped any file in this bundle. */
  customized: boolean;
  /** A file read is in flight for this slot; no result can be current meanwhile. */
  reading: PerTable<boolean>;
  /** The last import failure per slot. An import error publishes no report. */
  fileErrors: PerTable<string | null>;
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
  | { type: 'beginFileRead'; table: TableKind }
  | {
      type: 'loadFile';
      table: TableKind;
      fileName: string;
      csvText: string;
      profile: ProfileId;
    }
  | { type: 'clearFile'; table: TableKind }
  | { type: 'setProfile'; table: TableKind; profile: ProfileId }
  | { type: 'fileReadError'; table: TableKind; error: string }
  | { type: 'run' }
  | { type: 'selectFinding'; findingId: string | null }
  | { type: 'openSource'; table: TableKind; recordNumber: number; column: string }
  | { type: 'selectSourceTable'; table: TableKind }
  | { type: 'toggleSource' }
  | { type: 'togglePassed' };

function perTable<T>(value: T): PerTable<T> {
  return { orders: value, departures: value, workers: value, plan: value };
}

/** The slot profiles a bundle actually uses; standard for an empty slot. */
function profilesOf(bundle: InputBundle): PerTable<ProfileId> {
  const out = perTable<ProfileId>('standard');
  for (const table of TABLE_ORDER) {
    const file = bundle.files[table];
    if (file !== null) out[table] = file.profile;
  }
  return out;
}

function freshState(scenarioId: string, inputRevision: number): State {
  const bundle = loadScenario(scenarioId);
  return {
    scenarioId,
    bundle,
    profiles: profilesOf(bundle),
    customized: false,
    reading: perTable(false),
    fileErrors: perTable<string | null>(null),
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

/**
 * What every input change has in common: a new input revision, no carried-over
 * evidence selection, no source highlight, and no stale error.
 *
 * `lastReport` and `reportRevision` are kept only so the interface can say that
 * a previous run was invalidated. Because the revisions no longer match, none
 * of that report's numbers, badges, or findings can reach the screen.
 */
function afterInputChange(state: State, announcement: string): State {
  return {
    ...state,
    inputRevision: state.inputRevision + 1,
    selectedFindingId: null,
    sourceTarget: null,
    evaluationError: null,
    announcement,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'selectScenario': {
      // Re-selecting the same case is a real reload once the user has edited
      // the slots: it is how the untouched fixture comes back.
      if (action.scenarioId === state.scenarioId && !state.customized) return state;
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

    case 'beginFileRead':
      return {
        ...state,
        reading: { ...state.reading, [action.table]: true },
        fileErrors: { ...state.fileErrors, [action.table]: null },
      };

    case 'loadFile': {
      const file = {
        fileName: action.fileName,
        profile: action.profile,
        csvText: action.csvText,
      };
      return {
        ...afterInputChange(state, 'File imported. Run checks again.'),
        // A replaced file marks the whole bundle unverified even when its name
        // matches a supplied example. Only reloading a bundled case restores
        // SYNTHETIC.
        bundle: {
          origin: 'USER_SUPPLIED_UNVERIFIED',
          files: { ...state.bundle.files, [action.table]: file },
        },
        profiles: { ...state.profiles, [action.table]: action.profile },
        customized: true,
        reading: { ...state.reading, [action.table]: false },
        fileErrors: { ...state.fileErrors, [action.table]: null },
      };
    }

    case 'clearFile': {
      if (state.bundle.files[action.table] === null) return state;
      return {
        ...afterInputChange(state, 'File removed. Run checks again.'),
        bundle: {
          origin: 'USER_SUPPLIED_UNVERIFIED',
          files: { ...state.bundle.files, [action.table]: null },
        },
        customized: true,
        reading: { ...state.reading, [action.table]: false },
        fileErrors: { ...state.fileErrors, [action.table]: null },
      };
    }

    case 'setProfile': {
      if (state.profiles[action.table] === action.profile) return state;
      const file = state.bundle.files[action.table];
      return {
        ...afterInputChange(state, 'Mapping profile changed. Run checks again.'),
        // Remapping does not change where the data came from, so the origin is
        // left alone; it does change how every column is read, so the previous
        // result no longer describes these inputs.
        bundle:
          file === null
            ? state.bundle
            : {
                ...state.bundle,
                files: {
                  ...state.bundle.files,
                  [action.table]: { ...file, profile: action.profile },
                },
              },
        profiles: { ...state.profiles, [action.table]: action.profile },
        customized: true,
        reading: { ...state.reading, [action.table]: false },
      };
    }

    case 'fileReadError':
      // The attempted replacement is abandoned: the bundle, the input revision,
      // and any existing result are left exactly as they were.
      return {
        ...state,
        reading: { ...state.reading, [action.table]: false },
        fileErrors: { ...state.fileErrors, [action.table]: action.error },
        announcement: 'The file was not imported. ' + action.error,
      };

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
  /** The mapping profile chosen per slot, with or without a file loaded. */
  profiles: PerTable<ProfileId>;
  /** True once the user replaced, removed, or remapped any file. */
  customized: boolean;
  /** True while any slot is reading a file; no result is current meanwhile. */
  readingFile: boolean;
  reading: PerTable<boolean>;
  fileErrors: PerTable<string | null>;
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
  loadFile: (table: TableKind, file: File) => void;
  clearFile: (table: TableKind) => void;
  setProfile: (table: TableKind, profile: ProfileId) => void;
  run: () => void;
  selectFinding: (findingId: string | null) => void;
  openSource: (table: TableKind, recordNumber: number, column: string) => void;
  selectSourceTable: (table: TableKind) => void;
  toggleSource: () => void;
  togglePassed: () => void;
}

export function useOpsCheck(): OpsCheckController {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  /**
   * One request token per slot. Reading a file is asynchronous, so a finishing
   * read is only allowed to land while its token is still the slot's current
   * one. Every later selection, removal, remapping, or reset bumps the token,
   * which is what stops a slow read from overwriting a newer choice.
   */
  const readTokens = useRef<PerTable<number>>(perTable(0));

  const readingFile = TABLE_ORDER.some((table) => state.reading[table]);
  const isCurrent =
    state.lastReport !== null && state.reportRevision === state.inputRevision && !readingFile;
  const report = isCurrent ? state.lastReport : null;

  const preview = useMemo(() => buildInputPreview(state.bundle), [state.bundle]);
  const findings = useMemo(() => groupFindings(report), [report]);
  const planRows = useMemo(() => buildPlanRows(preview, report), [preview, report]);
  const timeline = useMemo(() => buildTimeline(planRows, report), [planRows, report]);

  /** Abandons any read in flight for these slots. */
  const supersedeReads = useCallback((tables: readonly TableKind[]) => {
    for (const table of tables) readTokens.current[table] += 1;
  }, []);

  const selectScenario = useCallback(
    (scenarioId: string) => {
      supersedeReads(TABLE_ORDER);
      dispatch({ type: 'selectScenario', scenarioId });
    },
    [supersedeReads],
  );
  const resetBaseline = useCallback(() => {
    supersedeReads(TABLE_ORDER);
    dispatch({ type: 'selectScenario', scenarioId: BASELINE_SCENARIO_ID });
  }, [supersedeReads]);

  const profiles = state.profiles;

  /**
   * Import one picked file into one slot.
   *
   * The File is read here, in the interface layer, and only its text ever
   * reaches the engine. Over-limit input is refused before the engine sees it,
   * and a failed read leaves the bundle and any existing result untouched.
   */
  const loadFile = useCallback(
    (table: TableKind, file: File) => {
      readTokens.current[table] += 1;
      const token = readTokens.current[table];
      const current = () => readTokens.current[table] === token;
      const profile = profiles[table];

      dispatch({ type: 'beginFileRead', table });

      const sizeError = checkFileSize(file.size);
      if (sizeError !== null) {
        dispatch({ type: 'fileReadError', table, error: sizeError });
        return;
      }

      void readFileText(file)
        .then((csvText) => {
          if (!current()) return; // superseded by a newer choice or a reset
          const limitError = checkCsvLimits(csvText);
          if (limitError !== null) {
            dispatch({ type: 'fileReadError', table, error: limitError });
            return;
          }
          dispatch({ type: 'loadFile', table, fileName: file.name, csvText, profile });
        })
        .catch((error: unknown) => {
          if (!current()) return;
          dispatch({
            type: 'fileReadError',
            table,
            error:
              error instanceof Error ? error.message : 'The file could not be read.',
          });
        });
    },
    [profiles],
  );

  const clearFile = useCallback(
    (table: TableKind) => {
      supersedeReads([table]);
      dispatch({ type: 'clearFile', table });
    },
    [supersedeReads],
  );

  const setProfile = useCallback(
    (table: TableKind, profile: ProfileId) => {
      supersedeReads([table]);
      dispatch({ type: 'setProfile', table, profile });
    },
    [supersedeReads],
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
    profiles,
    customized: state.customized,
    readingFile,
    reading: state.reading,
    fileErrors: state.fileErrors,
    report,
    // Stale means the inputs genuinely moved on. A read in flight withholds the
    // result too, but that is reported as reading, not as a changed input.
    stale: state.lastReport !== null && state.reportRevision !== state.inputRevision,
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
    loadFile,
    clearFile,
    setProfile,
    run,
    selectFinding,
    openSource,
    selectSourceTable,
    toggleSource,
    togglePassed,
  };
}
