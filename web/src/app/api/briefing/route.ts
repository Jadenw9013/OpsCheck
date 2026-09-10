import type { NextRequest } from 'next/server';
import { briefingRequestSchema } from '@/briefing/contracts';
import { generateBriefing } from '@/briefing/generate';
import { liveProvider, readConfig } from '@/server/anthropic-briefing';

/**
 * The only network endpoint in OpsCheck.
 *
 * It accepts a scenario id and a snapshot fingerprint, nothing else: no model
 * name, system prompt, provider options, client verdict, or client-supplied
 * evidence. Local demo safeguards only - this is not production authentication
 * or distributed rate limiting, and it must not be exposed publicly.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 2_048;
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 60_000;

let inFlight = false;
let recentCalls: number[] = [];

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

/** Same-origin plus loopback host only. Rejected before any billable call. */
function originAllowed(request: NextRequest): boolean {
  const host = request.headers.get('host');
  if (host === null) return false;
  const hostname = host.split(':')[0];
  if (hostname !== '127.0.0.1' && hostname !== 'localhost' && hostname !== '[::1]') {
    return false;
  }

  const origin = request.headers.get('origin');
  if (origin === null) return true; // same-origin fetch may omit Origin
  try {
    const parsed = new URL(origin);
    return parsed.host === host;
  } catch {
    return false;
  }
}

export async function GET(): Promise<Response> {
  // Configuration only. Never returns the key and never calls Anthropic.
  const config = readConfig();
  return json(
    { enabled: config.enabled, configured: config.configured, model: config.model },
    200,
  );
}

export async function POST(request: NextRequest): Promise<Response> {
  if (!originAllowed(request)) {
    return json({ error: 'forbidden_origin' }, 403);
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return json({ error: 'unsupported_media_type' }, 415);
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json({ error: 'request_too_large' }, 413);
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(raw);
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  // Strict: unknown keys reject the request outright.
  const parsed = briefingRequestSchema.safeParse(parsedBody);
  if (!parsed.success) {
    return json({ error: 'invalid_request' }, 400);
  }

  const config = readConfig();
  if (!config.enabled || !config.configured) {
    return json(
      {
        outcome: 'unavailable',
        inputFingerprint: parsed.data.inputFingerprint,
        briefing: null,
        gates: [],
        message: config.enabled
          ? 'AI briefing unavailable: no API key is configured. Plan checks are unchanged.'
          : 'AI briefing unavailable: the integration is disabled. Plan checks are unchanged.',
        provider: null,
      },
      200,
    );
  }

  const now = Date.now();
  recentCalls = recentCalls.filter((t) => now - t < RATE_WINDOW_MS);
  if (recentCalls.length >= RATE_LIMIT) {
    return json({ error: 'rate_limited' }, 429);
  }
  if (inFlight) {
    return json({ error: 'generation_in_progress' }, 409);
  }

  inFlight = true;
  recentCalls.push(now);
  try {
    const result = await generateBriefing({
      scenarioId: parsed.data.scenarioId,
      requestedFingerprint: parsed.data.inputFingerprint,
      provider: liveProvider,
    });
    return json(result, 200);
  } catch {
    // Never leak a stack trace or provider payload to the client.
    return json({ error: 'internal_error' }, 500);
  } finally {
    inFlight = false;
  }
}
