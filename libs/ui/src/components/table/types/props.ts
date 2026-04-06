import type {
  Column, ExpandableRow, MultiSelectConfig,
  SortConfig, SortItem, RequestPayload,
  FrontSortPayload, PaginationConfig, ToolbarConfig,
} from "./index";

export type RowClassNameFunction = (row: ExpandableRow, index: number) => string;

export type TableProps = {
  columns: Column[]
  data: ExpandableRow[]
  loading?: boolean
  virtualized?: boolean
  rowHeight?: number
  height?: string | number // Table height (CSS value or number in px)
  totalRow?: Record<string, unknown> // Summary row (sticky bottom)
  selectedRows?: ExpandableRow[] // Pre-selected rows (v-model support)
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
  rowClassName?: string | RowClassNameFunction
};

export type UseTableProps = {
  columns: Column[]
  data: Record<string, unknown>[]
};

export interface TableEmits {
  "row-click": [row: Record<string, unknown>]
  "update:selected-rows": [selectedRows: ExpandableRow[]]
  "expand-click": [{ row: ExpandableRow, column: Column, callback: () => void, expanded: boolean }]

  // Sorting & Pagination
  "update:sort-state": [sortState: SortItem[]]
  "update:page": [page: number]
  request: [payload: RequestPayload] // Unified event for server-side operations (includes page, sort, etc)
  sort: [payload: FrontSortPayload] // Frontend sort event

  // Toolbar events
  "update:search": [query: string]
  "toolbar:refresh": []
  "toolbar:reset-sort": []
  "toolbar:export": [format?: string, selectedOnly?: boolean]
}
