/**
 * Shared storage contract for persisted column visibility/order/pin/label state.
 *
 * This is the single source of truth for the shape written by TableColumnSetup.vue
 * and TableColumnPicker.vue, and read by VTable.vue. Previously this shape was
 * declared independently (and slightly differently) in three places with nothing
 * enforcing agreement between writers and readers.
 */

import tableStorage, { type StorageType } from "./storage";

export interface SavedColumnState {
  visible: string[]
  order: string[]
  fixed?: Record<string, "left" | "right">
  labels?: Record<string, string>
}

/**
 * Read a persisted SavedColumnState for `key`.
 *
 * If `type` is provided, switches the shared `tableStorage` singleton's storage
 * type first (it mutates module-global state, so ordering relative to the read
 * matters — this preserves the set-type-then-read ordering every call site used
 * before this was centralized).
 *
 * Intentionally does NOT try/catch or log — callers currently differ in how they
 * handle a failed read (console.warn vs console.error, differing messages, some
 * falling through to a fallback afterward). Keep that logic at the call site.
 */
export const readColumnState = (
  key: string,
  type?: StorageType,
): Promise<SavedColumnState | null> => {
  if (type) tableStorage.setStorageType(type);
  return tableStorage.getTableConfig<SavedColumnState>(key);
};

/**
 * Write a SavedColumnState for `key`.
 *
 * Same storage-type-switch-first ordering as `readColumnState`. Pass exactly the
 * fields the caller intends to persist — this superset type allows omitting
 * `labels` (as TableColumnSetup.vue does) or including it (as TableColumnPicker.vue
 * does); it does not force either shape.
 *
 * Intentionally does NOT try/catch or log — see `readColumnState` note above.
 */
export const writeColumnState = async (
  key: string,
  state: SavedColumnState,
  type?: StorageType,
): Promise<void> => {
  if (type) tableStorage.setStorageType(type);
  await tableStorage.setTableConfig(key, state);
};
