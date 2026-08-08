import { computed, ref, toValue, type ComputedRef, type MaybeRefOrGetter, type Ref } from "vue";

import type { HighlightConfig, HighlightCoordinate } from "../types";

export interface NormalizedHighlightConfig {
  enabled: boolean
  row: boolean
  column: boolean
}

export interface UseTableHighlightOptions {
  /** Normalized config — see normalizeHighlight below. */
  config: MaybeRefOrGetter<NormalizedHighlightConfig>
  /** Called after every state change so VTable can emit and broadcast. */
  onChange?: (coord: HighlightCoordinate) => void
}

export interface UseTableHighlightReturn {
  pinnedRowId: Readonly<Ref<string | number | null>>
  pinnedColumnKey: Readonly<Ref<string | null>>
  hasPin: ComputedRef<boolean>
  isRowPinned: (id: string | number | undefined) => boolean
  isColumnPinned: (key: string) => boolean
  toggleRow: (id: string | number) => void
  toggleColumn: (key: string) => void
  unpinRow: () => void
  unpinColumn: () => void
  clear: () => void
  /** Apply a coordinate that arrived from a linked table. Does not re-broadcast. */
  applyRemote: (coord: HighlightCoordinate) => void
  /** Apply a coordinate set programmatically. Broadcasts like a click would. */
  setPin: (coord: HighlightCoordinate) => void
}

/**
 * Turn the `boolean | HighlightConfig` union into a single flat shape.
 * Called once in VTable — nothing downstream branches on the prop's type.
 */
export const normalizeHighlight = (
  value: boolean | HighlightConfig | undefined,
): NormalizedHighlightConfig => {
  if (!value) return { enabled: false, row: false, column: false };
  if (value === true) return { enabled: true, row: true, column: true };
  return {
    enabled: true,
    row: value.row ?? true,
    column: value.column ?? true,
  };
};

/**
 * Owns *what* is pinned — one row, one column, independently.
 * No DOM, no CSS, no knowledge of linked tables: broadcasting is the caller's job
 * via `onChange`.
 */
export const useTableHighlight = (
  options: UseTableHighlightOptions,
): UseTableHighlightReturn => {
  const pinnedRowId = ref<string | number | null>(null);
  const pinnedColumnKey = ref<string | null>(null);

  const cfg = (): NormalizedHighlightConfig => toValue(options.config);

  const hasPin = computed(() => pinnedRowId.value !== null || pinnedColumnKey.value !== null);

  // Early return on a single ref read — this runs once per rendered row.
  const isRowPinned = (id: string | number | undefined): boolean => {
    if (pinnedRowId.value === null) return false;
    return id !== undefined && pinnedRowId.value === id;
  };

  // Same shape — runs once per rendered cell, inside getColumnClasses.
  const isColumnPinned = (key: string): boolean => {
    if (pinnedColumnKey.value === null) return false;
    return pinnedColumnKey.value === key;
  };

  const notify = (): void => {
    options.onChange?.({
      rowId: pinnedRowId.value,
      columnKey: pinnedColumnKey.value,
    });
  };

  const toggleRow = (id: string | number): void => {
    const { enabled, row } = cfg();
    if (!enabled || !row) return; // guard lives here, not only in the template
    pinnedRowId.value = pinnedRowId.value === id ? null : id;
    notify();
  };

  const toggleColumn = (key: string): void => {
    const { enabled, column } = cfg();
    if (!enabled || !column) return;
    pinnedColumnKey.value = pinnedColumnKey.value === key ? null : key;
    notify();
  };

  const unpinRow = (): void => {
    if (pinnedRowId.value === null) return;
    pinnedRowId.value = null;
    notify();
  };

  const unpinColumn = (): void => {
    if (pinnedColumnKey.value === null) return;
    pinnedColumnKey.value = null;
    notify();
  };

  const clear = (): void => {
    if (!hasPin.value) return; // no-op guard: keeps clear() free to call from hot paths
    pinnedRowId.value = null;
    pinnedColumnKey.value = null;
    notify();
  };

  const applyRemote = (coord: HighlightCoordinate): void => {
    const { enabled, row, column } = cfg();
    if (!enabled) return;
    // Partial application: an axis this table does not support is ignored,
    // and so is a key/id this table does not have (validated by the caller).
    pinnedRowId.value = row ? coord.rowId : null;
    pinnedColumnKey.value = column ? coord.columnKey : null;
    // Deliberately no notify() — a remote apply must not bounce back.
  };

  const setPin = (coord: HighlightCoordinate): void => {
    const { enabled, row, column } = cfg();
    if (!enabled) return;
    pinnedRowId.value = row ? coord.rowId : null;
    pinnedColumnKey.value = column ? coord.columnKey : null;
    notify();
  };

  return {
    pinnedRowId,
    pinnedColumnKey,
    hasPin,
    isRowPinned,
    isColumnPinned,
    toggleRow,
    toggleColumn,
    unpinRow,
    unpinColumn,
    clear,
    applyRemote,
    setPin,
  };
};
