import type { ComputedRef, MaybeRefOrGetter, Ref } from "vue";

import type { ColumnFormatOptions } from "./format";

// Export toolbar types
export * from "./toolbar";

// Formatter types live in their own module so toolbar.ts can import them
// without importing this file back.
export * from "./format";

// Cell context for cellClass and cellStyle functions
// Provides named parameters for better developer experience
export interface CellContext<T = Record<string, unknown>> {
  value: unknown // Cell value
  row: T // Full row data
  rowIndex: number // Row index in current view
}

// Header context for onHeaderClick callback
// Provides information about the clicked header
// Note: Column type is used here but defined below - TypeScript allows this for interfaces
export interface HeaderContext {
  column: Column // Column definition (full access to all column properties)
  columnKey: string // Column key (shorthand for column.key)
  event: MouseEvent // Native click event for advanced use cases
}

// Callbacks are method signatures, not function-typed properties, on purpose: method parameters
// are checked bivariantly, which is what lets a `Column<Product>` sit wherever the table's
// internals take a plain `Column`. The table only ever calls a column's callbacks with rows from
// the `data` that column came with, so the unsoundness bivariance allows cannot happen here.
export interface Column<TData = Record<string, unknown>> {
  key: string // Key from data object
  label: string // Header text
  width?: string | "flex" // Fixed width (e.g., "150px") - makes column resizable. Without width, column is flexible (not resizable)
  align?: "left" | "center" | "right" | string
  interactive?: boolean // Whether column contains interactive elements (select, dropdown, etc.)
  fixed?: "left" | "right" // Fix column (sticky) to left or right
  children?: Column<TData>[] // Nested columns for grouped headers (AG-Grid style)
  sortable?: boolean // Enable sorting for this column
  sortValue?(row: TData, key: string): unknown

  // Type icon badge, shown in the column picker (same values as ColumnPickerItem.icon)
  icon?: string

  // Formatting options (mutually exclusive - only one should be used)
  format?: ColumnFormatOptions

  cellClass?(context: CellContext<TData>): string | undefined
  cellStyle?(context: CellContext<TData>): Record<string, string> | undefined

  onHeaderClick?(context: HeaderContext): void

  // Tooltip text for header info icon
  tooltip?: string
}

export interface HeaderCell {
  key: string
  label: string
  column: Column
  colspan: number // Number of leaf columns this cell spans
  rowspan: number // Number of header levels this cell spans (for single columns)
  isGroup: boolean // Is this a group header (has children)
  level: number // Depth level in hierarchy (0 = top)
}

export interface ExpandableRow {
  id?: string | number
  children?: ExpandableRow[]
  [key: string]: unknown
}

export interface FlattenedRow extends ExpandableRow {
  depth: number // Nesting level (0 = root)
  parentId?: string | number
  hasChildren: boolean
  isExpanded: boolean
}

export interface VirtualTableOptions {
  estimateSize?: number
  overscan?: number
  measureElement?: boolean
}

export interface ResizeState {
  isResizing: boolean
  columnKey: string | null
  startX: number
  startWidth: number
}

// Sort types
export type SortOrder = "asc" | "desc";
export type SortType = "front" | "server";

export interface SortItem {
  field: string // Column key
  order: SortOrder // Sort direction
}

export interface SortConfig {
  type?: SortType // Sort type: 'front' (client-side) or 'server' (default)
  multiple?: boolean // Allow multiple column sorting (default: true)
}

export interface RequestPayload {
  page: number
  pageSize?: number
  sort: SortItem[] // Always array, even for single sort
}

export interface FrontSortPayload {
  field: string
  order: SortOrder
  sortState: SortItem[] // Full sort state for multi-sort
}

// Pagination configuration
export interface PaginationConfig {
  /** Total items. The only field the table cannot derive. */
  total: number

  /**
   * Current page (1-based). Omit when the page has an owner elsewhere: `v-model:page` or
   * `useTablePage()` both outrank it.
   */
  page?: number

  /**
   * Items per page. Omit when `v-model:page-size` is bound, which outranks it.
   * @default 10
   */
  pageSize?: number

  /**
   * Page sizes offered by the size changer. Passing this turns the changer on.
   * @default [10, 25, 50, 100]
   */
  pageSizeOptions?: number[]

  /**
   * Show the page size selector. Defaults to whether `pageSizeOptions` was passed; set it only
   * to show the changer with the default options, or to hide it despite options.
   */
  showSizeChanger?: boolean
}

// Re-export selection types
export type { MultiSelectConfig, SelectionMode, CheckboxState } from "./selection";

export type PaginatedResponse<T> = {
  data: T[]
  pagination: {
    currentPage: number
    from: number
    pageSizeNumber: number
    to: number
    totalItems: number
    totalPages: number
  }
};

// ── Highlight (pinned cross) ─────────────────────────────────────────────────

/**
 * Per-axis switches for the pinned-cross highlight.
 * The presence of this object already means "enabled" — there is deliberately
 * no `enabled` field, unlike ToolbarConfig. Pass `highlight` / `:highlight="true"`
 * for defaults, or `false` / omit the prop to disable.
 */
export interface HighlightConfig {
  /** Row pin — button in the row's first cell. Defaults to true. */
  row?: boolean
  /** Column pin — button in the header cell. Defaults to true. */
  column?: boolean
}

/** A pin is a coordinate: row-only, column-only, or both (the cross). */
export interface HighlightCoordinate {
  rowId: string | number | null
  columnKey: string | null
}

/**
 * Full readout of what is pinned, emitted via v-model:highlight-state.
 * `cell` is populated only when both axes are pinned.
 */
export interface TableHighlightState<TData = Record<string, unknown>> {
  row: {
    rowId: string | number
    rowIndex: number
    row: TData
  } | null
  column: {
    columnKey: string
    column: Column<TData>
  } | null
  cell: {
    value: unknown
    formattedValue: string
  } | null
}

/**
 * Controller VTable uses to broadcast/receive pin coordinates across linked tables.
 * Created internally by useLinkedTables — consumers never construct this directly.
 */
export interface HighlightSyncController {
  register: (receive: (coord: HighlightCoordinate) => void) => void
  unregister: () => void
  broadcast: (coord: HighlightCoordinate) => void
}

/**
 * provide/inject payload for the column pin button in TableHeader.
 * Passing three fields as props through TableHeaderSimple/TableHeaderGrouped would be
 * noise — the header already receives its slots the same way (`tableSlots`).
 */
export interface TableHighlightInjection {
  columnEnabled: ComputedRef<boolean>
  isColumnPinned: (key: string) => boolean
  toggleColumn: (key: string) => void
}

// ── Linked Tables ────────────────────────────────────────────────────────────

export type PaginationMode = "sync" | "independent" | "reset";

/**
 * Controller object VTable uses to participate in scroll synchronization.
 * Created internally by useLinkedTables — consumers never construct this directly.
 */
export interface ScrollSyncController {
  register: (el: HTMLElement) => void
  unregister: () => void
  onScroll: (x: number, y: number) => void
  scrollPosition: Ref<{ x: number, y: number } | null>
}

/**
 * Reactive object returned by useLinkedTables.
 * Pass directly to VTable via v-bind: <VTable v-bind="link" />
 */
export interface LinkedTableBindings {
  scrollSync: ScrollSyncController
  highlightSync: HighlightSyncController
  page: number
  "onUpdate:page": (p: number) => void
}

/**
 * Discriminated union — totalPages is required (and only valid) when paginationMode is 'sync'.
 */
export type LinkedTablesOptions
  = | {
    paginationMode: "sync"
    /** Reactive total page count for this table. Used to clamp synced page. */
    totalPages: Ref<number>
    initialPage?: number
    /** Prefix all registry keys — isolates groups that share ID names. */
    namespace?: string
    resetOn?: MaybeRefOrGetter<unknown>
  }
  | {
    paginationMode?: "independent" | "reset"
    totalPages?: never
    initialPage?: number
    namespace?: string
    resetOn?: MaybeRefOrGetter<unknown>
  };

export interface UseLinkedTablesReturn {
  link: LinkedTableBindings
  resetState: (page?: number) => void
}
