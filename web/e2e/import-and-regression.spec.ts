import { expect, test, type Page } from '@playwright/test';
import { BASELINE, EARLIER_DEPARTURE, selectScenario } from './scenario';

/**
 * The M3 surfaces, against the production build: importing real CSV files,
 * switching a mapping profile, sweeping the frozen fixtures, and exporting a
 * report.
 *
 * The import files under `seed-data/import-examples/` are byte-identical to the
 * bundled S00 case, so loading all four must reproduce the bundled result
 * exactly. That is the point of the check: the same engine, reached through the
 * file picker instead of the fixture loader.
 */

const RUN = 'Run checks';
const RESET = 'Reset baseline';
const EXAMPLES = '../seed-data/import-examples/';

function result(page: Page) {
  return page.getByRole('region', { name: 'Current plan result' });
}

function slot(page: Page, table: string) {
  return page.getByRole('group', { name: table + ' file' });
}

async function openImport(page: Page) {
  await page.getByText('Use your own CSV exports', { exact: true }).click();
  await expect(slot(page, 'Orders')).toBeVisible();
}

async function importFile(page: Page, table: string, fileName: string) {
  await slot(page, table)
    .locator('input[type="file"]')
    .setInputFiles(EXAMPLES + fileName);
}

async function importBaselineFiles(page: Page) {
  await importFile(page, 'Orders', 'orders_standard.csv');
  await importFile(page, 'Departures', 'departures_standard.csv');
  await importFile(page, 'Workers', 'workers_standard.csv');
  await importFile(page, 'Plan', 'plan_standard.csv');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'OpsCheck', level: 1 })).toBeVisible();
});

test('the import section states the caps and shows the real mapping', async ({ page }) => {
  await openImport(page);

  const orders = slot(page, 'Orders');
  await expect(orders.getByText('orders.csv')).toBeVisible();

  // The mapping preview is the profile's own column list, not restated copy.
  await expect(orders.getByText('order_id', { exact: true })).toBeVisible();
  await expect(orders.getByText('pack_minutes', { exact: true })).toBeVisible();
  await expect(orders.getByText('packing duration, minutes')).toBeVisible();

  // Workers and plan offer standard only; orders and departures offer both.
  await expect(slot(page, 'Orders').getByLabel('Profile')).toContainText('Warehouse B');
  await expect(slot(page, 'Workers').getByLabel('Profile')).not.toContainText('Warehouse B');

  await expect(page.getByText('262144 bytes')).toBeVisible();
});

test('importing the example files reproduces the bundled baseline result', async ({ page }) => {
  await openImport(page);
  await importBaselineFiles(page);

  // The data is now the user's, and is labelled as unverified.
  await expect(page.getByText('User-supplied data, unverified')).toBeVisible();
  await expect(result(page).getByText('Passed implemented checks.')).toHaveCount(0);

  await page.getByRole('button', { name: RUN }).click();

  // Byte-identical inputs, so the engine must produce the bundled S00 numbers.
  await expect(result(page).getByText('Passed implemented checks.')).toBeVisible();
  await expect(result(page).getByText('44 passed / 0 failed / 0 blocked')).toBeVisible();
  await expect(
    result(page).getByText('8 orders / 2 departures / 2 workers / 8 assignments'),
  ).toBeVisible();
});

test('an imported blank packing duration blocks evaluation instead of assuming zero', async ({
  page,
}) => {
  await openImport(page);
  await importFile(page, 'Orders', 'orders_missing_pack.csv');
  await page.getByRole('button', { name: RUN }).click();

  await expect(result(page).getByText('Cannot evaluate this plan.')).toBeVisible();
  await expect(result(page).getByText('Not evaluated')).toBeVisible();
  await expect(page.getByText('Passed implemented checks.')).toHaveCount(0);

  // The blank cell itself is reported, not a zero.
  await expect(page.getByText(/pack_minutes/).first()).toBeVisible();
});

test('reset baseline restores the synthetic fixture after an import', async ({ page }) => {
  await openImport(page);
  await importFile(page, 'Orders', 'orders_missing_pack.csv');
  await expect(page.getByText('User-supplied data, unverified')).toBeVisible();

  await page.getByRole('button', { name: RESET }).click();

  await expect(page.getByText('Synthetic data', { exact: true })).toBeVisible();
  await expect(page.getByText('User-supplied data, unverified')).toHaveCount(0);
  await expect(slot(page, 'Orders').getByText('orders.csv')).toBeVisible();
  await expect(result(page).getByText('Ready to check the submitted plan.')).toBeVisible();
});

test('removing a file drops the result and reports the missing slot', async ({ page }) => {
  await page.getByRole('button', { name: RUN }).click();
  await expect(result(page).getByText('Passed implemented checks.')).toBeVisible();

  await openImport(page);
  await slot(page, 'Workers').getByRole('button', { name: 'Remove' }).click();

  await expect(result(page).getByText('Inputs changed. Run checks again.')).toBeVisible();
  await expect(page.getByText('Passed implemented checks.')).toHaveCount(0);
  await expect(slot(page, 'Workers').getByText('No file loaded')).toBeVisible();

  await page.getByRole('button', { name: RUN }).click();
  await expect(result(page).getByText('Cannot evaluate this plan.')).toBeVisible();
});

test('switching a mapping profile invalidates the previous result', async ({ page }) => {
  await page.getByRole('button', { name: RUN }).click();
  await expect(result(page).getByText('Passed implemented checks.')).toBeVisible();

  await openImport(page);
  await slot(page, 'Orders').getByLabel('Profile').selectOption('warehouse_b');

  // The result is gone the moment the mapping changes, badge included.
  await expect(result(page).getByText('Inputs changed. Run checks again.')).toBeVisible();
  await expect(page.getByText('Passed implemented checks.')).toHaveCount(0);

  // The preview now shows the other profile's columns.
  await expect(slot(page, 'Orders').getByText('OrderRef', { exact: true })).toBeVisible();
  await expect(slot(page, 'Orders').getByText('not in this file').first()).toBeVisible();

  // Standard-named columns read under Warehouse B cannot be found.
  await page.getByRole('button', { name: RUN }).click();
  await expect(result(page).getByText('Cannot evaluate this plan.')).toBeVisible();
});

test('the warehouse B export maps cleanly under the warehouse B profile', async ({ page }) => {
  await openImport(page);
  await slot(page, 'Orders').getByLabel('Profile').selectOption('warehouse_b');
  await slot(page, 'Departures').getByLabel('Profile').selectOption('warehouse_b');
  await importFile(page, 'Orders', 'orders_warehouse_b.csv');
  await importFile(page, 'Departures', 'departures_warehouse_b.csv');

  await expect(slot(page, 'Orders').getByText('not in this file')).toHaveCount(0);

  await page.getByRole('button', { name: RUN }).click();

  // Same operational values through a different set of column names.
  await expect(result(page).getByText('Passed implemented checks.')).toBeVisible();
  await expect(result(page).getByText('44 passed / 0 failed / 0 blocked')).toBeVisible();
});

test('the regression sweep runs on demand and matches every frozen expectation', async ({
  page,
}) => {
  await page.getByText('Regression cases', { exact: true }).click();

  // Nothing has run merely because the panel was opened.
  await expect(page.getByText('Not run in this session.')).toBeVisible();
  await expect(page.getByText(/of 18 matched/)).toHaveCount(0);

  await page.getByRole('button', { name: 'Run all regression cases' }).click();

  await expect(page.getByText('18 of 18 matched')).toBeVisible();
  await expect(page.getByRole('cell', { name: /^S17/ })).toBeVisible();
  // The badge itself, not the word inside the surrounding prose.
  await expect(page.getByText('FAIL', { exact: true })).toHaveCount(0);
  await expect(page.getByText('PASS', { exact: true })).toHaveCount(18);
  await expect(page.getByText('Matches the frozen expectation exactly.')).toHaveCount(18);
});

test('the regression sweep does not disturb the loaded inputs or the result', async ({ page }) => {
  await selectScenario(page, EARLIER_DEPARTURE);
  await page.getByRole('button', { name: RUN }).click();
  await expect(result(page).getByText('1 modeled violation')).toBeVisible();

  await page.getByText('Regression cases', { exact: true }).click();
  await page.getByRole('button', { name: 'Run all regression cases' }).click();
  await expect(page.getByText('18 of 18 matched')).toBeVisible();

  // The workspace still shows this scenario's own current result.
  await expect(result(page).getByText('1 modeled violation')).toBeVisible();
  await expect(result(page).getByText('43 passed / 1 failed / 0 blocked')).toBeVisible();
});

test('the report can only be downloaded while it describes the current inputs', async ({
  page,
}) => {
  const download = page.getByRole('button', { name: 'Download report' });
  await expect(download).toBeDisabled();

  await page.getByRole('button', { name: RUN }).click();
  await expect(download).toBeEnabled();

  // Changing inputs invalidates the report, so there is nothing current to save.
  await selectScenario(page, EARLIER_DEPARTURE);
  await expect(download).toBeDisabled();

  await page.getByRole('button', { name: RUN }).click();
  await expect(download).toBeEnabled();
});

test('the downloaded report is named for the case and carries the engine result', async ({
  page,
}) => {
  await selectScenario(page, EARLIER_DEPARTURE);
  await page.getByRole('button', { name: RUN }).click();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download report' }).click(),
  ]);

  expect(download.suggestedFilename()).toMatch(/^opscheck-report-S01-\d{12}\.json$/);

  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));

  expect(payload.inputs).toMatchObject({ scenarioId: 'S01', origin: 'SYNTHETIC' });
  expect(payload.result).toMatchObject({
    dataStatus: 'READY',
    planStatus: 'VIOLATIONS',
    checkCounts: { passed: 43, failed: 1, blocked: 0 },
  });
  // Evidence travels with the finding; the CSV text does not.
  expect(JSON.stringify(payload)).not.toContain('order_id,pick_minutes');
  expect(payload.limitations.join(' ')).toContain('does not establish optimality');
});

test('a report exported from imported files is marked unverified and named custom', async ({
  page,
}) => {
  await openImport(page);
  await importBaselineFiles(page);
  await page.getByRole('button', { name: RUN }).click();
  await expect(result(page).getByText('Passed implemented checks.')).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download report' }).click(),
  ]);

  expect(download.suggestedFilename()).toMatch(/^opscheck-report-custom-\d{12}\.json$/);

  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));

  expect(payload.inputs.scenarioId).toBeNull();
  expect(payload.inputs.origin).toBe('USER_SUPPLIED_UNVERIFIED');
  expect(payload.result.planStatus).toBe('PASS');
});

test('the scenario list offers every frozen case and returns to the baseline', async ({
  page,
}) => {
  const select = page.getByLabel('Scenario', { exact: true });
  await expect(select.locator('option')).toHaveCount(18);

  await selectScenario(page, 'S16');
  await expect(page.getByText('Warehouse B column names')).toBeVisible();

  await selectScenario(page, BASELINE);
  await expect(page.getByRole('button', { name: RESET })).toBeDisabled();
});
