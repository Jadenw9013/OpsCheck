import type { Page } from '@playwright/test';

/**
 * Shared scenario-selection mechanics for the browser checks.
 *
 * The toolbar exposes all eighteen frozen cases through one native select, so
 * every spec drives it the same way. This file is a helper, not a spec: the
 * Playwright testMatch only collects `*.spec.ts`.
 */

/** Select a bundled scenario by its frozen id, e.g. 'S01'. */
export async function selectScenario(page: Page, scenarioId: string): Promise<void> {
  await page.getByLabel('Scenario', { exact: true }).selectOption(scenarioId);
}

export const BASELINE = 'S00';
export const EARLIER_DEPARTURE = 'S01';
export const MISSING_PACK = 'S02';
