import { MAX_MINUTE, MIN_MINUTE } from './constants';

/**
 * Scalar validation (docs/03_DATA_CONTRACTS.md section 5).
 * Raw source text is never mutated; only a separate parsed value is produced.
 *
 * Blank is MISSING and is never coerced to zero. parseInt and Number('') are
 * deliberately not used as validation.
 */

export type ScalarOutcome<T> =
  | { state: 'VALID'; value: T }
  | { state: 'MISSING' }
  | { state: 'INVALID'; reason: string };

const IDENTIFIER_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/;
const DIGITS_RE = /^\d+$/;

export function parseIdentifier(raw: string | null): ScalarOutcome<string> {
  if (raw === null) return { state: 'MISSING' };
  const trimmed = raw.trim();
  if (trimmed === '') return { state: 'MISSING' };
  if (!IDENTIFIER_RE.test(trimmed)) {
    return {
      state: 'INVALID',
      reason:
        'Identifiers must start with a letter or digit and use only letters, digits, hyphens, or underscores, up to 32 characters.',
    };
  }
  return { state: 'VALID', value: trimmed };
}

function parseBoundedInteger(
  raw: string | null,
  min: number,
  max: number,
  unitLabel: string,
): ScalarOutcome<number> {
  if (raw === null) return { state: 'MISSING' };
  const trimmed = raw.trim();
  if (trimmed === '') return { state: 'MISSING' };
  if (!DIGITS_RE.test(trimmed)) {
    return {
      state: 'INVALID',
      reason: `${unitLabel} must be a whole number written in decimal digits. Signs, decimal points, exponents, and unit suffixes are rejected.`,
    };
  }
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value)) {
    return { state: 'INVALID', reason: `${unitLabel} is not a safe integer.` };
  }
  if (value < min || value > max) {
    return { state: 'INVALID', reason: `${unitLabel} must be between ${min} and ${max}.` };
  }
  return { state: 'VALID', value };
}

/** Picking minutes: 1..720. Zero is invalid, not missing. */
export function parsePickMinutes(raw: string | null): ScalarOutcome<number> {
  return parseBoundedInteger(raw, 1, MAX_MINUTE, 'A picking duration');
}

/** Packing minutes: 0..720. Zero is a legitimate value; blank is not zero. */
export function parsePackMinutes(raw: string | null): ScalarOutcome<number> {
  return parseBoundedInteger(raw, 0, MAX_MINUTE, 'A packing duration');
}

/** Time offsets: 0..720 minutes from the synthetic 08:00 origin. */
export function parseTimeOffset(raw: string | null): ScalarOutcome<number> {
  return parseBoundedInteger(raw, MIN_MINUTE, MAX_MINUTE, 'A minute offset');
}
