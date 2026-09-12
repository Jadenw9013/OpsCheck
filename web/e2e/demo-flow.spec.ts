import { expect, test, type Page } from '@playwright/test';
import { EARLIER_DEPARTURE, MISSING_PACK, selectScenario } from './scenario';

/**
 * The scoped demo walkthrough, exercised against the production build:
 * baseline -> run -> earlier departure -> run -> select O-104 -> open source
 * cell -> missing packing duration -> run -> reset.
 *
 * These assertions target user-visible truthfulness rules: a changed input must
 * drop the previous result, a blocked dataset must never render an operational
 * pass, and the schedule must draw nothing derived until an evaluation exists.
 */

const RUN = 'Run checks';
const RESET = 'Reset baseline';

/** The current plan outcome now has its own region above the workspace. */
function result(page: Page) {
  return page.getByRole('region', { name: 'Current plan result' });
}

function schedule(page: Page) {
  return page.getByRole('region', { name: 'Order schedule' });
}

function evidence(page: Page) {
  return page.getByRole('region', { name: 'Evidence' });
}

/** The schedule legend, named so assertions target it and not nearby prose. */
function legend(page: Page) {
  return page.getByRole('list', { name: 'Schedule legend' });
}

/** The schedule row control for one order. */
function orderRow(page: Page, orderId: string) {
  return schedule(page).getByRole('button', { name: new RegExp('^' + orderId + ',') });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'OpsCheck', level: 1 })).toBeVisible();
});

test('inputs are preloaded but the schedule draws nothing derived before a run', async ({
  page,
}) => {
  await expect(result(page).getByText('Ready to check the submitted plan.')).toBeVisible();
  await expect(result(page).getByText('Not evaluated')).toBeVisible();

  // The schedule is populated from submitted inputs immediately.
  await expect(schedule(page)).toBeVisible();
  await expect(legend(page).getByText('Submitted picking')).toBeVisible();

  // But no modeled band, readiness, or verdict is drawn yet.
  await expect(legend(page).getByText('Modeled packing')).toHaveCount(0);
  await expect(schedule(page).getByText(/min late/)).toHaveCount(0);
  await expect(schedule(page).getByText('on time')).toHaveCount(0);

  // No green operational claim anywhere on the page yet.
  await expect(page.getByText('Passed implemented checks')).toHaveCount(0);

  // Raw source stays reachable, collapsed by default.
  // The raw tables are now a labelled disclosure, collapsed by default.
  await expect(page.getByRole('button', { name: /Raw source records/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Raw source records/ })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
});

test('baseline reports a pass only after checks actually run', async ({ page }) => {
  await page.getByRole('button', { name: RUN }).click();

  await expect(result(page).getByText('Ready', { exact: true })).toBeVisible();
  await expect(result(page).getByText('Passed implemented checks.')).toBeVisible();

  // The schedule now shows modeled bands and on-time outcomes from the report.
  await expect(legend(page).getByText('Modeled packing')).toBeVisible();
  await expect(schedule(page).getByText('on time').first()).toBeVisible();
  await expect(schedule(page).getByText(/min late/)).toHaveCount(0);

  // A pass is stated as implemented checks passing, never as optimality.
  await expect(page.getByText(/not that the plan is optimal/)).toBeVisible();
});

test('earlier departure shows the ten-minute miss and navigates to a real source cell', async ({
  page,
}) => {
  await selectScenario(page, EARLIER_DEPARTURE);
  await page.getByRole('button', { name: RUN }).click();

  await expect(result(page).getByText('1 modeled violation')).toBeVisible();

  // The schedule marks exactly one late order, and it is O-104.
  await expect(schedule(page).getByText(/min late/)).toHaveCount(1);
  await expect(orderRow(page, 'O-104')).toContainText('+10 min late');

  // The departure marker must actually render, not collapse to zero width.
  const marker = schedule(page).locator('span[title^="Departure "]').first();
  await expect(marker).toBeVisible();
  const markerBox = await marker.boundingBox();
  expect(markerBox).not.toBeNull();
  expect(markerBox!.width).toBeGreaterThan(1);
  expect(markerBox!.height).toBeGreaterThan(4);

  // Selecting the order in the schedule drives the inspector.
  await orderRow(page, 'O-104').click();
  await expect(orderRow(page, 'O-104')).toHaveAttribute('aria-pressed', 'true');

  // The calculation chain reads out of the engine result.
  const panel = evidence(page);
  await expect(panel).toContainText('PLAN_READY_BY_DEPARTURE');
  await expect(panel).toContainText('Picking complete');
  await expect(panel).toContainText('08:45');
  await expect(panel).toContainText('Assumed packing');
  await expect(panel).toContainText('30 min');
  await expect(panel).toContainText('Modeled ready');
  await expect(panel).toContainText('09:15');
  await expect(panel).toContainText('Departure');
  await expect(panel).toContainText('09:05');
  await expect(panel).toContainText('Misses departure by 10 min');

  // A duration must never be shown as a time of day.
  await expect(panel).not.toContainText('08:30');

  // Opening a source cell expands the raw viewer and highlights the real value.
  await panel.getByRole('button', { name: 'Open source cell' }).first().click();
  const hit = page.locator('.cell-hit');
  await expect(hit).toHaveCount(1);
  await expect(hit).toBeVisible();
  await expect(hit).toHaveText('45');

  // The revealed cell is in the plan table at logical record 5.
  await expect(page.getByRole('tab', { name: /^Plan/ })).toHaveAttribute('aria-selected', 'true');
  const row = page.locator('#source-viewer tbody tr', { has: page.locator('.cell-hit') });
  await expect(row.locator('th').first()).toHaveText('5');
});

test('the compact source chip in the calculation opens its own cell', async ({ page }) => {
  await selectScenario(page, EARLIER_DEPARTURE);
  await page.getByRole('button', { name: RUN }).click();
  await orderRow(page, 'O-104').click();

  // The chip beside "Assumed packing" points at orders.csv record 5.
  await evidence(page)
    .getByRole('button', { name: /Open orders\.csv record 5, column pack_minutes/ })
    .click();

  const hit = page.locator('.cell-hit');
  await expect(hit).toHaveCount(1);
  await expect(hit).toHaveText('30');
  await expect(page.getByRole('tab', { name: /^Orders/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('selecting a finding highlights the matching schedule row', async ({ page }) => {
  await selectScenario(page, EARLIER_DEPARTURE);
  await page.getByRole('button', { name: RUN }).click();

  // Deselect by choosing a different order, then select via the findings list.
  await orderRow(page, 'O-101').click();
  await expect(orderRow(page, 'O-104')).toHaveAttribute('aria-pressed', 'false');

  await page
    .getByRole('region', { name: 'Findings' })
    .getByRole('button', { name: /O-104 is modeled ready 10 minutes/ })
    .click();

  await expect(orderRow(page, 'O-104')).toHaveAttribute('aria-pressed', 'true');
});

test('missing packing duration blocks evaluation instead of assuming zero', async ({ page }) => {
  await selectScenario(page, MISSING_PACK);
  await page.getByRole('button', { name: RUN }).click();

  await expect(result(page).getByText('Cannot evaluate this plan.')).toBeVisible();
  await expect(result(page).getByText('Missing required data')).toBeVisible();

  // A blocked dataset must never render an operational pass or a verdict.
  await expect(page.getByText('Passed implemented checks')).toHaveCount(0);
  await expect(schedule(page).getByText(/min late/)).toHaveCount(0);
  await expect(schedule(page).getByText('on time')).toHaveCount(0);
  await expect(legend(page).getByText('Modeled packing')).toHaveCount(0);
  await expect(schedule(page).getByText(/Not evaluated\./)).toBeVisible();

  const planTable = page.getByRole('table', { name: /Submitted picking assignments/ });
  await expect(planTable.getByText('Violation', { exact: true })).toHaveCount(0);
  await expect(planTable.getByText('Passed', { exact: true })).toHaveCount(0);

  // The inspector states the blocked outcome and names the blank cell.
  const panel = evidence(page);
  await expect(panel).toContainText('Cannot evaluate this plan');
  await expect(panel).toContainText('DATA_MISSING_VALUE');
  await expect(panel).toContainText('[empty]');
  await expect(panel).toContainText('orders.csv · record 5 · pack_minutes');

  // The blank source cell is still inspectable.
  await panel.getByRole('button', { name: 'Open source cell' }).first().click();
  const hit = page.locator('.cell-hit');
  await expect(hit).toHaveCount(1);
  // The cell renders visually blank; "empty" is the screen-reader-only marker.
  await expect(hit).toHaveText('empty');

  // All four raw tables remain inspectable while evaluation is blocked.
  for (const table of ['Orders', 'Departures', 'Workers', 'Plan']) {
    await page.getByRole('tab', { name: new RegExp('^' + table) }).click();
    await expect(page.locator('#source-viewer tbody tr').first()).toBeVisible();
  }
});

test('changing the scenario invalidates the previous report and its overlays', async ({
  page,
}) => {
  await page.getByRole('button', { name: RUN }).click();
  await expect(result(page).getByText('Passed implemented checks.')).toBeVisible();
  await expect(schedule(page).getByText('on time').first()).toBeVisible();

  // Switching inputs must drop the result and every derived overlay with it.
  await selectScenario(page, EARLIER_DEPARTURE);
  await expect(result(page).getByText('Passed implemented checks.')).toHaveCount(0);
  await expect(result(page).getByText('Inputs changed. Run checks again.')).toBeVisible();
  await expect(result(page).getByText('Not evaluated')).toBeVisible();
  await expect(schedule(page).getByText('on time')).toHaveCount(0);
  await expect(legend(page).getByText('Modeled packing')).toHaveCount(0);
  await expect(schedule(page).getByText(/min late/)).toHaveCount(0);
  await expect(page.getByText(/previous report no longer applies/)).toBeVisible();
});

test('reset returns to a fresh baseline with no carried-over result', async ({ page }) => {
  await selectScenario(page, EARLIER_DEPARTURE);
  await page.getByRole('button', { name: RUN }).click();
  await expect(result(page).getByText('1 modeled violation')).toBeVisible();

  await page.getByRole('button', { name: RESET }).click();

  await expect(result(page).getByText('1 modeled violation')).toHaveCount(0);
  // Reset replaces the bundle, so it reports a changed input like any other switch.
  await expect(result(page).getByText('Inputs changed. Run checks again.')).toBeVisible();
  await expect(result(page).getByText('Not evaluated')).toBeVisible();
  await expect(schedule(page).getByText(/min late/)).toHaveCount(0);
  await expect(page.locator('.cell-hit')).toHaveCount(0);
  await expect(page.getByRole('button', { name: RESET })).toBeDisabled();

  // Re-running the baseline still produces the baseline outcome.
  await page.getByRole('button', { name: RUN }).click();
  await expect(result(page).getByText('Passed implemented checks.')).toBeVisible();
});

test('controls, status, schedule, and the calculation share a laptop viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await selectScenario(page, EARLIER_DEPARTURE);
  await page.getByRole('button', { name: RUN }).click();

  for (const locator of [
    page.getByRole('button', { name: RUN }),
    page.getByLabel('Scenario', { exact: true }),
    result(page).getByText('1 modeled violation'),
    result(page).getByText('43 passed / 1 failed / 0 blocked'),
  ]) {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(768);
  }
});

test('a narrow viewport stacks without overflowing the page horizontally', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await selectScenario(page, EARLIER_DEPARTURE);
  await page.getByRole('button', { name: RUN }).click();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
