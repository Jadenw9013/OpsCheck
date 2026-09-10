import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * Browser checks for the AI report, with the ROUTE RESPONSE mocked.
 *
 * Scope note for the evidence log: these are MOCKED-PROVIDER checks. The real
 * gate and narrative logic is exercised offline in `tests/briefing-gates.test.ts`
 * and `tests/briefing-narrative.test.ts`, which feed untrusted model-shaped
 * payloads through the actual validators. Here we verify the client lifecycle:
 * one request per click, deterministic-first updates, tab intent, stale
 * rejection, failure states, and correctly scoped labels.
 */

const RUN = 'Run checks';

const panel = (page: Page) => page.getByRole('region', { name: 'Inspector' });
const schedule = (page: Page) => page.getByRole('region', { name: 'Order schedule' });
const aiTab = (page: Page) => page.getByRole('tab', { name: /AI report/ });
const evidenceTab = (page: Page) => page.getByRole('tab', { name: 'Evidence' });

const OVERVIEW =
  'Order O-104 does not reach its departure in time once the assumed packing delay is applied.';
const FINDING_PROSE =
  'Picking completes at 08:45 and the modeled ready time lands after the 09:05 departure.';

const GATES = [
  'COMPLETION_AND_SCHEMA',
  'SNAPSHOT_MATCH',
  'CATALOG_MEMBERSHIP',
  'FINDING_COMPLETENESS',
  'PROVENANCE',
  'VERDICT_CONSISTENCY',
  'SCOPE_AND_REVIEW',
].map((id) => ({ id, status: 'PASSED', codes: [], detail: 'Checked against this run.' }));

const NARRATIVE_CHECKS = [
  'ENVELOPE_SCHEMA',
  'OVERVIEW_REFERENCES',
  'FINDING_COVERAGE',
  'REVIEW_REFERENCES',
].map((id) => ({ id, status: 'PASSED', codes: [], detail: 'Checked.' }));

function verifiedPayload(fingerprint: string) {
  const statement = {
    factId: 'fact.violation.001',
    kind: 'violation',
    text: 'O-104 is modeled ready 10 minutes after its departure.',
    detail: null,
    isAssumption: false,
    sources: [
      {
        label: 'Assumed packing',
        source: {
          table: 'orders',
          fileName: 'orders.csv',
          recordNumber: 5,
          column: 'pack_minutes',
          rawValue: '30',
        },
      },
    ],
  };

  return {
    outcome: 'verified',
    inputFingerprint: fingerprint,
    gates: GATES,
    message: 'Verified against this run.',
    provider: {
      model: 'claude-haiku-4-5-20251001',
      stopReason: 'end_turn',
      usage: { inputTokens: 872, outputTokens: 143 },
      elapsedMs: 1420,
      requestId: 'req_mock_1',
    },
    briefing: {
      catalogVersion: 'opscheck-briefing-catalog-v1',
      inputFingerprint: fingerprint,
      detailLevel: 'explained',
      verdict: {
        dataStatus: 'READY',
        planStatus: 'VIOLATIONS',
        headline:
          'Checks complete: the submitted plan has modeled violations. 43 passed, 1 failed, 0 blocked.',
        checkCounts: { passed: 43, failed: 1, blocked: 0 },
      },
      lead: statement,
      findings: [statement],
      context: [],
      assumptions: ['Packing is modeled as a fixed delay.'],
      limitations: ['All inputs are synthetic.'],
      reviewSteps: ['Rerun checks after any confirmed input change.'],
      metrics: {
        traceability: { verified: 1, total: 1 },
        requiredFindings: { included: 1, total: 1 },
        gates: { passed: 7, applicable: 7, results: GATES },
      },
    },
    narrative: {
      overview: {
        text: OVERVIEW,
        citations: [{ factId: 'fact.violation.001', label: statement.text }],
      },
      findings: [{ factId: 'fact.violation.001', explanation: FINDING_PROSE }],
      reviewNotes: [
        {
          reviewStepId: 'RERUN_AFTER_CHANGES',
          label: 'Rerun checks after any confirmed input change.',
          explanation: 'Rerun the checks once operations confirms the timing.',
        },
      ],
      checks: NARRATIVE_CHECKS,
      references: { resolved: 2, referenced: 2 },
    },
  };
}

/** Configured integration, without any real key. */
async function mockConfig(page: Page, enabled = true) {
  await page.route('**/api/briefing', async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          enabled,
          configured: enabled,
          model: enabled ? 'claude-haiku-4-5-20251001' : null,
        }),
      });
      return;
    }
    await route.fallback();
  });
}

async function mockPost(
  page: Page,
  handler: (fingerprint: string) => unknown,
  opts: { status?: number; delayMs?: number; onCall?: () => void } = {},
) {
  await page.route('**/api/briefing', async (route: Route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    opts.onCall?.();
    const body = JSON.parse(route.request().postData() ?? '{}');
    if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
    await route.fulfill({
      status: opts.status ?? 200,
      contentType: 'application/json',
      body: JSON.stringify(handler(body.inputFingerprint)),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'OpsCheck', level: 1 })).toBeVisible();
});

test('with AI disabled the app is fully usable and sends nothing', async ({ page }) => {
  let posts = 0;
  await mockConfig(page, false);
  await mockPost(page, verifiedPayload, { onCall: () => (posts += 1) });
  await page.reload();

  await expect(page.getByRole('switch', { name: 'Include AI report' })).toBeDisabled();
  await page.getByRole('button', { name: RUN }).click();
  await expect(schedule(page).getByText('on time').first()).toBeVisible();
  expect(posts).toBe(0);

  await aiTab(page).click();
  await expect(panel(page)).toContainText(/disabled|not configured/);
});

test('one Run checks click with AI on sends exactly one request', async ({ page }) => {
  let posts = 0;
  await mockConfig(page);
  await mockPost(page, verifiedPayload, { onCall: () => (posts += 1) });
  await page.reload();

  // Nothing on mount, and nothing on a scenario-only change.
  await expect(page.getByRole('switch', { name: 'Include AI report' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  expect(posts).toBe(0);
  await page.getByRole('button', { name: /^Earlier departure/ }).click();
  expect(posts).toBe(0);

  await page.getByRole('button', { name: RUN }).click();
  await expect(panel(page).getByText(OVERVIEW)).toBeVisible();
  expect(posts).toBe(1);

  // Switching tabs must not bill.
  await evidenceTab(page).click();
  await aiTab(page).click();
  expect(posts).toBe(1);
});

test('deterministic results update before the AI response arrives', async ({ page }) => {
  await mockConfig(page);
  await mockPost(page, verifiedPayload, { delayMs: 1200 });
  await page.reload();

  await page.getByRole('button', { name: /^Earlier departure/ }).click();
  await page.getByRole('button', { name: RUN }).click();

  // Engine output is present immediately, while the report is still generating.
  await expect(schedule(page).getByText('+10 min late')).toBeVisible({ timeout: 1000 });
  await expect(
    page.getByRole('region', { name: 'Current plan result' }).getByText('1 modeled violation'),
  ).toBeVisible();
  await expect(panel(page)).toContainText('Requesting Claude');

  // Then the prose arrives.
  await expect(panel(page).getByText(OVERVIEW)).toBeVisible();
});

test('the report shows real prose, scoped labels, and a working citation', async ({ page }) => {
  await mockConfig(page);
  await mockPost(page, verifiedPayload);
  await page.reload();

  await page.getByRole('button', { name: /^Earlier departure/ }).click();
  await page.getByRole('button', { name: RUN }).click();

  const inspector = panel(page);
  await expect(inspector.getByText(OVERVIEW)).toBeVisible();
  await expect(inspector.getByText(FINDING_PROSE)).toBeVisible();

  // The narrative is labelled advisory, never verified.
  await expect(inspector).toContainText(
    'AI-written explanation. Evidence references checked; wording requires review.',
  );
  await expect(inspector).toContainText('Review required');

  // Scoped metrics: no invented confidence percentage.
  await expect(inspector).toContainText('Engine-fact traceability');
  await expect(inspector).toContainText('Explanation references');
  await expect(inspector).toContainText('Narrative factual confidence');
  await expect(inspector).toContainText('Not calibrated');
  await expect(inspector).not.toContainText('Approved');
  await expect(inspector).not.toContainText('Safe to dispatch');

  // The engine verdict stays red and is repeated in the AI tab.
  await expect(inspector).toContainText('modeled violations');
  await expect(schedule(page).getByText('+10 min late')).toBeVisible();

  // The canonical finding is shown beside the paraphrase.
  await expect(inspector).toContainText('OpsCheck finding');
  await expect(inspector).toContainText('O-104 is modeled ready 10 minutes after its departure.');

  // A citation chip opens the real source cell.
  await inspector
    .getByRole('button', { name: /Open orders\.csv record 5, column pack_minutes/ })
    .first()
    .click();
  const hit = page.locator('.cell-hit');
  await expect(hit).toHaveCount(1);
  await expect(hit).toHaveText('30');
});

test('missing data is reported without a readiness estimate or approval', async ({ page }) => {
  await mockConfig(page);
  await mockPost(page, (fingerprint) => ({
    outcome: 'verified',
    inputFingerprint: fingerprint,
    gates: GATES,
    message: 'Verified against this run.',
    provider: {
      model: 'claude-haiku-4-5-20251001',
      stopReason: 'end_turn',
      usage: { inputTokens: 884, outputTokens: 139 },
      elapsedMs: 1210,
      requestId: 'req_mock_2',
    },
    briefing: {
      catalogVersion: 'opscheck-briefing-catalog-v1',
      inputFingerprint: fingerprint,
      detailLevel: 'explained',
      verdict: {
        dataStatus: 'INCOMPLETE',
        planStatus: 'NOT_EVALUATED',
        headline:
          'Plan not evaluated: required input data is missing. All five rule families are blocked, and a blocked rule is not a passed rule.',
        checkCounts: { passed: 0, failed: 0, blocked: 0 },
      },
      lead: {
        factId: 'fact.diag.001',
        kind: 'diagnostic',
        text: 'O-104 is missing a packing duration.',
        detail: null,
        isAssumption: false,
        sources: [],
      },
      findings: [
        {
          factId: 'fact.diag.001',
          kind: 'diagnostic',
          text: 'O-104 is missing a packing duration.',
          detail: null,
          isAssumption: false,
          sources: [],
        },
      ],
      context: [],
      assumptions: ['Packing is modeled as a fixed delay.'],
      limitations: ['All inputs are synthetic.'],
      reviewSteps: ['Confirm the missing required value at its source.'],
      metrics: {
        traceability: { verified: 1, total: 1 },
        requiredFindings: { included: 1, total: 1 },
        gates: { passed: 7, applicable: 7, results: GATES },
      },
    },
    narrative: {
      overview: {
        text: 'A required packing duration is blank, so the plan was not evaluated.',
        citations: [],
      },
      findings: [
        {
          factId: 'fact.diag.001',
          explanation: 'No value was assumed for the blank cell, so no rule could run.',
        },
      ],
      reviewNotes: [],
      checks: NARRATIVE_CHECKS,
      references: { resolved: 1, referenced: 1 },
    },
  }));
  await page.reload();

  await page.getByRole('button', { name: /^Missing packing duration/ }).click();
  await page.getByRole('button', { name: RUN }).click();

  const inspector = panel(page);
  await expect(inspector).toContainText('Plan not evaluated');
  await expect(inspector).toContainText('blocked rule is not a passed rule');
  await expect(inspector).toContainText('requires review');
  // No operational approval, and no invented readiness time.
  await expect(inspector).not.toContainText('Approved');
  await expect(schedule(page).getByText(/min late/)).toHaveCount(0);
});

test('a withheld narrative names the failed check and publishes no prose', async ({ page }) => {
  await mockConfig(page);
  await mockPost(page, (fingerprint) => {
    const base = verifiedPayload(fingerprint);
    return {
      ...base,
      outcome: 'withheld',
      message: 'AI explanation withheld: a required finding was left unexplained.',
      narrative: {
        overview: { text: '', citations: [] },
        findings: [],
        reviewNotes: [],
        checks: [
          { id: 'ENVELOPE_SCHEMA', status: 'PASSED', codes: [], detail: 'Valid.' },
          { id: 'OVERVIEW_REFERENCES', status: 'PASSED', codes: [], detail: 'Resolved.' },
          {
            id: 'FINDING_COVERAGE',
            status: 'FAILED',
            codes: ['NARRATIVE_MISSING_FINDING'],
            detail: 'Unexplained required findings: fact.violation.001.',
          },
          { id: 'REVIEW_REFERENCES', status: 'NOT_APPLICABLE', codes: [], detail: 'Not evaluated.' },
        ],
        references: { resolved: 1, referenced: 1 },
      },
    };
  });
  await page.reload();

  await page.getByRole('button', { name: /^Earlier departure/ }).click();
  await page.getByRole('button', { name: RUN }).click();

  const inspector = panel(page);
  await expect(inspector).toContainText('withheld');
  await expect(inspector.getByText(OVERVIEW)).toHaveCount(0);
  // The deterministic evidence is still shown and still red.
  await expect(inspector).toContainText('modeled violations');
  await expect(schedule(page).getByText('+10 min late')).toBeVisible();
});

test('an API failure keeps the app usable and offers one explicit retry', async ({ page }) => {
  let posts = 0;
  await mockConfig(page);
  await mockPost(page, () => ({ error: 'rate_limited' }), {
    status: 429,
    onCall: () => (posts += 1),
  });
  await page.reload();

  await page.getByRole('button', { name: RUN }).click();
  const inspector = panel(page);
  await expect(inspector).toContainText('AI report unavailable');
  await expect(inspector).toContainText('Plan checks are unchanged');
  expect(posts).toBe(1);

  // Deterministic output is unaffected.
  await expect(schedule(page).getByText('on time').first()).toBeVisible();

  // Retry is one explicit new attempt, never automatic.
  await expect(inspector.getByRole('button', { name: /Retry AI report/ })).toBeVisible();
  await page.waitForTimeout(300);
  expect(posts).toBe(1);
});

test('a late response cannot steal the tab after the user chooses Evidence', async ({ page }) => {
  await mockConfig(page);
  await mockPost(page, verifiedPayload, { delayMs: 1500 });
  await page.reload();

  await page.getByRole('button', { name: /^Earlier departure/ }).click();
  await page.getByRole('button', { name: RUN }).click();
  await expect(aiTab(page)).toHaveAttribute('aria-selected', 'true');

  // The user deliberately moves to Evidence while the request is in flight.
  await evidenceTab(page).click();
  await expect(evidenceTab(page)).toHaveAttribute('aria-selected', 'true');

  await page.waitForTimeout(1800);
  // Completion must not pull focus back.
  await expect(evidenceTab(page)).toHaveAttribute('aria-selected', 'true');
});

test('a scenario change invalidates the report and it cannot reappear', async ({ page }) => {
  await mockConfig(page);
  await mockPost(page, verifiedPayload);
  await page.reload();

  await page.getByRole('button', { name: /^Earlier departure/ }).click();
  await page.getByRole('button', { name: RUN }).click();
  await expect(panel(page).getByText(OVERVIEW)).toBeVisible();

  // S01 -> S00 -> S01 reaches an identical fingerprint again.
  await page.getByRole('button', { name: /^Baseline/ }).click();
  await expect(panel(page).getByText(OVERVIEW)).toHaveCount(0);

  await page.getByRole('button', { name: /^Earlier departure/ }).click();
  await expect(panel(page).getByText(OVERVIEW)).toHaveCount(0);
});

test('re-running the same scenario invalidates the previous report', async ({ page }) => {
  await mockConfig(page);
  await mockPost(page, verifiedPayload, { delayMs: 400 });
  await page.reload();

  await page.getByRole('button', { name: /^Earlier departure/ }).click();
  await page.getByRole('button', { name: RUN }).click();
  await expect(panel(page).getByText(OVERVIEW)).toBeVisible();

  await page.getByRole('button', { name: RUN }).click();
  // The old report is gone while the new one generates.
  await expect(panel(page)).toContainText('Requesting Claude');
});

test('the AI report tab does not disturb the timeline or evidence flow', async ({ page }) => {
  await mockConfig(page);
  await mockPost(page, verifiedPayload);
  await page.reload();

  await page.getByRole('button', { name: /^Earlier departure/ }).click();
  await page.getByRole('button', { name: RUN }).click();

  // Selecting a timeline row is an explicit request for Evidence.
  await schedule(page).getByRole('button', { name: /^O-104,/ }).click();
  await expect(evidenceTab(page)).toHaveAttribute('aria-selected', 'true');
  await expect(panel(page)).toContainText('Misses departure by 10 min');

  await panel(page).getByRole('button', { name: 'Open source cell' }).first().click();
  await expect(page.locator('.cell-hit')).toHaveText('45');

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('the report renders at narrow width without page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockConfig(page);
  await mockPost(page, verifiedPayload);
  await page.reload();

  await page.getByRole('button', { name: /^Earlier departure/ }).click();
  await page.getByRole('button', { name: RUN }).click();
  await expect(panel(page).getByText(OVERVIEW)).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
