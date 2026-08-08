import type {
  Column, MultiSelectConfig,
  SortConfig, SortItem, RequestPayload,
  FrontSortPayload, PaginationConfig, ToolbarConfig,
  ScrollSyncController, HighlightConfig, HighlightSyncController,
  TableHighlightState,
} from "./index";

export type RowClassNameFunction<TData = Record<string, unknown>>
  = (row: TData, index: number) => string;

export type TableProps<TData extends Record<string, unknown> = Record<string, unknown>> = {
  columns: Column<TData>[]
  data: TData[]
  loading?: boolean
  virtualized?: boolean
  rowHeight?: number
  height?: string | number // Table height (CSS value or number in px)
  totalRow?: Record<string, unknown> // Summary row (sticky bottom)
  selectedRows?: TData[] // Pre-selected rows (v-model support)
  multiSelect?: MultiSelectConfig // Multi-select configuration
  /**
     * Expand behavior mode:
     * - 'auto' (default): Rows expand/collapse automatically on click
     * - 'controlled': Expansion is controlled via @expand-click callback
     *   Parent must call the provided callback to toggle expansion
     */
  expandMode?: "auto" | "controlled"

  // Sorting configuration
  sort?: SortConfig // Sort configuration: { type: 'front' | 'server', multiple: true }
  sortState?: SortItem[] // v-model:sort-state - current sort state

  // Pagination configuration (server-side only)
  pagination?: PaginationConfig
  page?: number // v-model:page - current page (synced externally)

  // Toolbar configuration
  toolbar?: ToolbarConfig

  // Search model (v-model:search)
  search?: string

  /**
     * Custom class name for table rows
     * Can be a string (applied to all rows) or a function that returns class name based on row data
     * @example
     * // String
     * rowClassName="custom-row"
     *
     * // Function
     * :rowClassName="(row, index) => row.isModified ? 'bg-blue-100 dark:bg-blue-900' : ''"
     */
  rowClassName?: string | RowClassNameFunction<TData>

  /**
     * Scroll sync controller from useLinkedTables. When present, this table
     * participates in cross-table scroll and page sync. Pass the whole return
     * value of useLinkedTables with v-bind — no manual wiring needed.
     *
     * Must be present at component creation; going from undefined to a value
     * after mount has no effect.
     */
  scrollSync?: ScrollSyncController

  /**
     * Pinned-cross highlight. Off by default.
     *
     * - `highlight` / `:highlight="true"` — both axes with defaults
     * - `:highlight="{ column: false }"` — row pin only
     * - `:highlight="false"` / omitted — off, clearing any existing pin
     *
     * There is no `enabled` field inside the object: its presence means enabled.
     */
  highlight?: boolean | HighlightConfig

  /**
     * v-model:highlight-state — full readout of the current pin. Two-way:
     * writing pins programmatically (restore from a URL, external toolbar).
     *
     * The input direction needs `highlight` to be truthy at component creation,
     * same caveat as `scrollSync`. Output always works while highlight is on.
     */
  highlightState?: TableHighlightState<TData> | null

  /** Highlight sync controller from useLinkedTables, delivered by `v-bind="link"`. */
  highlightSync?: HighlightSyncController
};

export type UseTableProps = {
  columns: Column[]
  data: Record<string, unknown>[]
};

// Function intersection format (required for generic SFC emit cast — Vue compiler limitation)
export type TableEmits<TData extends Record<string, unknown> = Record<string, unknown>>
  = & ((e: "row-click", row: TData) => void)
    & ((e: "update:selected-rows", selectedRows: TData[]) => void)
    & ((e: "expand-click", payload: { row: TData, column: Column<TData>, callback: () => void, expanded: boolean }) => void)
    & ((e: "update:sort-state", sortState: SortItem[]) => void)
    & ((e: "update:highlight-state", state: TableHighlightState<TData> | null) => void)
    & ((e: "update:page", page: number) => void)
    & ((e: "request", payload: RequestPayload) => void)
    & ((e: "sort", payload: FrontSortPayload) => void)
    & ((e: "update:search", query: string) => void)
    & ((e: "toolbar:refresh") => void)
    & ((e: "toolbar:reset-sort") => void)
    & ((e: "toolbar:export", format?: string, selectedOnly?: boolean) => void);
