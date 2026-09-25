<script generic="TData extends Record<string, unknown> = Record<string, unknown>" lang="ts" setup>
import {
  ref, computed, watch, onMounted, onUnmounted, useSlots, provide, inject,
  type Component, type ComponentPublicInstance, type Ref,
} from "vue";

import type { VirtualItem } from "@tanstack/vue-virtual";

import VButton from "../base/VButton.vue";
import VFloating from "../overlay/VFloating.vue";

import TableBackdrop from "./components/TableBackdrop.vue";
import TableCell from "./components/TableCell.vue";
import TableCheckboxCell from "./components/TableCheckboxCell.vue";
import TableColumnPicker from "./components/TableColumnPicker.vue";
import TableColumnSetup from "./components/TableColumnSetup.vue";
import TableEmptyState from "./components/TableEmptyState.vue";
import TableFullscreenToggle from "./components/TableFullscreenToggle.vue";
import TableHeaderCheckbox from "./components/TableHeaderCheckbox.vue";
import TableHeaderGrouped from "./components/TableHeaderGrouped.vue";
import TableHeaderSimple from "./components/TableHeaderSimple.vue";
import TableLoadingOverlay from "./components/TableLoadingOverlay.vue";
import TablePagination from "./components/TablePagination.vue";
import TablePinButton from "./components/TablePinButton.vue";
import TableRow from "./components/TableRow.vue";
import TableToolbar from "./components/TableToolbar.vue";
import { useColumnResize } from "./composables/useColumnResize";
import { useExpandableTable } from "./composables/useExpandableTable";
import { useFixedColumns } from "./composables/useFixedColumns";
import { useGroupedHeaders } from "./composables/useGroupedHeaders";
import { useTableCellMetadata } from "./composables/useTableCellMetadata";
import { useTableColumnConfig } from "./composables/useTableColumnConfig";
import { useTableFormatters } from "./composables/useTableFormatters";
import { useTableFullScreen } from "./composables/useTableFullScreen";
import { normalizeHighlight, useTableHighlight } from "./composables/useTableHighlight";
import { TABLE_PAGE_KEY } from "./composables/useTablePage";
import { useTableSelection } from "./composables/useTableSelection";
import { useTableSort } from "./composables/useTableSort";
import { useVirtualTable } from "./composables/useVirtualTable";
import { DEFAULT_ROW_HEIGHT } from "./constants";
import type {
  Column,
  ExpandableRow,
  FlattenedRow,
  HeaderCell,
  HighlightCoordinate,
  TableHighlightState,
} from "./types/index";
import type { TableProps, TableEmits } from "./types/props";

const {
  loading = false,
  virtualized = true,
  rowHeight = DEFAULT_ROW_HEIGHT,
  expandMode = "auto",
  sort = { type: "server", multiple: true },
  toolbar,
  columns,
  data,
  height,
  totalRow,
  selectedRows,
  multiSelect,
  sortState,
  pagination,
  page,
  rowClassName,
  scrollSync,
  highlight,
  highlightState,
  highlightSync,
} = defineProps<TableProps<TData>>();

// defineEmits with generic type params is broken in generic SFCs (Vue compiler limitation —
// only the last overload is recognized). Workaround: runtime array + cast to TableEmits<TData>.
const emit = defineEmits([
  "row-click", "update:selected-rows", "expand-click",
  "update:sort-state", "update:highlight-state", "update:page", "request", "sort",
  "update:search", "toolbar:refresh", "toolbar:reset-sort", "toolbar:export",
]) as unknown as TableEmits<TData>;

// Explicit annotation: see VSelect — an unannotated useSlots() in a globally
// registered component resolves through its own type and collapses to `any`.
const $slots: ReturnType<typeof useSlots> = useSlots();

// Interface for formatted cell values
interface FormattedCell {
  text?: unknown
  class?: string
}

// Provide slots to deeply nested components (avoid prop drilling)
// This is the recommended Vue approach used by Element Plus, Ant Design Vue, etc.
provide("tableSlots", {
  headerCellCustomAction: $slots["header-cell-custom-action"],
  toolbarTitle: $slots["toolbar-title"],
  toolbarSearch: $slots["toolbar-search"],
  toolbarActions: $slots["toolbar-actions"],
});

const searchModel = defineModel<string>("search", { default: "" });

// Toolbar enabled check
const toolbarEnabled = computed<boolean>(() => {
  return !!(toolbar?.enabled || $slots.toolbar);
});

// Toolbar event handlers
const handleToolbarRefresh = () => {
  // Always emit the event so parent can listen to it
  emit("toolbar:refresh");

  // Check refresh action mode from config
  const refreshMode = toolbar?.actions?.refresh;

  // Apply built-in behavior only if mode is 'default', true, or not specified
  // If mode is 'custom', only emit event without built-in behavior
  if (refreshMode === "custom") {
    return; // Parent handles everything manually
  }

  // Built-in refresh logic: reset sort and pagination
  sortStateRef.value = [];
  pageRef.value = 1; // sync v-model:page
  expandableLogic.collapseAll();
  // Emit request event (works for both with/without pagination)
  emit("request", {
    page: pagination?.page ?? 1,
    pageSize: pagination?.pageSize ?? 10,
    sort: [],
  });
};

const handleToolbarResetSort = () => {
  // Always emit the event so parent can listen to it
  emit("toolbar:reset-sort");

  // Check reset sort action mode from config
  const resetSortMode = toolbar?.actions?.resetSort;

  // Apply built-in behavior only if mode is 'default', true, or not specified
  // If mode is 'custom', only emit event without built-in behavior
  if (resetSortMode === "custom") {
    return; // Parent handles everything manually
  }

  // Built-in reset sort logic: clear sort state and emit request
  sortStateRef.value = [];
  pageRef.value = 1; // sync v-model:page
  expandableLogic.collapseAll();
  // Emit request event with current page (works for both with/without pagination)
  emit("request", {
    page: pagination?.page ?? 1,
    pageSize: pagination?.pageSize ?? 10,
    sort: [],
  });
};

const handleToolbarExport = (format: string, selectedOnly?: boolean) => {
  emit("toolbar:export", format, selectedOnly);
};

// ── Column visibility, order and persistence ────────────────────────────────
// Storage plumbing, the picker/setup key fallback and the fixed-to-the-edges
// sort all live in the composable; VTable only wires it to the toolbar config.
const {
  columnSetupEnabledBasic,
  columnSetupConfig,
  columnPickerConfig,
  columnSetupPopoverRef,
  columnPickerPopoverRef,
  handleVisibleColumnsUpdate,
  handleColumnSetupClose,
  handleColumnPickerClose,
  effectiveColumns,
} = useTableColumnConfig<TData>({
  columns: () => columns,
  columnSetup: () => toolbar?.actions?.columnSetup,
  columnPicker: () => toolbar?.actions?.columnPicker,
});

// Total row visibility - simply check for presence
const shouldShowTotal = computed(() => totalRow !== undefined);

// Column resizing logic - needs to know about flat columns first
const columnsRef = computed(() => effectiveColumns.value);

// Initialize columnWidths for grouped headers detection
const columnWidths = ref<Map<string, number>>(new Map());

// Grouped headers logic (AG-Grid style with children)
const {
  hasGroups,
  flatColumns,
  headerLevels,
  getGroupWidth,
  isGroupFixed,
} = useGroupedHeaders(columnsRef, columnWidths);

// Column Setup Enabled - final check with hasGroups
const columnSetupEnabled = computed(() => {
  if (!columnSetupEnabledBasic.value) return false;

  // Disable column setup if grouped headers are present
  // TODO: Implement support for grouped headers in column setup
  if (hasGroups.value) {
    console.warn("Column Setup is not supported with grouped headers yet");
    return false;
  }

  return true;
});

// Columns for rendering data rows and fixed logic
// OPTIMIZATION: Use flatColumns only when groups exist
// IMPORTANT: Use effectiveColumns (filtered by column setup) instead of props.columns
const columnsForData = computed(() => {
  return hasGroups.value ? flatColumns.value : effectiveColumns.value;
});

// Column resize works with leaf columns (flatColumns when groups exist)
const columnsForResize = computed(() => columnsForData.value);
const {
  gridTemplateColumns,
  getGridTemplateWithCheckbox,
  startResize,
  autoFitColumn,
  isResizing,
  resizedWidths,
  isColumnResizable,
} = useColumnResize(columnsForResize);

// Update columnWidths ref to match resizedWidths
// For fixed columns calculation, we need all widths (original + resized)
watch(resizedWidths, () => {
  // Rebuild columnWidths map with actual widths for fixed columns
  const newWidths = new Map<string, number>();
  columnsForData.value.forEach((col) => {
    const resizedWidth = resizedWidths.value.get(col.key);
    if (resizedWidth !== undefined) {
      newWidths.set(col.key, resizedWidth);
    }
    else if (col.width?.endsWith("px")) {
      newWidths.set(col.key, parseInt(col.width, 10));
    }
    // For flex columns, we don't add to the map
  });
  columnWidths.value = newWidths;
}, { immediate: true });

// Fixed columns logic (with dynamic widths)
// Pass flatColumns when groups exist to work with leaf columns only
const columnsForFixed = computed(() => columnsForData.value);
const {
  getFixedStyles,
  isLastLeftFixed,
  isFirstRightFixed,
} = useFixedColumns(columnsForFixed, columnWidths);

// Table height - simple calculation based on prop
const tableHeight = computed(() => {
  if (!height) {
    return "600px"; // Default height
  }

  // If number - add 'px'
  if (typeof height === "number") {
    return `${height}px`;
  }

  // If string - use as is (supports: '100%', '50vh', 'calc(...)')
  return height;
});

// Sort logic - must be before dataToDisplay usage
const sortStateRef = computed({
  get: () => sortState || [],
  set: val => emit("update:sort-state", val),
});

// ── Page state — supports 3 modes ───────────────────────────────────
// mode 1: @request          — no v-model:page, no useTablePage
// mode 2: v-model:page      — props.page is bound, synced via emit
// mode 3: useTablePage      — page ref injected from parent composable
const injectedPage = inject(TABLE_PAGE_KEY, null);

const pageRef = computed({
  get: () => page ?? injectedPage?.value ?? pagination?.page ?? 1,
  set: (val) => {
    if (page !== undefined) {
      emit("update:page", val); // mode 2: v-model:page
    }
    else if (injectedPage) {
      injectedPage.value = val; // mode 3: useTablePage
    }
    // mode 1: @request — page display driven by props.pagination, no sync needed
  },
});

const {
  getSortState,
  handleSortClick: internalHandleSortClick,
  sortedData,
} = useTableSort({
  sort,
  sortState: sortStateRef,
  columns: columnsRef,
  page: computed(() => pagination?.page),
  pageSize: computed(() => pagination?.pageSize),
  data: computed<TData[]>(() => data as TData[]),
  onRequest: (payload) => {
    pageRef.value = payload.page; // sync v-model:page (sort resets to page 1)
    expandableLogic.collapseAll();
    emit("request", payload);
  },
  onSort: payload => emit("sort", payload),
  onUpdateSortState: newSortState => emit("update:sort-state", newSortState),
});

// Formatter composable
const { formatCellValue } = useTableFormatters();

// Helper function to get formatted cell value
const getCellValue = (value: unknown, column: Column, row: Record<string, unknown>) => {
  if (!column.format) {
    return value;
  }
  const formatted = formatCellValue(value, column, row);
  // If it's an object with text property, return the text for display
  if (
    formatted
    && typeof formatted === "object"
    && !Array.isArray(formatted)
    && "text" in formatted
    && typeof (formatted as FormattedCell).text !== "undefined"
  ) {
    return (formatted as FormattedCell).text;
  }
  return formatted;
};

// Helper function to get CSS class for formatted cell
const getCellClass = (value: unknown, column: Column, row: Record<string, unknown>) => {
  if (!column.format) {
    return undefined;
  }
  const formatted = formatCellValue(value, column, row);
  // If it's an object with class property, return the class
  if (
    formatted
    && typeof formatted === "object"
    && !Array.isArray(formatted)
    && "class" in formatted
    && typeof (formatted as FormattedCell).class === "string"
  ) {
    return (formatted as FormattedCell).class;
  }
  return undefined;
};

// Wrapper for sort click to ensure proper handling
const handleSortClick = (column: Column) => {
  internalHandleSortClick(column);
};

// Use sorted data for frontend, original data for server
// PERFORMANCE: Auto-generate id for rows without id (needed for expandable logic)
const dataToDisplay = computed(() => {
  const source = sort?.type === "front" ? sortedData.value : data;

  // Add id to rows that don't have one (recursive for children)
  const ensureIds = (rows: ExpandableRow[], prefix = ""): ExpandableRow[] => {
    return rows.map((row, index) => {
      const id = row.id ?? `${prefix}row-${index}`;
      const children = row.children?.length
        ? ensureIds(row.children, `${id}-`)
        : row.children;

      // Only create new object if we need to add id or process children
      if (row.id !== undefined && children === row.children) {
        return row;
      }

      return { ...row, id, children };
    });
  };

  return ensureIds(source as ExpandableRow[]);
});

// Automatic expandable detection by presence of children
const isExpandable = computed(() =>
  dataToDisplay.value.some(row => row.children && row.children.length > 0),
);

// Expandable logic - always create, but only use when data has children
const dataRef = computed(() => dataToDisplay.value);
const expandableLogic = useExpandableTable(dataRef);

// Data for rendering (with flatten if expandable, otherwise regular)
const displayData = computed<(TData & FlattenedRow)[]>(() => {
  const rows = isExpandable.value
    ? expandableLogic.flattenedData.value
    : dataToDisplay.value;
  return rows as unknown as (TData & FlattenedRow)[];
});

// Multi-select logic
const multiSelectConfig = computed(() => multiSelect);
const selectedRowsRef = computed({
  get: () => selectedRows ?? [],
  set: (value: TData[]) => emit("update:selected-rows", value),
});

const selection = useTableSelection({
  config: multiSelectConfig,
  flattenedData: displayData as unknown as Ref<FlattenedRow[]>,
  selectedRows: selectedRowsRef as unknown as Ref<ExpandableRow[]>,
  onSelectionChange: (selected) => {
    emit("update:selected-rows", selected as unknown as TData[]);
  },
});

// Virtualization with dynamic height for expand
const scrollContainerRef = ref<HTMLElement | null>(null);

// Fullscreen geometry targets. `wrapperRef` becomes the fixed panel;
// `placeholderRef` holds the wrapper's original slot in the page while it is
// out of flow; the chrome refs are measured to derive the content height.
const wrapperRef = ref<HTMLElement | null>(null);
const placeholderRef = ref<HTMLElement | null>(null);
const toolbarSlotRef = ref<HTMLElement | null>(null);
const paginationRef = ref<ComponentPublicInstance | null>(null);

const {
  virtualItems,
  totalSize,
  remeasure,
} = useVirtualTable(
  scrollContainerRef,
  displayData,
  {
    estimateSize: rowHeight,
    overscan: 2, // Reduced from 5 for better performance
    // PERFORMANCE: Disable measureElement to prevent memory leaks
    // Using fixed height improves performance dramatically for large datasets
    // Trade-off: scroll bar may be slightly inaccurate with expanded rows
    measureElement: false,
  },
);

const gridStyles = computed(() => {
  const gridColumnsTemplate = selection.isEnabled.value
    ? getGridTemplateWithCheckbox()
    : gridTemplateColumns.value;

  return {
    display: "grid",
    gridTemplateColumns: gridColumnsTemplate,
    gridAutoRows: "auto", // All rows auto-sized (headers get height from CSS)
    "--v-table-row-h": `${rowHeight}px`,
  };
});

// Handle row click
const onRowClick = (row: TData & FlattenedRow) => {
  emit("row-click", row);
};

// Handle pagination change (page or pageSize)
const handlePaginationChange = ({ page, pageSize }: { page: number, pageSize: number }) => {
  if (!pagination || loading) return; // Prevent changes during loading

  // Scroll to top of table when pagination changes (smooth UX)
  // Only scroll if user is not already at the top (optimization)
  if (scrollContainerRef.value && scrollContainerRef.value.scrollTop > 0) {
    scrollContainerRef.value.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  pageRef.value = page; // sync v-model:page
  expandableLogic.collapseAll();
  emit("request", {
    page,
    pageSize,
    sort: sortStateRef.value,
  });
};

const handleToggleRow = (id: string | number, row: TData & FlattenedRow, column: Column<TData>) => {
  if (!isExpandable.value) return;

  if (expandMode === "controlled") {
    emit("expand-click", {
      row,
      column,
      callback: () => expandableLogic.toggleRow(id),
      expanded: isRowExpanded(row),
    });
  }
  else {
    expandableLogic.toggleRow(id);
    emit("expand-click", {
      row,
      column,
      callback: () => {
      },
      expanded: !isRowExpanded(row),
    });
  }
};

// ============================================
// PERFORMANCE: Ultra-light accessors for expandable tables
// ============================================
// No computed Map, no caching - just direct property access
// This is the fastest possible approach for maximum resize performance

const isRowExpanded = (row: FlattenedRow): boolean => row.isExpanded;
const hasRowChildren = (row: FlattenedRow): boolean => row.hasChildren;

// ── Cell metadata ───────────────────────────────────────────────────────────
// One resolution per cell, cached per row. Provided rather than called from the
// template: TableCell injects it and resolves its own, which is what replaced
// the four calls per cell this template used to make.
const { getCellMetadata } = useTableCellMetadata<TData & FlattenedRow>({
  isExpandable: () => isExpandable.value,
  isRowExpandable: row => expandableLogic.isExpandable(row),
});

provide("tableCellMetadata", getCellMetadata);

// ── Highlight (pinned cross) ────────────────────────────────────────────────
// The boolean | HighlightConfig union is flattened exactly once, here.
// Nothing downstream branches on the prop's type.
const highlightConfig = computed(() => normalizeHighlight(highlight));

const buildHighlightState = (): TableHighlightState<TData> | null => {
  const rowId = highlightApi.pinnedRowId.value;
  const columnKey = highlightApi.pinnedColumnKey.value;
  if (rowId === null && columnKey === null) return null;

  const rowIndex = rowId === null
    ? -1
    : displayData.value.findIndex(r => r.id === rowId);
  const row = rowIndex >= 0 ? displayData.value[rowIndex] : undefined;

  // Resolved from columnsForData every time, so a column hidden via the column
  // picker/setup reports as null without any watcher clearing it. Same path
  // handles a key broadcast by a table whose column set differs from ours.
  const column = columnKey === null
    ? undefined
    : columnsForData.value.find(c => c.key === columnKey);

  const rowPart = row && rowId !== null ? { rowId, rowIndex, row } : null;
  const columnPart = column && columnKey !== null ? { columnKey, column } : null;

  let cellPart: TableHighlightState<TData>["cell"] = null;
  if (rowPart && columnPart) {
    const colIndex = columnsForData.value.indexOf(columnPart.column);
    const meta = getCellMetadata(rowPart.row, columnPart.column, colIndex, rowPart.rowIndex);
    cellPart = {
      value: rowPart.row[columnPart.columnKey],
      formattedValue: String(meta.formattedValue ?? ""),
    };
  }

  return { row: rowPart, column: columnPart, cell: cellPart };
};

// Emitted imperatively from the places that can change it — no watcher, so
// tables without highlight register nothing.
const onHighlightChange = (coord: HighlightCoordinate): void => {
  emit("update:highlight-state", buildHighlightState());
  highlightSync?.broadcast(coord);
};

const highlightApi = useTableHighlight({
  config: highlightConfig,
  onChange: onHighlightChange,
});

const applyRemoteHighlight = (coord: HighlightCoordinate): void => {
  highlightApi.applyRemote(coord);
  // The receiving table reports its own resolved state — for one coordinate
  // each table yields its own column's value.
  emit("update:highlight-state", buildHighlightState());
};

// Called once per rendered row and once per rendered cell; both short-circuit
// on a single null ref read when nothing is pinned.
const isRowPinned = (id: unknown): boolean =>
  highlightApi.isRowPinned(id as string | number | undefined);

// Provided here rather than beside `tableSlots` because highlightConfig does
// not exist yet at that point; provide only has to run during setup.
provide("tableHighlight", {
  columnEnabled: computed(() => highlightConfig.value.column),
  isColumnPinned: highlightApi.isColumnPinned,
  toggleColumn: highlightApi.toggleColumn,
});

// Computed for final rows (considering virtualization)
const rowsToRender = computed(() => {
  // If virtualization is disabled, render all data
  if (!virtualized) {
    return displayData.value.map((row, index) => ({
      row,
      index,
      key: (row.id as string) || index,
      isVirtual: false,
    }));
  }

  // If scroll container is not mounted yet, return empty array to prevent rendering all data
  // This is CRITICAL - without this check, all data will be rendered on first load!
  if (!scrollContainerRef.value) {
    return [];
  }

  // If virtualizer hasn't calculated items yet, wait for it
  if (virtualItems.value.length === 0) {
    return [];
  }

  // Virtualized rendering - only render visible items
  return virtualItems.value.map((virtualRow: VirtualItem) => {
    const row = displayData.value[virtualRow.index];
    return {
      row,
      index: virtualRow.index,
      // CRITICAL: Use row.id as key, not index! Index causes memory leaks
      // because Vue reuses components for different data at same index
      key: (row.id as string | number) || `row-${virtualRow.index}`,
      isVirtual: true,
      virtualRow,
    };
  });
});

const getRowClasses = (row: TData & FlattenedRow, index: number): string => {
  if (!rowClassName) return "";

  if (typeof rowClassName === "string") {
    return rowClassName;
  }

  if (typeof rowClassName === "function") {
    return rowClassName(row, index);
  }

  return "";
};

// Classes for column (fixed with shadow effects)
// Supports both simple columns and groups
const getColumnClasses = (column: Column) => {
  const classes: string[] = [];

  // Check fixed: either direct column.fixed or group fixed (all children fixed)
  const fixedDirection = column.fixed || (hasGroups.value ? isGroupFixed(column) : null);

  if (fixedDirection) {
    classes.push("v-table-fixed-column");

    // Add direction class for fixed
    if (fixedDirection === "left") {
      classes.push("v-table-fixed-left");
    }
    else if (fixedDirection === "right") {
      classes.push("v-table-fixed-right");
    }

    // Shadow for last left column
    if (isLastLeftFixed(column.key)) {
      classes.push("v-table-fixed-left-last");
    }

    // Shadow for first right column
    if (isFirstRightFixed(column.key)) {
      classes.push("v-table-fixed-right-first");
    }
  }

  // One insertion covers all three call sites: header, data cells and the total
  // row — so the vertical ribbon runs through the whole column.
  if (highlightApi.isColumnPinned(column.key)) {
    classes.push("v-table-cell--pinned-col");
  }

  return classes;
};

// Get fixed styles for group headers
const getGroupFixedStyles = (column: Column) => {
  const fixed = isGroupFixed(column);
  if (!fixed) return {};

  // For groups, we need to calculate offset based on leaf columns
  return getFixedStyles(column);
};

// Computed for header component with proper typing
const headerComponent = computed<Component>(() => {
  return hasGroups.value ? TableHeaderGrouped : TableHeaderSimple;
});

// Computed for header columns data
const headerColumnsData = computed<Column[] | HeaderCell[][]>(() => {
  return hasGroups.value ? headerLevels.value : columnsForData.value;
});

// ── Fullscreen ──────────────────────────────────────────────────────────────
// Opt-out, unlike the other toolbar actions: shown whenever the toolbar is on.
const fullscreenEnabled = computed<boolean>(() =>
  toolbarEnabled.value && toolbar?.actions?.fullscreen !== false,
);

const {
  isFullscreen,
  zIndex: fullscreenZIndex,
  placeholderStyle,
  panelStyle: fullscreenPanelStyle,
  contentHeight: fullscreenContentHeight,
  toggle: toggleFullscreen,
} = useTableFullScreen({
  wrapperRef,
  placeholderRef,
  // Toolbar and pagination are already rendered and identical in both modes, so
  // the composable measures them before `isFullscreen` flips — contentHeight is
  // a final px value on the very first fullscreen render.
  chromeRefs: [toolbarSlotRef, paginationRef],
  isEnabled: fullscreenEnabled,
  // The scroll container's height changed the instant the fullscreen class
  // applied, so the virtualizer's cached rect is stale. Scroll position is not
  // preserved across the toggle, so reset to top and force a remeasure rather
  // than waiting for the user's next scroll to reveal rows.
  onToggle: () => {
    const el = scrollContainerRef.value;
    if (el) {
      el.scrollTop = 0;
      el.scrollLeft = 0;
    }
    remeasure();
  },
});

// ── Linked tables ───────────────────────────────────────────────────────────
const onScrollContainerScroll = (event: Event) => {
  if (!scrollSync) return;
  const el = event.target as HTMLElement;
  scrollSync.onScroll(el.scrollLeft, el.scrollTop);
};

onMounted(() => {
  highlightSync?.register(applyRemoteHighlight);

  if (scrollSync && scrollContainerRef.value) {
    scrollSync.register(scrollContainerRef.value);
  }
});

// Registered conditionally: a table created without `highlight` gets no watcher
// at all. This is the documented caveat on the prop — the *input* direction of
// v-model:highlight-state needs highlight enabled at creation, like scrollSync.
if (highlightConfig.value.enabled) {
  watch(() => highlightState, (state) => {
    const rowId = state?.row?.rowId ?? null;
    const columnKey = state?.column?.columnKey ?? null;
    // Ignore the echo of our own emit
    if (rowId === highlightApi.pinnedRowId.value
      && columnKey === highlightApi.pinnedColumnKey.value) return;
    highlightApi.setPin({ rowId, columnKey });
  });

  // `highlight` can flip at runtime (:highlight="isOn && cfg"), unlike
  // scrollSync. A pin left behind would stay in highlightState with nothing
  // on screen.
  watch(highlightConfig, (cfg) => {
    if (!cfg.enabled) {
      highlightApi.clear();
      return;
    }
    if (!cfg.row) highlightApi.unpinRow();
    if (!cfg.column) highlightApi.unpinColumn();
  });
}

// CRITICAL: Cleanup on unmount to prevent memory leaks
onUnmounted(() => {
  // Clear expanded rows to free memory
  if (expandableLogic) {
    expandableLogic.collapseAll();
  }
  scrollSync?.unregister();
  highlightSync?.unregister();
  // Clear scroll container ref
  scrollContainerRef.value = null;
});
</script>

<template>
  <!-- Reserves the wrapper's original slot in the page while it is fixed and
       teleported. Without it the surrounding layout collapses on enter and
       exit has no stable target to animate back to. -->
  <div
    v-if="placeholderStyle"
    ref="placeholderRef"
    :style="placeholderStyle"
    aria-hidden="true"
    class="v-table-fullscreen-placeholder"
  />

  <TableBackdrop
    :active="isFullscreen"
    :z-index="fullscreenZIndex - 1"
    @click="toggleFullscreen"
  />

  <Teleport
    :disabled="!isFullscreen"
    to="body"
  >
    <div
      ref="wrapperRef"
      :class="{
        'v-table-wrapper--with-toolbar': toolbarEnabled,
        'v-table-wrapper--fullscreen': isFullscreen,
      }"
      :style="isFullscreen ? { ...fullscreenPanelStyle, zIndex: fullscreenZIndex } : undefined"
      class="v-table-wrapper"
    >
      <TableFullscreenToggle
        v-if="fullscreenEnabled"
        :is-fullscreen="isFullscreen"
        @toggle="toggleFullscreen"
      />

      <!-- Toolbar section -->
      <div
        v-if="toolbarEnabled"
        ref="toolbarSlotRef"
        class="v-table-toolbar-slot"
      >
        <!-- Custom toolbar via slot -->
        <slot
          v-if="$slots.toolbar"
          name="toolbar"
        />

        <!-- Props-based toolbar -->
        <TableToolbar
          v-else-if="toolbar?.enabled"
          v-model:search="searchModel"
          :config="toolbar"
          @export="handleToolbarExport"
          @refresh="handleToolbarRefresh"
          @reset-sort="handleToolbarResetSort"
        >
          <!-- Column picker + column setup share the toolbar's single
             #column-setup slot; the picker renders first, to its left. -->
          <template #column-setup>
            <VFloating
              v-if="columnPickerConfig"
              ref="columnPickerPopoverRef"
              :offset="8"
              content-class="rounded-xl"
              placement="bottom-right"
              unstyled
            >
              <template #trigger>
                <VButton
                  icon="lucide:columns"
                  variant="primary"
                />
              </template>

              <template #content>
                <TableColumnPicker
                  :columns="effectiveColumns"
                  :groups="columnPickerConfig.groups"
                  :loading="columnPickerConfig.loading"
                  :original-columns="columns"
                  :storage-key="columnPickerConfig.key"
                  :storage-type="columnPickerConfig.type"
                  @close="handleColumnPickerClose"
                  @update:visible-columns="handleVisibleColumnsUpdate"
                />
              </template>
            </VFloating>

            <VFloating
              v-if="columnSetupEnabled"
              ref="columnSetupPopoverRef"
              :offset="8"
              content-class="rounded-xl"
              placement="bottom-right"
              unstyled
            >
              <template #trigger>
                <VButton
                  icon="lucide:table-2"
                  variant="primary"
                />
              </template>

              <template #content>
                <TableColumnSetup
                  :columns="columns"
                  :config="columnSetupConfig"
                  @close="handleColumnSetupClose"
                  @update:visible-columns="handleVisibleColumnsUpdate"
                />
              </template>
            </VFloating>
          </template>
        </TableToolbar>
      </div>

      <!-- Loading state -->
      <div class="v-table-container-wrapper">
        <!-- Empty State (positioned over scroll container) -->
        <TableEmptyState
          v-if="displayData.length === 0"
          description="Try adjusting your filters or search criteria"
          icon="lucide:inbox"
          title="No data to display"
        >
          <slot name="empty-state" />
        </TableEmptyState>

        <!-- Loading Overlay -->
        <TableLoadingOverlay :loading />

        <!-- Scroll container -->
        <div
          ref="scrollContainerRef"
          :class="{ 'v-table-scroll-container--loading': loading }"
          :style="{
            height: isFullscreen ? fullscreenContentHeight : tableHeight,
            overscrollBehavior: 'contain',
          }"
          class="v-table-scroll-container v-table-scrollbar-styled"
          @scroll="onScrollContainerScroll"
        >
          <div
            :class="{
              'v-is-resizing': isResizing,
              'v-table-grid--highlight': highlightConfig.enabled,
            }"
            :style="gridStyles"
            class="v-table-grid"
          >
            <component
              :is="headerComponent"
              :columns="headerColumnsData"
              :get-column-classes="getColumnClasses"
              :get-fixed-styles="getFixedStyles"
              :get-group-fixed-styles="getGroupFixedStyles"
              :get-group-width="getGroupWidth"
              :get-sort-state="getSortState"
              :is-column-resizable="isColumnResizable"
              @resize-start="startResize"
              @resize-dblclick="autoFitColumn"
              @sort-click="handleSortClick"
            >
              <!-- Checkbox header slot - always render when multi-select enabled -->
              <template
                v-if="selection.isEnabled.value"
                #checkbox-header
              >
                <TableHeaderCheckbox
                  v-if="multiSelectConfig?.showHeaderCheckbox !== false"
                  :state="selection.getHeaderCheckboxState()"
                  @toggle="selection.toggleAllRows"
                />
                <!-- Empty header cell when checkbox is hidden -->
                <div
                  v-else
                  class="v-table-header-checkbox-cell v-table-header-checkbox-cell--empty"
                />
              </template>

              <!-- Forward custom header icon slots -->
              <template
                v-for="column in columnsForData"
                #[`header-icon-${column.key}`]="slotProps"
              >
                <slot
                  :name="`header-icon-${column.key}`"
                  v-bind="slotProps"
                />
              </template>

              <!-- Forward custom header slots -->
              <template
                v-for="column in columnsForData"
                #[`header-${column.key}`]="slotProps"
              >
                <slot
                  :name="`header-${column.key}`"
                  v-bind="slotProps"
                />
              </template>
            </component>

            <!-- Virtualization: spacer before -->
            <div
              v-if="virtualized && virtualItems.length > 0 && virtualItems[0]"
              :style="{ height: `${virtualItems[0].start}px` }"
              class="v-table-virtual-spacer"
            />

            <!-- Table rows (universal rendering) -->
            <TableRow
              v-for="item in rowsToRender"
              :key="item.key"
              :class="{
                'v-table-row-wrapper--pinned': isRowPinned(item.row.id),
                'v-table-row-wrapper--virtual': item.isVirtual,
              }"
              @click="onRowClick(item.row)"
            >
              <!-- Checkbox column (separate) -->
              <TableCheckboxCell
                v-if="selection.isEnabled.value"
                :checked="selection.isRowSelected(item.row.id as string | number)"
                :class="getRowClasses(item.row, item.index)"
                :data-custom-row="getRowClasses(item.row, item.index) ? 'true' : undefined"
                :disabled="!selection.isRowSelectable(item.row)"
                :indeterminate="selection.isDependentMode.value &&
                  hasRowChildren(item.row) &&
                  selection.getParentCheckboxState(item.row) === 'indeterminate'"
                @toggle="selection.toggleRow(item.row)"
              />

              <!-- Data cells -->
              <TableCell
                v-for="(column, colIndex) in columnsForData"
                :key="`${item.key}-${column.key}`"
                :align="column.align"
                :class="[getColumnClasses(column), getRowClasses(item.row, item.index)]"
                :col-index="colIndex"
                :column
                :data-custom-row="getRowClasses(item.row, item.index) ? 'true' : undefined"
                :depth="(item.row.depth as number) || 0"
                :is-expanded="item.row.isExpanded"
                :row="item.row"
                :row-index="item.index"
                :style="getFixedStyles(column)"
                @toggle-expand="handleToggleRow(item.row.id as string | number, item.row, column)"
              >
                <!--
                  The cell resolves its own class, style, indent, title and value
                  from the injected metadata — passing row/column is what puts it
                  in that mode. Only the two things VTable alone knows are handed
                  down: the row pin, and the consumer's `#cell-<key>` override.
                -->
                <template #pin>
                  <TablePinButton
                    v-if="highlightConfig.row && colIndex === 0"
                    :pinned="isRowPinned(item.row.id)"
                    label="row"
                    @toggle="highlightApi.toggleRow(item.row.id as string | number)"
                  />
                </template>

                <!--
                  Guarded so an absent override leaves TableCell's own default in
                  place: passing the slot unconditionally would hand it an
                  always-truthy slot function and suppress the fallback, taking
                  the title attribute with it.
                -->
                <template
                  v-if="$slots[`cell-${column.key}`]"
                  #default
                >
                  <slot
                    :column="column"
                    :depth="item.row.depth || 0"
                    :index="item.index"
                    :name="`cell-${column.key}`"
                    :row="item.row"
                    :value="item.row[column.key]"
                  />
                </template>
              </TableCell>
            </TableRow>

            <!-- Virtualization: spacer after -->
            <div
              v-if="virtualized && virtualItems.length > 0 &&
                virtualItems[virtualItems.length - 1]"
              :style="{
                height: `${totalSize - virtualItems[virtualItems.length - 1].end}px`
              }"
              class="v-table-virtual-spacer"
            />

            <!-- Total Row (sticky bottom inside grid) -->
            <template v-if="shouldShowTotal && totalRow">
              <!-- Empty checkbox cell for total row -->
              <div
                v-if="selection.isEnabled.value"
                class="v-table-total-cell v-table-checkbox-cell"
              />
              <TableCell
                v-for="(column, colIndex) in columnsForData"
                :key="`total-${column.key}`"
                :align="column.align"
                :class="getColumnClasses(column)"
                :style="getFixedStyles(column)"
                class="v-table-total-cell"
              >
                <div class="v-table-total-content">
                  <!-- Spacer instead of expand button for first column -->
                  <div
                    v-if="colIndex === 0 && isExpandable"
                    class="v-table-total-spacer"
                  />

                  <!-- Total cell content -->
                  <div
                    :class="{ 'v-table-total-text--truncate': !column.interactive }"
                    class="v-table-total-text"
                  >
                    <slot
                      :column="column"
                      :name="`total-cell-${column.key}`"
                      :row="totalRow"
                      :value="totalRow[column.key]"
                    >
                      <!-- Default rendering with formatter -->
                      <span
                        :class="getCellClass(totalRow[column.key], column, totalRow)"
                        :title="!column.interactive
                          ? String(getCellValue(totalRow[column.key], column, totalRow))
                          : undefined"
                      >
                        {{ getCellValue(totalRow[column.key], column, totalRow) }}
                      </span>
                    </slot>
                  </div>
                </div>
              </TableCell>
            </template>
          </div>
        </div>
      </div>

      <!-- Pagination (only for server-side) -->
      <TablePagination
        v-if="pagination"
        ref="paginationRef"
        :loading="loading"
        :page="pageRef"
        :page-size="pagination.pageSize"
        :page-size-options="pagination.pageSizeOptions || [10, 25, 50, 100]"
        :show-size-changer="pagination.showSizeChanger"
        :total="pagination.total"
        @page-change="handlePaginationChange"
      />
    </div>
  </Teleport>
</template>

<!--
  Unscoped on purpose. `table.scss` composes the partial set under
  assets/styles/, and those rules have to reach elements this component does not
  own: the cells rendered by TableCell, the header rendered by TableHeader, the
  bar rendered by TablePagination. Scoping would attach VTable's data attribute
  to none of them, and every subcomponent would render unstyled — which is also
  why a screenshot of one of them in isolation needs this component imported.
-->
<style lang="scss">
@use './assets/styles/table.scss';
</style>
