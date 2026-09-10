import type { InputBundle, InputFile, ProfileId, TableKind } from '@/domain/types';
import scenariosJson from './scenarios.json';

/**
 * Bundled synthetic scenarios. Scenario id/title are presentation metadata and
 * are never passed into the engine.
 *
 * loadScenario returns a fresh deep clone every time, so evaluating one case
 * can never mutate the baseline that another case is cloned from.
 */

export interface ScenarioMeta {
  id: string;
  title: string;
  description: string;
}

interface RawScenarioFile {
  fileName: string;
  profile: string;
  csvText: string;
}

interface RawScenario {
  id: string;
  title: string;
  description: string;
  origin: string;
  files: Record<string, RawScenarioFile>;
}

interface RawScenarioPack {
  schemaVersion: string;
  timeBasis: { label: string; startClock: string; maxMinute: number };
  scenarios: RawScenario[];
}

const pack = scenariosJson as RawScenarioPack;

const TABLES: TableKind[] = ['orders', 'departures', 'workers', 'plan'];

export const BASELINE_SCENARIO_ID = 'S00';

/** The three cases wired into tonight's demo toolbar. */
export const DEMO_SCENARIO_IDS: readonly string[] = ['S00', 'S01', 'S02'];

export const scenarioList: ScenarioMeta[] = pack.scenarios.map((s) => ({
  id: s.id,
  title: s.title,
  description: s.description,
}));

export const timeBasis = { ...pack.timeBasis };

function toProfile(value: string): ProfileId {
  if (value === 'standard' || value === 'warehouse_b') return value;
  throw new Error('Unknown mapping profile in the bundled scenario pack: ' + value);
}

export function loadScenario(id: string): InputBundle {
  const scenario = pack.scenarios.find((s) => s.id === id);
  if (!scenario) throw new Error('Unknown scenario id: ' + id);

  const files: Record<TableKind, InputFile | null> = {
    orders: null,
    departures: null,
    workers: null,
    plan: null,
  };

  for (const table of TABLES) {
    const raw = scenario.files[table];
    files[table] = raw
      ? { fileName: raw.fileName, profile: toProfile(raw.profile), csvText: raw.csvText }
      : null;
  }

  return { origin: 'SYNTHETIC', files };
}

export function scenarioMeta(id: string): ScenarioMeta {
  const found = scenarioList.find((s) => s.id === id);
  if (!found) throw new Error('Unknown scenario id: ' + id);
  return { ...found };
}
