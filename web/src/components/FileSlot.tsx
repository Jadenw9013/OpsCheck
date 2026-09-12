'use client';

import { useId } from 'react';
import { TABLE_LABEL } from '@/domain/constants';
import { getMapping, supportedProfiles } from '@/domain/profiles';
import type { InputFile, ProfileId, TableKind } from '@/domain/types';
import { CSV_FILE_ACCEPT } from '@/features/importFile';
import type { TablePreview } from '@/features/inputPreview';
import { MissingGlyph, SourceGlyph } from './ui';

/**
 * One import slot: the file in it, the mapping profile chosen for it, and what
 * that profile will read out of the file.
 *
 * This component evaluates nothing. It reads no file content itself either: it
 * hands the picked File up, and the interface layer reads it. Every mapping row
 * comes from `getMapping`, and the profile options come from
 * `supportedProfiles`, so no column name or profile list is restated here.
 */

const PROFILE_NAME: Record<ProfileId, string> = {
  standard: 'Standard',
  warehouse_b: 'Warehouse B',
};

/** Plain-language unit for each mapped field. */
const KIND_LABEL: Record<string, string> = {
  identifier: 'identifier',
  pickMinutes: 'picking duration, minutes',
  packMinutes: 'packing duration, minutes',
  timeOffset: 'minute offset from 08:00',
};

export function FileSlot({
  table,
  file,
  profile,
  preview,
  reading,
  error,
  onLoad,
  onClear,
  onProfileChange,
}: {
  table: TableKind;
  file: InputFile | null;
  profile: ProfileId;
  preview: TablePreview;
  reading: boolean;
  error: string | null;
  onLoad: (file: File) => void;
  onClear: () => void;
  onProfileChange: (profile: ProfileId) => void;
}) {
  const inputId = useId();
  const profileId = useId();

  const label = TABLE_LABEL[table];
  const mapping = getMapping(table, profile);
  const options = supportedProfiles(table);

  return (
    <div
      role="group"
      aria-label={label + ' file'}
      className="ops-inset flex flex-col gap-4 px-5 py-4"
    >
      <div className="flex flex-col gap-3">
        <div className="min-w-0">
          <h3 className="ops-body font-semibold text-ink">{label}</h3>
          <p className="ops-meta mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-ink-muted">
            {reading ? (
              <span>Reading file…</span>
            ) : file === null ? (
              <span className="inline-flex items-center gap-1.5">
                <MissingGlyph className="h-3.5 w-3.5" />
                No file loaded
              </span>
            ) : (
              <>
                <span className="mono truncate text-ink-soft">{file.fileName}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {preview.recordCount}
                  {preview.recordCount === 1 ? ' record' : ' records'}
                </span>
              </>
            )}
          </p>
        </div>

        {/* One control row, identical in every slot, so the four line up. */}
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={profileId} className="ops-meta font-medium text-ink-soft">
            Profile
          </label>
          <select
            id={profileId}
            className="ops-select ops-select--sm"
            value={profile}
            onChange={(event) => onProfileChange(event.target.value as ProfileId)}
          >
            {options.map((id) => (
              <option key={id} value={id}>
                {PROFILE_NAME[id]}
              </option>
            ))}
          </select>

          {/*
            The real input stays in the accessibility tree and keeps its own
            focus, which the label mirrors visually; the label is the visible
            affordance. One control, one tab stop, no click forwarding.
          */}
          <input
            id={inputId}
            type="file"
            accept={CSV_FILE_ACCEPT}
            aria-label={'Choose the ' + label.toLowerCase() + ' CSV file'}
            className="ops-file-input sr-only"
            onChange={(event) => {
              const picked = event.target.files?.[0];
              // Clearing the value allows re-picking the same file after a
              // rejected import; without it the change event never fires again.
              event.target.value = '';
              if (picked) onLoad(picked);
            }}
          />
          <label htmlFor={inputId} className="ops-control ops-file-label ml-auto">
            {file === null ? 'Choose file' : 'Replace file'}
          </label>

          <button type="button" onClick={onClear} disabled={file === null} className="ops-control">
            Remove
          </button>
        </div>
      </div>

      {error !== null ? (
        <p
          role="alert"
          className="ops-meta rounded-md border border-bad/30 bg-bad-soft px-3 py-2 text-bad"
        >
          <strong className="font-semibold">Not imported.</strong> {error}
        </p>
      ) : null}

      <MappingPreview table={table} profile={profile} mapping={mapping} preview={preview} />
    </div>
  );
}

/**
 * What the selected profile expects to find, and what this file actually has.
 *
 * A missing column here is a statement about the header record, not an
 * evaluated verdict: the report still comes from Run checks.
 */
function MappingPreview({
  table,
  profile,
  mapping,
  preview,
}: {
  table: TableKind;
  profile: ProfileId;
  mapping: ReturnType<typeof getMapping>;
  preview: TablePreview;
}) {
  if (mapping === null) {
    return (
      <p className="ops-meta text-warn">
        The {PROFILE_NAME[profile]} profile is unsupported for {TABLE_LABEL[table].toLowerCase()}.
        A file mapped this way cannot be read.
      </p>
    );
  }

  const loaded = preview.fileName !== null && !preview.raw.unreadable;
  const missing = new Set(preview.missingHeaders);

  return (
    <div className="flex flex-col gap-2">
      <table className="w-full border-collapse text-left">
        <caption className="ops-meta pb-1.5 text-left text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <SourceGlyph className="h-3.5 w-3.5" />
            {PROFILE_NAME[profile]} mapping
          </span>
        </caption>
        <thead>
          <tr className="ops-meta text-ink-muted">
            <th scope="col" className="py-1 pr-4 font-medium">
              Source column
            </th>
            <th scope="col" className="py-1 pr-4 font-medium">
              Canonical field
            </th>
            <th scope="col" className="py-1 font-medium">
              Type
            </th>
          </tr>
        </thead>
        <tbody>
          {mapping.map((m) => {
            const absent = loaded && missing.has(m.column);
            return (
              <tr key={m.field} className="border-t border-line">
                <td className="mono ops-meta py-1 pr-4 text-ink">{m.column}</td>
                <td className="mono ops-meta py-1 pr-4 text-ink-soft">{m.field}</td>
                <td className="ops-meta py-1 text-ink-muted">
                  {KIND_LABEL[m.kind] ?? m.kind}
                  {absent ? (
                    <span className="ml-2 font-medium text-warn">not in this file</span>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {loaded && preview.raw.ignoredColumns.length > 0 ? (
        <p className="ops-meta text-ink-muted">
          Ignored by this profile:{' '}
          <span className="mono">{preview.raw.ignoredColumns.join(', ')}</span>. Extra columns are
          preserved in the raw source view and do not affect validation.
        </p>
      ) : null}
    </div>
  );
}
