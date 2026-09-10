import { TABLE_ORDER } from '@/domain/constants';
import type { InputBundle } from '@/domain/types';
import { ENGINE_CONTRACT } from './contracts';

/**
 * A content fingerprint over the exact input bundle the engine will evaluate.
 *
 * It binds file names, mapping profiles, raw CSV text, and the engine contract
 * so the browser and the server can agree that they are talking about the same
 * snapshot. Volatile things - selections, timestamps, report property order -
 * are deliberately excluded.
 *
 * This is a content binding, not authentication and not evidence that the
 * inputs describe reality.
 */

/** Stable serialization: fixed table order, fixed key order, no whitespace. */
export function serializeBundle(bundle: InputBundle): string {
  const files = TABLE_ORDER.map((table) => {
    const file = bundle.files[table];
    if (!file) return { table, present: false };
    return {
      table,
      present: true,
      fileName: file.fileName,
      profile: file.profile,
      csvText: file.csvText,
    };
  });

  // JSON.stringify preserves insertion order, and every object here is built
  // with the same literal key order, so the output is stable across runtimes.
  return JSON.stringify({
    contract: ENGINE_CONTRACT,
    origin: bundle.origin,
    files,
  });
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * SHA-256 of the stable serialization, as lowercase hex.
 *
 * Uses Web Crypto, which is present in the browser and in Node 18+, so the
 * browser and the route compute the identical value.
 */
export async function fingerprintBundle(bundle: InputBundle): Promise<string> {
  const bytes = new TextEncoder().encode(serializeBundle(bundle));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return toHex(digest);
}
