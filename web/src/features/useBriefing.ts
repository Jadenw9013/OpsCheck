'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  BriefingConfigResponse,
  BriefingResponse,
  GateResult,
} from '@/briefing/contracts';
import { fingerprintBundle } from '@/briefing/fingerprint';
import type { InputBundle } from '@/domain/types';

/**
 * Client lifecycle for the AI report.
 *
 * A stored result carries the invalidation key it was produced for, so it stops
 * being current the moment inputs, scenario, or run change - the same gating
 * idea the engine report already uses.
 *
 * Three independent guards discard a stale answer: the invalidation key, the
 * snapshot fingerprint, and a monotonic generation token. The token matters
 * because S01 -> S00 -> S01 produces the same fingerprint again, so content
 * alone cannot prove that a late response belongs to the current request.
 *
 * Nothing generates on mount, rerender, scenario selection, or tab switching.
 * Exactly one deliberate Run checks click with the switch on authorizes exactly
 * one provider request, enforced by a ref set before any await.
 */

export type BriefingState =
  | 'idle'
  | 'requesting'
  | 'receiving'
  | 'validating'
  | 'verified'
  | 'withheld'
  | 'unavailable'
  | 'stale';

/** Real operations, in order. Each maps to something that actually happened. */
export const ACTIVITY_STAGES: Array<{ state: BriefingState; label: string }> = [
  { state: 'requesting', label: 'Requesting Claude' },
  { state: 'receiving', label: 'Receiving response' },
  { state: 'validating', label: 'Checking evidence references' },
];

interface Entry {
  key: string;
  state: BriefingState;
  response: BriefingResponse | null;
  message: string | null;
  /** The scenario this generation was started for, shown in the activity line. */
  scenarioId: string;
}

export interface BriefingController {
  state: BriefingState;
  response: BriefingResponse | null;
  config: BriefingConfigResponse | null;
  gates: GateResult[];
  message: string | null;
  scenarioId: string | null;
  /** True while a provider request is in flight for the current run. */
  busy: boolean;
  /** True when the integration is enabled and configured server-side. */
  available: boolean;
  includeAi: boolean;
  setIncludeAi: (on: boolean) => void;
  /** Called by the Run checks handler, after the deterministic run. */
  startForRun: (args: { scenarioId: string; bundle: InputBundle; key: string }) => void;
  retry: () => void;
  cancel: () => void;
}

export function useBriefing(args: { invalidationKey: string }): BriefingController {
  const { invalidationKey } = args;

  const [entry, setEntry] = useState<Entry | null>(null);
  const [config, setConfig] = useState<BriefingConfigResponse | null>(null);
  const [includeAi, setIncludeAiState] = useState(false);

  const generationToken = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  /** Set synchronously before any await so a double click cannot send twice. */
  const inFlight = useRef(false);
  /** Retained so an explicit Retry can repeat the same run's request. */
  const lastRequest = useRef<{ scenarioId: string; bundle: InputBundle; key: string } | null>(
    null,
  );
  /** The invalidation key the in-flight request belongs to. */
  const activeKey = useRef<string | null>(null);

  // Configuration only: this GET never calls Anthropic and returns no secret.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/briefing', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: BriefingConfigResponse | null) => {
        if (cancelled) return;
        setConfig(data);
        // Default on for this local demo only when the server says it is ready.
        if (data && data.enabled && data.configured) setIncludeAiState(true);
      })
      .catch(() => {
        if (!cancelled) setConfig({ enabled: false, configured: false, model: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Abandon work that belongs to a superseded snapshot.
   *
   * Run checks starts the request before React commits the new run, so this
   * compares the in-flight request's own key rather than firing on every key
   * change - otherwise it would abort the request it just authorized. Sets no
   * state: a stale entry is already excluded by the key comparison below.
   */
  useEffect(() => {
    if (activeKey.current !== null && activeKey.current !== invalidationKey) {
      generationToken.current += 1;
      inFlight.current = false;
      abortRef.current?.abort();
      abortRef.current = null;
      activeKey.current = null;
    }
  }, [invalidationKey]);

  const current = entry !== null && entry.key === invalidationKey ? entry : null;
  const state: BriefingState = current?.state ?? 'idle';

  const run = useCallback(
    (request: { scenarioId: string; bundle: InputBundle; key: string }) => {
      // One request per click: the ref is set before any asynchronous work.
      if (inFlight.current) return;
      inFlight.current = true;
      lastRequest.current = request;
      activeKey.current = request.key;

      const { scenarioId, bundle, key } = request;
      const token = ++generationToken.current;
      const controller = new AbortController();
      abortRef.current?.abort();
      abortRef.current = controller;

      const publish = (next: Omit<Entry, 'key' | 'scenarioId'>) => {
        if (token !== generationToken.current) return;
        setEntry({ key, scenarioId, ...next });
      };

      setEntry({ key, scenarioId, state: 'requesting', response: null, message: null });

      void (async () => {
        try {
          const inputFingerprint = await fingerprintBundle(bundle);
          if (token !== generationToken.current) return;

          const res = await fetch('/api/briefing', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ scenarioId, inputFingerprint }),
            signal: controller.signal,
            cache: 'no-store',
          });

          publish({ state: 'receiving', response: null, message: null });

          if (!res.ok) {
            const reason =
              res.status === 429
                ? 'the local request cap was reached'
                : res.status === 409
                  ? 'another generation is already running'
                  : 'the request was rejected (' + res.status + ')';
            publish({
              state: 'unavailable',
              response: null,
              message: 'AI report unavailable: ' + reason + '. Plan checks are unchanged.',
            });
            return;
          }

          const data = (await res.json()) as BriefingResponse;
          if (token !== generationToken.current) return;
          publish({ state: 'validating', response: null, message: null });

          // Late responses are discarded even when the fingerprint matches again.
          const currentFingerprint = await fingerprintBundle(bundle);
          if (token !== generationToken.current) return;
          if (data.inputFingerprint !== currentFingerprint) {
            publish({
              state: 'stale',
              response: null,
              message: 'AI report discarded: the inputs changed while it was being generated.',
            });
            return;
          }

          publish({
            state:
              data.outcome === 'verified'
                ? 'verified'
                : data.outcome === 'withheld'
                  ? 'withheld'
                  : data.outcome === 'stale'
                    ? 'stale'
                    : 'unavailable',
            response: data,
            message: data.message,
          });
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          publish({
            state: 'unavailable',
            response: null,
            message:
              'AI report unavailable: the request could not complete. Plan checks are unchanged.',
          });
        } finally {
          inFlight.current = false;
          if (activeKey.current === key) activeKey.current = null;
        }
      })();
    },
    [],
  );

  const available = config !== null && config.enabled && config.configured;

  const startForRun = useCallback(
    (request: { scenarioId: string; bundle: InputBundle; key: string }) => {
      if (!available || !includeAi) return;
      run(request);
    },
    [available, includeAi, run],
  );

  /** An explicit user action that starts one new billable attempt. */
  const retry = useCallback(() => {
    const request = lastRequest.current;
    if (!available || !includeAi || request === null) return;
    if (request.key !== invalidationKey) return;
    run(request);
  }, [available, includeAi, invalidationKey, run]);

  const cancel = useCallback(() => {
    generationToken.current += 1;
    inFlight.current = false;
    activeKey.current = null;
    abortRef.current?.abort();
    setEntry(null);
  }, []);

  const setIncludeAi = useCallback(
    (on: boolean) => {
      setIncludeAiState(on);
      // Turning AI off cancels pending work and drops the report.
      if (!on) cancel();
    },
    [cancel],
  );

  return {
    state,
    response: current?.response ?? null,
    config,
    gates: current?.response?.gates ?? [],
    message: current?.message ?? null,
    scenarioId: current?.scenarioId ?? null,
    busy: state === 'requesting' || state === 'receiving' || state === 'validating',
    available,
    includeAi,
    setIncludeAi,
    startForRun,
    retry,
    cancel,
  };
}
