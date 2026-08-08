/**
 * Toolbar types for Table component
 */

import type { ColumnFormatOptions } from "./format";

export interface ColumnPickerItem {
  key: string
  label: string
  /** Display icon badge: 'sys' | 'text' | 'number' | 'date' | any iconify name */
  icon?: string
  sortable?: boolean
  /** Format applied to the Column when this item is added via the picker */
  format?: ColumnFormatOptions
}

export interface ColumnPickerGroup {
  key: string
  label: string
  items: ColumnPickerItem[]
}

export interface ToolbarConfig {
  /**
     * Enable toolbar
     * @default false
     */
  enabled?: boolean

  /**
     * Table title
     */
  title?: string

  /**
     * Optional subtitle
     */
  subtitle?: string

  /**
     * Search configuration
     */
  search?: boolean | {
    placeholder?: string
  }

  /**
     * Toolbar actions
     */
  actions?: {
    /**
         * Refresh button behavior
         * - true/'default': Built-in behavior (resets sort & pagination)
         * - 'custom': Only emits @toolbar:refresh event, no built-in behavior
         * - false: Button hidden
         */
    refresh?: boolean | "default" | "custom"

    /**
         * Reset sort button behavior
         * - true/'default': Built-in behavior (clears sort state)
         * - 'custom': Only emits @toolbar:reset-sort event, no built-in behavior
         * - false: Button hidden
         */
    resetSort?: boolean | "default" | "custom"

    /**
         * Export functionality configuration
         * - false: Export hidden
         * - 'single': Quick shorthand for single export button (uses 'csv' format)
         * - 'multi': Quick shorthand for multi export dropdown (requires formats in export config object)
         * - object: Full configuration with mode, formats, etc.
         *
         * @example
         * // Quick single export
         * export: 'single'
         *
         * @example
         * // Multi export with formats
         * export: {
         *   mode: 'multi',
         *   formats: [
         *     { label: 'CSV', value: 'csv', icon: 'mdi:file-delimited' },
         *     { label: 'Excel', value: 'xlsx', icon: 'mdi:file-excel' }
         *   ],
         *   selectedOnly: false
         * }
         */
    export?: false | "single" | "multi" | {
      /**
             * Export mode
             * - 'single': One export button (default format: csv)
             * - 'multi': Dropdown with multiple export options
             */
      mode: "single" | "multi"

      /**
             * Available export formats (required for 'multi' mode)
             */
      formats?: ExportFormat[]

      /**
             * Export only selected rows
             * @default false
             */
      selectedOnly?: boolean

      /**
             * Global loading state for all exports
             */
      loading?: boolean
    }

    /**
         * Column setup button configuration
         * - false: Button hidden
         * - string: Storage key (enables persistence with default settings)
         * - object: Full configuration with custom settings
         *
         * @example
         * // Quick setup with persistence
         * columnSetup: 'myTable_columns'
         *
         * @example
         * // Full configuration
         * columnSetup: {
         *   key: 'myTable_columns',
         *   type: 'sessionStorage',
         *   allowReorder: false
         * }
         *
         * @default false
         */
    columnSetup?: false | string | {
      /**
             * Storage key for persistent storage
             * If provided, column settings will be persisted automatically
             * @example 'myTable_columns'
             */
      key?: string

      /**
             * Storage type
             * @default 'indexedDB'
             */
      type?: "indexedDB" | "localStorage" | "sessionStorage"

      /**
             * Enable column reordering via drag-and-drop
             * @default true
             */
      allowReorder?: boolean

      /**
             * Initially visible columns (by key)
             * If not provided, all columns are visible
             * Note: This is overridden by saved state if storage key is provided
             */
      initialVisible?: string[]
    }

    /**
         * Column picker — all available columns, grouped by category.
         * Renders a second button left of the column-setup button.
         * Only visible when this option is provided.
         *
         * @example
         * columnPicker: {
         *   groups: [
         *     { key: 'system', label: 'System attributes', items: [{ key: 'sku', label: 'SKU', icon: 'sys' }] }
         *   ]
         * }
         */
    columnPicker?: false | {
      /** All available column groups shown in the left panel */
      groups: ColumnPickerGroup[]

      /** Shows a skeleton in the left panel while groups are fetching */
      loading?: boolean

      /**
             * Storage key. When set, the selection and order persist automatically
             * (same storage as columnSetup).
             */
      key?: string

      /**
             * Storage type
             * @default 'indexedDB'
             */
      type?: "indexedDB" | "localStorage" | "sessionStorage"

      /**
             * Whether columns added via the picker are sortable by default.
             * Applied when rebuilding columns from saved state, e.g. when groups
             * load asynchronously.
             * @default false
             */
      defaultSortable?: boolean
    }

    /**
         * Fullscreen expand button.
         * Unlike the other actions this one is opt-out: it shows whenever the
         * toolbar is enabled unless explicitly set to false.
         * @default true
         */
    fullscreen?: boolean
  }
}

export interface ExportFormat {
  /**
     * Display label
     */
  label: string

  /**
     * Format value (csv, excel, pdf, etc.)
     */
  value: string

  /**
     * Optional icon
     */
  icon?: string

  /**
     * Loading state for this format
     */
  loading?: boolean
}
