import { describe, expect, it } from 'vitest';
import { GET, POST } from '@/app/api/briefing/route';
import type { NextRequest } from 'next/server';

/**
 * Route-boundary tests.
 *
 * These confirm that malformed, oversized, cross-origin, and over-specified
 * requests are rejected before anything billable could happen, and that the
 * config endpoint never leaks a secret.
 *
 * No API key is configured in this environment, so the route's own
 * "unavailable" path is what a POST reaches - which is exactly the behaviour
 * required when the integration is not set up.
 */

function request(
  body: unknown,
  overrides: { host?: string; origin?: string | null; contentType?: string } = {},
): NextRequest {
  const host = overrides.host ?? '127.0.0.1:3100';
  const headers = new Headers({
    host,
    'content-type': overrides.contentType ?? 'application/json',
  });
  if (overrides.origin !== null) {
    headers.set('origin', overrides.origin ?? 'http://' + host);
  }
  return new Request('http://' + host + '/api/briefing', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as unknown as NextRequest;
}

const VALID_FINGERPRINT = 'a'.repeat(64);

describe('GET returns configuration only', () => {
  it('reports enabled/configured/model and no secret', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');

    const body = await res.json();
    expect(Object.keys(body).sort()).toStrictEqual(['configured', 'enabled', 'model']);
    expect(typeof body.enabled).toBe('boolean');
    expect(typeof body.configured).toBe('boolean');
    // The key itself is never present in any form.
    expect(JSON.stringify(body)).not.toContain('sk-ant');
  });
});

describe('POST rejects malformed and unauthorized requests', () => {
  it('rejects a non-loopback host', async () => {
    const res = await POST(
      request(
        { scenarioId: 'S01', inputFingerprint: VALID_FINGERPRINT },
        { host: 'opscheck.example.com', origin: 'http://opscheck.example.com' },
      ),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('forbidden_origin');
  });

  it('rejects a cross-origin post', async () => {
    const res = await POST(
      request(
        { scenarioId: 'S01', inputFingerprint: VALID_FINGERPRINT },
        { origin: 'http://evil.example.com' },
      ),
    );
    expect(res.status).toBe(403);
  });

  it('rejects a non-JSON content type', async () => {
    const res = await POST(
      request({ scenarioId: 'S01', inputFingerprint: VALID_FINGERPRINT }, {
        contentType: 'text/plain',
      }),
    );
    expect(res.status).toBe(415);
  });

  it('rejects an oversized body', async () => {
    const res = await POST(request({ scenarioId: 'S01', pad: 'x'.repeat(4000) }));
    expect(res.status).toBe(413);
  });

  it('rejects invalid JSON', async () => {
    const res = await POST(request('{ not json'));
    expect(res.status).toBe(400);
  });

  it('rejects an unsupported scenario id', async () => {
    const res = await POST(request({ scenarioId: 'S07', inputFingerprint: VALID_FINGERPRINT }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_request');
  });

  it('rejects extra request keys such as a client-supplied model', async () => {
    const res = await POST(
      request({
        scenarioId: 'S01',
        inputFingerprint: VALID_FINGERPRINT,
        model: 'claude-opus-5',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('rejects a client-supplied verdict or evidence catalog', async () => {
    const withVerdict = await POST(
      request({
        scenarioId: 'S01',
        inputFingerprint: VALID_FINGERPRINT,
        verdict: 'APPROVED',
      }),
    );
    expect(withVerdict.status).toBe(400);

    const withCatalog = await POST(
      request({ scenarioId: 'S01', inputFingerprint: VALID_FINGERPRINT, catalog: [] }),
    );
    expect(withCatalog.status).toBe(400);
  });

  it('rejects a malformed fingerprint', async () => {
    const res = await POST(request({ scenarioId: 'S01', inputFingerprint: 'short' }));
    expect(res.status).toBe(400);
  });
});

describe('POST without configuration degrades honestly', () => {
  it('returns unavailable rather than a fabricated report', async () => {
    // This environment has no key, so the guard short-circuits before any call.
    const res = await POST(
      request({ scenarioId: 'S01', inputFingerprint: VALID_FINGERPRINT }),
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.outcome).toBe('unavailable');
    expect(body.briefing).toBeNull();
    expect(body.message).toContain('Plan checks are unchanged');
    expect(body.provider).toBeNull();
  });
});
