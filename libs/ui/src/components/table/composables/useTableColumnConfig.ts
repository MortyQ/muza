import { computed, ref, toValue, type ComputedRef, type MaybeRefOrGetter, type Ref } from "vue";

import type { Column } from "../types/index";
import type { ColumnPickerItem, ToolbarConfig } from "../types/toolbar";
import { readColumnState, type SavedColumnState } from "../utils/columnState";

type ToolbarActions = NonNullable<ToolbarConfig["actions"]>;
type ColumnSetupAction = ToolbarActions["columnSetup"];
type ColumnPickerAction = ToolbarActions["columnPicker"];

export interface ColumnSetupConfig {
  key?: string
  type?: "indexedDB" | "localStorage" | "sessionStorage"
  allowReorder?: boolean
  initialVisible?: string[]
}

export interface UseTableColumnConfigOptions<TData extends Record<string, unknown>> {
  /** The consumer's declared columns — source of truth for width, sortable, format, … */
  columns: MaybeRefOrGetter<Column<TData>[]>
  /** `toolbar.actions.columnSetup` — false / string / object. */
  columnSetup: MaybeRefOrGetter<ColumnSetupAction>
  /** `toolbar.actions.columnPicker` — false / object. */
  columnPicker: MaybeRefOrGetter<ColumnPickerAction>
}

export interface UseTableColumnConfigReturn<TData extends Record<string, unknown>> {
  /** Setup enabled by config alone. The grouped-header veto is the caller's to apply. */
  columnSetupEnabledBasic: ComputedRef<boolean>
  columnSetupConfig: ComputedRef<ColumnSetupConfig>
  columnPickerEnabled: ComputedRef<boolean>
  columnPickerConfig: ComputedRef<Exclude<ColumnPickerAction, false> | null>
  columnSetupPopoverRef: Ref<{ close: () => void } | null>
  columnPickerPopoverRef: Ref<{ close: () => void } | null>
  handleVisibleColumnsUpdate: (columns: Column<TData>[]) => void
  handleColumnSetupClose: () => void
  handleColumnPickerClose: () => void
  /** Visible, ordered columns with fixed ones pushed to the edges. */
  effectiveColumns: ComputedRef<Column<TData>[]>
}

/**
 * Which columns the table actually renders, and where the answer is persisted.
 *
 * Pulled out of `VTable.vue`, where it sat as a hundred lines of storage
 * plumbing between the toolbar handlers and the grouped-header logic. Two things
 * changed on the way out, both of which the inline version got wrong:
 *
 * - **The column picker's storage key is honoured.** Only `columnSetup`'s key
 *   was read before, so a table configured with a picker and no setup restored
 *   nothing across reloads — it wrote state faithfully and then ignored it.
 * - **Fixed columns are sorted to the edges.** Sticky offsets accumulate in
 *   declaration order (see `useFixedColumns`), so a `fixed: "right"` column
 *   declared in the middle used to render its sticky offset against the wrong
 *   neighbours.
 */
export const useTableColumnConfig = <TData extends Record<string, unknown>>(
  options: UseTableColumnConfigOptions<TData>,
): UseTableColumnConfigReturn<TData> => {
  const columns = computed<Column<TData>[]>(() => toValue(options.columns));

  const columnSetupEnabledBasic = computed<boolean>(() => {
    const setup = toValue(options.columnSetup);
    return typeof setup === "string" || typeof setup === "object";
  });

  const columnSetupConfig = computed<ColumnSetupConfig>(() => {
    const setup = toValue(options.columnSetup);

    // String shorthand: the storage key, everything else defaulted.
    if (typeof setup === "string") {
      return { key: setup, type: "indexedDB", allowReorder: true };
    }

    if (typeof setup === "object") {
      return { ...setup, type: setup.type ?? "indexedDB" };
    }

    return {};
  });

  const columnPickerEnabled = computed<boolean>(() => {
    const picker = toValue(options.columnPicker);
    return !!picker && typeof picker === "object";
  });

  const columnPickerConfig = computed<Exclude<ColumnPickerAction, false> | null>(() => {
    const picker = toValue(options.columnPicker);
    if (!picker || typeof picker !== "object") return null;
    return picker;
  });

  /**
   * Rebuild a `Column[]` from what was persisted.
   *
   * Three sources for each key, in falling order of fidelity: the consumer's own
   * column (which carries width, sortable, format and the rest), the picker
   * group item it came from, and finally the label stored alongside the state.
   * The last one is what makes a picker whose groups arrive asynchronously
   * restore on the first frame instead of after the fetch.
   */
  const buildColumnsFromState = (
    loaded: SavedColumnState,
    pickerItems?: Map<string, ColumnPickerItem>,
    defaultSortable?: boolean,
  ): Column<TData>[] | null => {
    const flatten = (cols: Column<TData>[]): Column<TData>[] =>
      cols.flatMap(c => (c.children && c.children.length ? flatten(c.children) : [c]));
    const colMap = new Map(flatten(columns.value).map(c => [c.key, c]));
    const result: Column<TData>[] = [];
    const savedFixed = loaded.fixed;

    const pushColumn = (key: string): void => {
      if (!loaded.visible.includes(key)) return;

      const col = colMap.get(key);
      if (col) {
        result.push({ ...col, fixed: savedFixed?.[key] || col.fixed });
        return;
      }

      const pickerItem = pickerItems?.get(key);
      if (pickerItem) {
        result.push({
          key: pickerItem.key,
          label: pickerItem.label,
          fixed: savedFixed?.[key],
          sortable: pickerItem.sortable ?? defaultSortable,
        });
        return;
      }

      const savedLabel = loaded.labels?.[key];
      if (savedLabel) {
        result.push({
          key,
          label: savedLabel,
          fixed: savedFixed?.[key],
          sortable: defaultSortable,
        });
      }
    };

    loaded.order.forEach(pushColumn);

    // An older state may have a visible list and no order; take it in declared order.
    if (!result.length && loaded.visible.length) {
      loaded.visible.forEach(pushColumn);
    }

    return result.length ? result : null;
  };

  const loadColumnsFromStorage = async (): Promise<Column<TData>[] | null> => {
    const setupEnabled = columnSetupEnabledBasic.value;
    const picker = columnPickerConfig.value;

    if (!setupEnabled && !picker) return null;

    if (setupEnabled) {
      const config = columnSetupConfig.value;

      if (config.key) {
        try {
          const loaded = await readColumnState(config.key, config.type);
          if (loaded) return buildColumnsFromState(loaded);
        }
        catch (e) {
          console.warn("[VTable] Failed to load stored column setup", e);
        }
      }

      // No storage key: `initialVisible` is the only opening state there is.
      const initial = Array.isArray(config.initialVisible) ? config.initialVisible : null;
      if (initial) {
        // An explicitly empty list means "hide everything", not "no preference".
        if (initial.length === 0) return [];
        const filtered = columns.value.filter(c => initial.includes(c.key));
        return filtered.length ? filtered : null;
      }
    }

    if (picker?.key) {
      try {
        const loaded = await readColumnState(picker.key, picker.type);
        if (loaded) {
          const pickerItemMap = new Map<string, ColumnPickerItem>();
          picker.groups.forEach(g => g.items.forEach(i => pickerItemMap.set(i.key, i)));
          return buildColumnsFromState(loaded, pickerItemMap, picker.defaultSortable);
        }
      }
      catch (e) {
        console.warn("[VTable] Failed to load stored column picker state", e);
      }
    }

    return null;
  };

  const visibleColumns = ref<Column<TData>[] | null>(null) as Ref<Column<TData>[] | null>;
  const columnSetupPopoverRef = ref<{ close: () => void } | null>(null);
  const columnPickerPopoverRef = ref<{ close: () => void } | null>(null);

  // A deliberate top-level side effect, and the same exception `TableColumnSetup`
  // documents: deferring the restore to `onMounted` costs a visible flash of the
  // unfiltered column set before the persisted selection lands.
  void loadColumnsFromStorage().then((cols) => {
    if (cols !== null) visibleColumns.value = cols;
  });

  const handleVisibleColumnsUpdate = (cols: Column<TData>[]): void => {
    // A new array, not a mutation — the ref is what Vue is watching.
    visibleColumns.value = [...cols];
  };

  const handleColumnSetupClose = (): void => {
    columnSetupPopoverRef.value?.close();
  };

  const handleColumnPickerClose = (): void => {
    columnPickerPopoverRef.value?.close();
  };

  const sortFixedColumns = (cols: Column<TData>[]): Column<TData>[] => {
    const left = cols.filter(c => c.fixed === "left");
    const right = cols.filter(c => c.fixed === "right");
    // The common case by far, and returning the same array keeps the identity
    // stable for anything downstream comparing references.
    if (!left.length && !right.length) return cols;
    return [...left, ...cols.filter(c => !c.fixed), ...right];
  };

  const effectiveColumns = computed<Column<TData>[]>(() => {
    if (!columnSetupEnabledBasic.value && !columnPickerEnabled.value) {
      return sortFixedColumns(columns.value);
    }
    // Enabled but not yet restored: the declared columns stand in, so the table
    // renders something on the first frame rather than nothing.
    return sortFixedColumns(visibleColumns.value ?? columns.value);
  });

  return {
    columnSetupEnabledBasic,
    columnSetupConfig,
    columnPickerEnabled,
    columnPickerConfig,
    columnSetupPopoverRef,
    columnPickerPopoverRef,
    handleVisibleColumnsUpdate,
    handleColumnSetupClose,
    handleColumnPickerClose,
    effectiveColumns,
  };
};
