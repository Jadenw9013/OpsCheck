import { TABLE_ORDER } from '@/domain/constants';
import { normalizeTable } from '@/domain/normalize';
import { getMapping, type TableMapping } from '@/domain/profiles';
import type { InputBundle, ProfileId, RawTable, TableKind } from '@/domain/types';

/**
 * Display-only view of the loaded inputs.
 *
 * This exists so the raw source tables, record counts, and mapping strip can be
 * shown the moment a bundle is loaded, without claiming any evaluation has
 * happened. It deliberately produces no diagnostics, no canonical entities, and
 * no derived operational values.
 */

export interface TablePreview {
  table: TableKind;
  fileName: string | null;
  profile: ProfileId | null;
  /** Non-blank data records preserved from the file. */
  recordCount: number;
  raw: RawTable;
  mapping: TableMapping | null;
  /** Required columns the profile expects but the header does not contain. */
  missingHeaders: string[];
}

export type InputPreview = Record<TableKind, TablePreview>;

export function buildInputPreview(bundle: InputBundle): InputPreview {
  const preview = {} as InputPreview;
  for (const table of TABLE_ORDER) {
    const file = bundle.files[table];
    const mapping = file ? getMapping(table, file.profile) : null;
    const nt = normalizeTable(table, file, mapping);
    preview[table] = {
      table,
      fileName: file?.fileName ?? null,
      profile: file?.profile ?? null,
      recordCount: nt.raw.records.length,
      raw: nt.raw,
      mapping,
      missingHeaders: nt.missingHeaders,
    };
  }
  return preview;
}
