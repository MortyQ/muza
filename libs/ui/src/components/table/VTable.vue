<script lang="ts" setup>
import { type ComputedRef, ref, computed, watch, onUnmounted, useSlots, provide, inject, type Component } from "vue";

import type { VirtualItem } from "@tanstack/vue-virtual";

import { VButton, VFloating, VIcon, VLoader } from "../../index";

import TableCell from "./components/TableCell.vue";
import TableCheckboxCell from "./components/TableCheckboxCell.vue";
import TableColumnSetup from "./components/TableColumnSetup.vue";
import TableEmptyState from "./components/TableEmptyState.vue";
import TableHeaderCheckbox from "./components/TableHeaderCheckbox.vue";
import TableHeaderGrouped from "./components/TableHeaderGrouped.vue";
import TableHeaderSimple from "./components/TableHeaderSimple.vue";
import TablePagination from "./components/TablePagination.vue";
import TableRow from "./components/TableRow.vue";
import TableToolbar from "./components/TableToolbar.vue";
import { useColumnResize } from "./composables/useColumnResize";
import { useExpandableTable } from "./composables/useExpandableTable";
import { useFixedColumns } from "./composables/useFixedColumns";
import { useGroupedHeaders } from "./composables/useGroupedHeaders";
import { useTableFormatters } from "./composables/useTableFormatters";
import { TABLE_PAGE_KEY } from "./composables/useTablePage";
import { useTableSelection } from "./composables/useTableSelection";
import { useTableSort } from "./composables/useTableSort";
import { useVirtualTable } from "./composables/useVirtualTable";
import type { Column, ExpandableRow, FlattenedRow, HeaderCell } from "./types/index";
import type { TableEmits, TableProps } from "./types/props";
import tableStorage from "./utils/storage";

const props = withDefaults(defineProps<TableProps>(), {
  loading: false,
  virtualized: true,
  rowHeight: 50,
  expandMode: "auto",
  sort: () => ({ type: "server", multiple: true }),
  toolbar: undefined,
  search: "",
});

const emit = defineEmits<TableEmits>();

const $slots = useSlots();

// Interface for formatted cell values
interface FormattedCell {
  text?: unknown
  class?: string
}

interface SavedColumnState {
  visible: string[]
  order: string[]
  fixed?: Record<string, "left" | "right">
}

// Provide slots to deeply nested components (avoid prop drilling)
// This is the recommended Vue approach used by Element Plus, Ant Design Vue, etc.
provide("tableSlots", {
  headerCellCustomAction: $slots["header-cell-custom-action"],
  toolbarTitle: $slots["toolbar-title"],
  toolbarSearch: $slots["toolbar-search"],
  toolbarActions: $slots["toolbar-actions"],
});

const searchModel = defineModel<string>("search");

// Toolbar enabled check
const toolbarEnabled = computed(() => {
  return props.toolbar?.enabled || $slots.toolbar;
});

// Toolbar event handlers
const handleToolbarRefresh = () => {
  // Always emit the event so parent can listen to it
  emit("toolbar:refresh");

  // Check refresh action mode from config
  const refreshMode = props.toolbar?.actions?.refresh;

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
    page: props.pagination?.page ?? 1,
    pageSize: props.pagination?.pageSize ?? 10,
    sort: [],
  });
};

const handleToolbarResetSort = () => {
  // Always emit the event so parent can listen to it
  emit("toolbar:reset-sort");

  // Check reset sort action mode from config
  const resetSortMode = props.toolbar?.actions?.resetSort;

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
    page: props.pagination?.page ?? 1,
    pageSize: props.pagination?.pageSize ?? 10,
    sort: [],
  });
};

const handleToolbarExport = (format: string, selectedOnly?: boolean) => {
  emit("toolbar:export", format, selectedOnly);
};

// Column Setup Logic - basic check without hasGroups (will be checked later)
const columnSetupEnabledBasic = computed(() => {
  const setup = props.toolbar?.actions?.columnSetup;
  // Enabled if string or object (not false, not undefined)
  return typeof setup === "string" || typeof setup === "object";
});

const columnSetupConfig = computed<{
  key?: string
  type?: "indexedDB" | "localStorage" | "sessionStorage"
  allowReorder?: boolean
  initialVisible?: string[]
}>(() => {
  const setup = props.toolbar?.actions?.columnSetup;

  // String shorthand: use as storage key with defaults
  if (typeof setup === "string") {
    return {
      key: setup,
      type: "indexedDB" as const,
      allowReorder: true,
    };
  }

  // Object: use as-is, with type defaults
  if (typeof setup === "object") {
    return {
      ...setup,
      type: setup.type || "indexedDB", // Default to indexedDB
    };
  }

  return {};
});

// Helper: Load saved column state from storage (async)
const loadColumnsFromStorage = async (): Promise<Column[] | null> => {
  if (!columnSetupEnabledBasic.value) return null;

  const config = columnSetupConfig.value;

  const hasStorageKey = !!config.key;
  let loaded: SavedColumnState | null = null;

  if (hasStorageKey) {
    try {
      // Set storage type if specified
      if (config.type) {
        tableStorage.setStorageType(config.type);
      }
      // Load from storage (IndexedDB by default)
      loaded = await tableStorage.getTableConfig<SavedColumnState>(config.key!);
    }
    catch (e) {
      console.warn("Failed to load stored column setup", e);
    }
  }

  // If we have a persisted state – build columns from it
  // If we have a persisted state – build columns from it
  if (loaded) {
    const flatten = (cols: Column[]): Column[] =>
      cols.flatMap(c => (c.children && c.children.length ? flatten(c.children) : [c]));
    const flat = flatten(props.columns);
    const map = new Map(flat.map(c => [c.key, c]));
    const result: Column[] = [];
    const savedFixed = loaded.fixed;

    loaded.order.forEach((key) => {
      if (loaded!.visible.includes(key)) {
        const col = map.get(key);
        if (col) {
          // Apply saved fixed state if exists
          result.push({
            ...col,
            fixed: savedFixed?.[key] || col.fixed,
          });
        }
      }
    });
    // Fallback: if for some reason result empty but visible list not empty, build from visible list
    if (!result.length && loaded.visible.length) {
      loaded.visible.forEach((key) => {
        const col = map.get(key);
        if (col) {
          result.push({
            ...col,
            fixed: savedFixed?.[key] || col.fixed,
          });
        }
      });
    }
    return result.length ? result : null;
  }

  // No persisted state: apply initialVisible if provided
  const initial = Array.isArray(config.initialVisible) ? config.initialVisible : null;
  if (initial) {
    // Preserve original column order; ignore unknown keys
    const filtered = props.columns.filter(c => initial.includes(c.key));
    // If initialVisible is an empty array => return empty to hide all columns explicitly.
    if (initial.length === 0) return [];
    return filtered.length ? filtered : null; // null => fall back to all columns if none matched
  }

  return null; // use all columns by default
};

// Visible columns - managed by TableColumnSetup component
// Initialize with saved state from storage if available
const visibleColumns = ref<Column[] | null>(null);
const columnSetupPopoverRef = ref<{ close: () => void } | null>(null);

// Load columns from storage asynchronously
loadColumnsFromStorage().then((columns) => {
  if (columns !== null) {
    visibleColumns.value = columns;
  }
});

const handleVisibleColumnsUpdate = (columns: Column[]) => {
  visibleColumns.value = [...columns]; // Create new array to trigger reactivity
};

const handleColumnSetupClose = () => {
  columnSetupPopoverRef.value?.close();
};

// Use visible columns if column setup is enabled, otherwise use all columns
const effectiveColumns = computed(() => {
  if (!columnSetupEnabledBasic.value) {
    return props.columns;
  }
  // If column setup is enabled but not yet initialized, use props.columns temporarily
  return visibleColumns.value ?? props.columns;
});

// Total row visibility - simply check for presence
const shouldShowTotal = computed(() => props.totalRow !== undefined);

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
  if (!props.height) {
    return "600px"; // Default height
  }

  // If number - add 'px'
  if (typeof props.height === "number") {
    return `${props.height}px`;
  }

  // If string - use as is (supports: '100%', '50vh', 'calc(...)')
  return props.height;
});

// Sort logic - must be before dataToDisplay usage
const sortStateRef = computed({
  get: () => props.sortState || [],
  set: val => emit("update:sort-state", val),
});

// ── Page state — supports 3 modes ───────────────────────────────────
// mode 1: @request          — no v-model:page, no useTablePage
// mode 2: v-model:page      — props.page is bound, synced via emit
// mode 3: useTablePage      — page ref injected from parent composable
const injectedPage = inject(TABLE_PAGE_KEY, null);

const pageRef = computed({
  get: () => props.page ?? injectedPage?.value ?? props.pagination?.page ?? 1,
  set: (val) => {
    if (props.page !== undefined) {
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
  sort: props.sort,
  sortState: sortStateRef,
  columns: columnsRef,
  page: computed(() => props.pagination?.page),
  pageSize: computed(() => props.pagination?.pageSize),
  data: computed(() => props.data), // Pass data for frontend sorting
  onRequest: (payload) => {
    pageRef.value = payload.page; // sync v-model:page (sort resets to page 1)
    expandableLogic.collapseAll();
    emit("request", payload);
  },
  onSort: payload => emit("sort", payload),
  onUpdateSortState: sortState => emit("update:sort-state", sortState),
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
  const source = props.sort?.type === "front" ? sortedData.value : props.data;

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
const displayData = computed(() => {
  return isExpandable.value
    ? expandableLogic.flattenedData.value
    : dataToDisplay.value;
});

// Multi-select logic
const multiSelectConfig = computed(() => props.multiSelect);
const selectedRowsRef = computed({
  get: () => props.selectedRows || [],
  set: value => emit("update:selected-rows", value),
});

const selection = useTableSelection({
  config: multiSelectConfig,
  flattenedData: displayData as unknown as ComputedRef<FlattenedRow[]>,
  selectedRows: selectedRowsRef,
  onSelectionChange: (selected) => {
    emit("update:selected-rows", selected);
  },
});

// Virtualization with dynamic height for expand
const scrollContainerRef = ref<HTMLElement | null>(null);

const {
  virtualItems,
  totalSize,
} = useVirtualTable(
  scrollContainerRef,
  displayData,
  {
    estimateSize: props.rowHeight,
    overscan: 2, // Reduced from 5 for better performance
    // PERFORMANCE: Disable measureElement to prevent memory leaks
    // Using fixed height improves performance dramatically for large datasets
    // Trade-off: scroll bar may be slightly inaccurate with expanded rows
    measureElement: false,
  },
);

const gridStyles = computed(() => {
  const columns = selection.isEnabled.value
    ? getGridTemplateWithCheckbox(50) // 50px for checkbox column
    : gridTemplateColumns.value;

  return {
    display: "grid",
    gridTemplateColumns: columns,
    gridAutoRows: "auto", // All rows auto-sized (headers get height from CSS)
  };
});

// Handle row click
const onRowClick = (row: Record<string, unknown>) => {
  emit("row-click", row);
};

// Handle pagination change (page or pageSize)
const handlePaginationChange = ({ page, pageSize }: { page: number, pageSize: number }) => {
  if (!props.pagination || props.loading) return; // Prevent changes during loading

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

const handleToggleRow = (id: string | number, row: ExpandableRow, column: Column) => {
  if (!isExpandable.value) return;

  if (props.expandMode === "controlled") {
    // Controlled mode: emit event with callback, parent controls expansion
    emit("expand-click", {
      row,
      column,
      callback: () => expandableLogic.toggleRow(id),
      expanded: isRowExpanded(row as Record<string, unknown>),
    });
  }
  else {
    // Auto mode (default): toggle immediately, emit for notification
    expandableLogic.toggleRow(id);
    emit("expand-click", {
      row,
      column,
      callback: () => {
      }, // Already toggled, callback is no-op
      expanded: !isRowExpanded(row as Record<string, unknown>), // New state after toggle
    });
  }
};

// ============================================
// PERFORMANCE: Ultra-light accessors for expandable tables
// ============================================
// No computed Map, no caching - just direct property access
// This is the fastest possible approach for maximum resize performance

// Direct property access - no overhead
const isRowExpanded = (row: Record<string, unknown>): boolean => {
  return (row.isExpanded as boolean) || false;
};

const hasRowChildren = (row: Record<string, unknown>): boolean => {
  return (row.hasChildren as boolean) || false;
};

// ============================================
// PERFORMANCE OPTIMIZATION: Unified Cell Metadata
// ============================================
// All cell-related calculations in ONE function to minimize overhead
// Uses WeakMap for aggressive caching - calculated once per row

interface CellMetadata {
  formattedValue: unknown
  cssClass: string | undefined
  titleText: string | undefined
  indentStyle: { paddingLeft: string } | null
  customStyle: Record<string, string> | undefined
  isExpandable: boolean
}

const cellMetadataCache = new WeakMap<Record<string, unknown>, Map<string, CellMetadata>>();

// UNIFIED cell data calculator - replaces 5 separate function calls
const getCellMetadata = (
  row: Record<string, unknown>,
  column: Column,
  colIndex: number,
  rowIndex: number,
): CellMetadata => {
  // Get or create row cache
  let rowCache = cellMetadataCache.get(row);
  if (!rowCache) {
    rowCache = new Map();
    cellMetadataCache.set(row, rowCache);
  }

  // Check cache - include cellClass/cellStyle in cache key for proper invalidation
  const cacheKey = `${column.key}-${!!column.cellClass}-${!!column.cellStyle}`;
  const cached = rowCache.get(cacheKey);
  if (cached) return cached;

  // Calculate all metadata ONCE
  const formatted = column.format
    ? formatCellValue(row[column.key], column, row)
    : row[column.key];

  // Extract value and class from formatted result
  let formattedValue = formatted;
  let cssClass: string | undefined;

  if (
    formatted
    && typeof formatted === "object"
    && !Array.isArray(formatted)
    && "text" in formatted
  ) {
    formattedValue = (formatted as FormattedCell).text;
    cssClass = (formatted as FormattedCell).class;
  }

  // Custom cellClass from column definition (best practice)
  if (column.cellClass) {
    const customClass = column.cellClass({ value: row[column.key], row, rowIndex });
    if (customClass) {
      cssClass = cssClass ? `${cssClass} ${customClass}` : customClass;
    }
  }

  // Custom cellStyle from column definition (best practice)
  const customStyle = column.cellStyle
    ? column.cellStyle({ value: row[column.key], row, rowIndex })
    : undefined;

  // Title for non-interactive cells
  const titleText = !column.interactive ? String(formattedValue) : undefined;

  // Indent style for first column with depth
  const depth = (row.depth as number) || 0;
  const indentStyle = colIndex === 0 && depth
    ? { paddingLeft: `${depth * 24 + 16}px` }
    : null;

  // Check if row is expandable (only for first column)
  const isExpandableRow = colIndex === 0 && isExpandable.value
    ? expandableLogic.isExpandable(row as ExpandableRow)
    : false;

  const metadata: CellMetadata = {
    formattedValue,
    cssClass,
    titleText,
    indentStyle,
    customStyle,
    isExpandable: isExpandableRow,
  };

  // Cache it with the same key
  rowCache.set(cacheKey, metadata);

  return metadata;
};

// Computed for final rows (considering virtualization)
const rowsToRender = computed(() => {
  // If virtualization is disabled, render all data
  if (!props.virtualized) {
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
      key: (row?.id as string | number) || `row-${virtualRow.index}`,
      isVirtual: true,
      virtualRow,
    };
  });
});

// Styles for virtualized rows
const getRowStyles = (item: { isVirtual: boolean }) => {
  if (!item.isVirtual) return {};
  return {
    height: `${props.rowHeight}px`,
    minHeight: `${props.rowHeight}px`,
  };
};

// Classes for table rows (custom styling based on row data)
const getRowClasses = (row: ExpandableRow, index: number): string => {
  if (!props.rowClassName) return "";

  if (typeof props.rowClassName === "string") {
    return props.rowClassName;
  }

  if (typeof props.rowClassName === "function") {
    return props.rowClassName(row, index);
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

// CRITICAL: Cleanup on unmount to prevent memory leaks
onUnmounted(() => {
  // Clear expanded rows to free memory
  if (expandableLogic) {
    expandableLogic.collapseAll();
  }
  // Clear scroll container ref
  scrollContainerRef.value = null;
});
</script>

<template>
  <div
    :class="{ 'v-table-wrapper--with-toolbar': toolbarEnabled }"
    class="v-table-wrapper"
  >
    <!-- Toolbar section -->
    <div
      v-if="toolbarEnabled"
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
        <!-- Column Setup Dropdown -->
        <template
          v-if="columnSetupEnabled"
          #column-setup
        >
          <VFloating
            ref="columnSetupPopoverRef"
            :offset="8"
            placement="bottom-right"
            unstyled
          >
            <template #trigger>
              <VButton
                icon="lucide:table-2"
                variant="link"
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
      <Transition name="fade">
        <div
          v-if="loading"
          class="v-table-loading-overlay"
        >
          <div class="v-table-loading-backdrop" />
          <div class="v-table-loading-spinner">
            <VLoader
              size="lg"
              variant="primary"
            />
          </div>
        </div>
      </Transition>

      <!-- Scroll container -->
      <div
        ref="scrollContainerRef"
        :class="{ 'v-table-scroll-container--loading': loading }"
        :style="{ height: tableHeight, overscrollBehavior: 'contain' }"
        class="v-table-scroll-container v-table-scrollbar-styled"
      >
        <div
          :class="{ 'v-is-resizing': isResizing }"
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
            v-if="props.virtualized && virtualItems.length > 0 && virtualItems[0]"
            :style="{ height: `${virtualItems[0].start}px` }"
            class="v-table-virtual-spacer"
          />

          <!-- Table rows (universal rendering) -->
          <TableRow
            v-for="item in rowsToRender"
            :key="item.key"
            :style="getRowStyles(item)"
            @click="onRowClick(item.row)"
          >
            <!-- Checkbox column (separate) -->
            <TableCheckboxCell
              v-if="selection.isEnabled.value"
              :checked="selection.isRowSelected(item.row.id as string | number)"
              :class="getRowClasses(item.row, item.index)"
              :data-custom-row="getRowClasses(item.row, item.index) ? 'true' : undefined"
              :disabled="!selection.isRowSelectable(item.row as ExpandableRow)"
              :indeterminate="selection.isDependentMode.value &&
                hasRowChildren(item.row) &&
                selection.getParentCheckboxState(item.row as any) === 'indeterminate'"
              @toggle="selection.toggleRow(item.row as any)"
            />

            <!-- Data cells -->
            <TableCell
              v-for="(column, colIndex) in columnsForData"
              :key="`${item.key}-${column.key}`"
              :align="column.align"
              :class="[
                getColumnClasses(column),
                getCellMetadata(item.row, column, colIndex, item.index).cssClass,
                getRowClasses(item.row, item.index)
              ]"
              :data-custom-row="getRowClasses(item.row, item.index) ? 'true' : undefined"
              :depth="(item.row.depth as number) || 0"
              :style="{
                ...getFixedStyles(column),
                ...getCellMetadata(item.row, column, colIndex, item.index).customStyle
              }"
            >
              <div
                :style="getCellMetadata(item.row, column, colIndex, item.index).indentStyle"
                class="v-table-cell-content"
              >
                <!-- Expand button only for first column -->
                <button
                  v-if="isExpandable &&
                    getCellMetadata(item.row, column, colIndex, item.index).isExpandable"
                  class="v-table-cell-expand-btn"
                  @click.stop="handleToggleRow(item.row.id as string | number, item.row, column)"
                >
                  <VIcon
                    :icon="item.row.isExpanded ? 'mdi:chevron-down' : 'mdi:chevron-right'"
                    :size="18"
                  />
                </button>

                <!-- Column content (universal for all) -->
                <div
                  :class="{ 'v-table-cell-text--truncate': !column.interactive }"
                  class="v-table-cell-text"
                >
                  <slot
                    :column="column"
                    :depth="item.row.depth || 0"
                    :index="item.index"
                    :name="`cell-${column.key}`"
                    :row="item.row"
                    :value="item.row[column.key]"
                  >
                    <!-- Default rendering with formatter -->
                    <span
                      :title="getCellMetadata(item.row, column, colIndex, item.index).titleText"
                    >
                      {{ getCellMetadata(item.row, column, colIndex, item.index).formattedValue }}
                    </span>
                  </slot>
                </div>
              </div>
            </TableCell>
          </TableRow>

          <!-- Virtualization: spacer after -->
          <div
            v-if="props.virtualized && virtualItems.length > 0 &&
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
      :loading="loading"
      :page="pageRef"
      :page-size="pagination.pageSize"
      :page-size-options="pagination.pageSizeOptions || [10, 25, 50, 100]"
      :show-size-changer="pagination.showSizeChanger"
      :total="pagination.total"
      @page-change="handlePaginationChange"
    />
  </div>
</template>

<style lang="scss">
@use './assets/styles/table.scss';
</style>
