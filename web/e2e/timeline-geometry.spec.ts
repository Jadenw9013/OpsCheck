import { expect, test, type Page } from '@playwright/test';
import { EARLIER_DEPARTURE, MISSING_PACK, selectScenario } from './scenario';

/**
 * Timeline geometry regression.
 *
 * The defect this guards against: the axis header and the order rows used
 * different available widths, so a departure marker drew ~71px away from its
 * own axis label. A screenshot or an HTTP 200 cannot detect that, so these
 * checks measure actual rendered bounding boxes.
 *
 * Time positions are measured from zero-width `data-time-anchor` elements, not
 * from label boxes: an endpoint label is deliberately shifted to stay inside
 * the track, which moves its box but must never move its anchor.
 */

/** Sub-pixel rounding and fractional percentage positions. */
const TOLERANCE_PX = 1.5;

interface Box {
  left: number;
  width: number;
  right: number;
}

async function plotBox(page: Page, kind: 'axis' | 'row', index = 0): Promise<Box> {
  const locator = page.locator('[data-plot="' + kind + '"]').nth(index);
  const box = await locator.boundingBox();
  expect(box, 'plot area "' + kind + '" should be rendered').not.toBeNull();
  return { left: box!.x, width: box!.width, right: box!.x + box!.width };
}

/** Anchors within one plot area, as { minute, x } in page coordinates. */
async function anchors(
  page: Page,
  scope: string,
): Promise<Array<{ minute: number; x: number }>> {
  return page.$$eval(scope + ' [data-time-anchor]', (nodes) =>
    nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return { minute: Number(node.getAttribute('data-time-anchor')), x: rect.x };
    }),
  );
}

/**
 * Fits x = a + b * minute from the axis anchors, then checks every other
 * anchor against it. This validates the mapping independently of the
 * application's own percentage arithmetic.
 */
function fitMapping(points: Array<{ minute: number; x: number }>) {
  const sorted = [...points].sort((a, b) => a.minute - b.minute);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  expect(last.minute, 'axis needs a non-zero time domain').toBeGreaterThan(first.minute);
  const b = (last.x - first.x) / (last.minute - first.minute);
  const a = first.x - b * first.minute;
  return (minute: number) => a + b * minute;
}

async function runBaseline(page: Page) {
  await page.getByRole('button', { name: 'Run checks' }).click();
  await expect(page.getByRole('region', { name: 'Order schedule' })).toContainText('on time');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'OpsCheck', level: 1 })).toBeVisible();
});

test('the axis header and every row share one plotting origin and width', async ({ page }) => {
  await runBaseline(page);

  const axis = await plotBox(page, 'axis');
  const rowCount = await page.locator('[data-plot="row"]').count();
  expect(rowCount).toBeGreaterThan(0);

  for (let i = 0; i < rowCount; i += 1) {
    const row = await plotBox(page, 'row', i);
    expect(Math.abs(row.left - axis.left), 'row ' + i + ' left edge').toBeLessThanOrEqual(
      TOLERANCE_PX,
    );
    expect(Math.abs(row.width - axis.width), 'row ' + i + ' width').toBeLessThanOrEqual(
      TOLERANCE_PX,
    );
    expect(Math.abs(row.right - axis.right), 'row ' + i + ' right edge').toBeLessThanOrEqual(
      TOLERANCE_PX,
    );
  }
});

test('the label and status columns stay outside the plotting width', async ({ page }) => {
  await runBaseline(page);
  const axis = await plotBox(page, 'axis');

  const rowButton = page
    .getByRole('region', { name: 'Order schedule' })
    .getByRole('button', { name: /^O-101,/ });
  const rowBox = (await rowButton.boundingBox())!;

  // The plot area sits strictly inside the row, leaving room on both sides.
  expect(axis.left).toBeGreaterThan(rowBox.x);
  expect(axis.right).toBeLessThan(rowBox.x + rowBox.width);
  // The status column is to the right of the plot area, not overlapping it.
  const status = (await rowButton.getByText('on time').boundingBox())!;
  expect(status.x).toBeGreaterThanOrEqual(axis.right - TOLERANCE_PX);
});

test('departure markers sit at their authoritative time positions', async ({ page }) => {
  await runBaseline(page);

  const axisAnchors = await anchors(page, '[data-plot="axis"]');
  expect(axisAnchors.length).toBeGreaterThanOrEqual(2);
  const expectedX = fitMapping(axisAnchors);

  // Every anchor drawn inside a row track: departures and readiness points.
  const rowAnchors = await anchors(page, '[data-plot="row"]');
  expect(rowAnchors.length).toBeGreaterThan(0);

  for (const anchor of rowAnchors) {
    expect(
      Math.abs(anchor.x - expectedX(anchor.minute)),
      'anchor at minute ' + anchor.minute,
    ).toBeLessThanOrEqual(TOLERANCE_PX);
  }
});

test('an axis tick and a departure at the same minute align exactly', async ({ page }) => {
  await runBaseline(page);

  const axisAnchors = await anchors(page, '[data-plot="axis"]');
  const rowAnchors = await anchors(page, '[data-plot="row"]');

  // The baseline departs on the hour, so ticks and markers share minute values.
  const shared = rowAnchors.filter((r) => axisAnchors.some((a) => a.minute === r.minute));
  expect(shared.length, 'expected at least one departure on an axis tick').toBeGreaterThan(0);

  for (const anchor of shared) {
    const tick = axisAnchors.find((a) => a.minute === anchor.minute)!;
    expect(
      Math.abs(anchor.x - tick.x),
      'departure at minute ' + anchor.minute + ' vs its axis tick',
    ).toBeLessThanOrEqual(TOLERANCE_PX);
  }
});

test('geometry holds for the earlier-departure case, including the overrun', async ({ page }) => {
  await selectScenario(page, EARLIER_DEPARTURE);
  await page.getByRole('button', { name: 'Run checks' }).click();
  await expect(page.getByRole('region', { name: 'Order schedule' })).toContainText('+10 min late');

  const axis = await plotBox(page, 'axis');
  const row = await plotBox(page, 'row', 3);
  expect(Math.abs(row.left - axis.left)).toBeLessThanOrEqual(TOLERANCE_PX);
  expect(Math.abs(row.width - axis.width)).toBeLessThanOrEqual(TOLERANCE_PX);

  const expectedX = fitMapping(await anchors(page, '[data-plot="axis"]'));
  for (const anchor of await anchors(page, '[data-plot="row"]')) {
    expect(
      Math.abs(anchor.x - expectedX(anchor.minute)),
      'anchor at minute ' + anchor.minute,
    ).toBeLessThanOrEqual(TOLERANCE_PX);
  }
});

test('every plotted element stays within the plotting area', async ({ page }) => {
  await selectScenario(page, EARLIER_DEPARTURE);
  await page.getByRole('button', { name: 'Run checks' }).click();

  const axis = await plotBox(page, 'axis');
  const boxes = await page.$$eval('[data-plot="row"] > span[title], [data-plot="row"] .pack-band',
    (nodes) =>
      nodes.map((node) => {
        const r = node.getBoundingClientRect();
        return { left: r.x, right: r.x + r.width, title: node.getAttribute('title') };
      }),
  );
  expect(boxes.length).toBeGreaterThan(0);
  for (const box of boxes) {
    expect(box.left, 'bar left within plot: ' + box.title).toBeGreaterThanOrEqual(
      axis.left - TOLERANCE_PX,
    );
    expect(box.right, 'bar right within plot: ' + box.title).toBeLessThanOrEqual(
      axis.right + TOLERANCE_PX,
    );
  }
});

test('geometry also holds at narrow width, accounting for local scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await selectScenario(page, EARLIER_DEPARTURE);
  await page.getByRole('button', { name: 'Run checks' }).click();
  await expect(page.getByRole('region', { name: 'Order schedule' })).toContainText('+10 min late');

  // Bounding boxes are viewport-relative, so axis and rows must be compared
  // without an intervening scroll; the schedule panel does not scroll locally.
  const axis = await plotBox(page, 'axis');
  const rowCount = await page.locator('[data-plot="row"]').count();
  for (let i = 0; i < rowCount; i += 1) {
    const row = await plotBox(page, 'row', i);
    expect(Math.abs(row.left - axis.left), 'narrow row ' + i + ' left').toBeLessThanOrEqual(
      TOLERANCE_PX,
    );
    expect(Math.abs(row.width - axis.width), 'narrow row ' + i + ' width').toBeLessThanOrEqual(
      TOLERANCE_PX,
    );
  }

  const expectedX = fitMapping(await anchors(page, '[data-plot="axis"]'));
  for (const anchor of await anchors(page, '[data-plot="row"]')) {
    expect(
      Math.abs(anchor.x - expectedX(anchor.minute)),
      'narrow anchor at minute ' + anchor.minute,
    ).toBeLessThanOrEqual(TOLERANCE_PX);
  }

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('narrow bars drop their label instead of showing clipped text', async ({ page }) => {
  await runBaseline(page);
  const schedule = page.getByRole('region', { name: 'Order schedule' });

  // No truncated remnant anywhere in the schedule.
  await expect(schedule.getByText(/^p…$/)).toHaveCount(0);
  await expect(schedule.getByText('p...', { exact: true })).toHaveCount(0);

  // The legend still explains the bars, and accessible names keep the times.
  await expect(
    page.getByRole('list', { name: 'Schedule legend' }).getByText('Submitted picking'),
  ).toBeVisible();
  await expect(
    schedule.getByRole('button', { name: /^O-101, worker W-1, picking 08:00 to 08:20/ }),
  ).toBeVisible();
});

test('scenario copy describes the input change, not the expected outcome', async ({ page }) => {
  const controls = page.getByRole('region', { name: 'Scenario and checks' });

  await selectScenario(page, EARLIER_DEPARTURE);
  // Describes the input that changed.
  await expect(controls).toContainText('D-1 moved earlier to 09:05');
  // Does not pre-announce the evaluated conclusion.
  await expect(controls).not.toContainText('ten minutes late');
  await expect(controls).not.toContainText('modeled ready');

  await selectScenario(page, MISSING_PACK);
  await expect(controls).toContainText('packing duration for order O-104 left blank');
  await expect(controls).not.toContainText('must not run');

  // The conclusion appears only after evaluation, in the result region.
  await page.getByRole('button', { name: 'Run checks' }).click();
  await expect(page.getByRole('region', { name: 'Current plan result' })).toContainText(
    'Cannot evaluate this plan.',
  );
});
