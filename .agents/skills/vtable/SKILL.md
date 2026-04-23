# Skill: VTable Developer — Extending VTable Functionality

## Metadata

| Field          | Value                                                                                                                   |
|----------------|-------------------------------------------------------------------------------------------------------------------------|
| **name**       | `vtable`                                                                                                                |
| **description** | Deep reference for developers extending VTable internals: adding subcomponents, composables, SCSS, or new prop/emit contracts. Not for consuming the table — for building it. |
| **version**    | 1.0                                                                                                                     |
| **applies_to** | `libs/ui/src/components/table/**`                                                                                       |

## Auto-Activation Triggers

Apply this skill automatically when any of the following is true:

- Task involves editing any file inside `libs/ui/src/components/table/`
- The user says "extend the table", "add a feature to VTable", "add column functionality", "новый composable для таблицы", "расширить таблицу", "добавить в таблицу"
- The user wants to add a new prop or emit to `VTable.vue`
- The user wants to add a new composable under `table/composables/`
- The user wants to create a new subcomponent inside `table/components/`
- The user wants to add a new SCSS file or class under `table/assets/styles/`
- The user is debugging behavior inside the table rendering pipeline

---

## Role

You are a senior Vue 3 / TypeScript frontend engineer maintaining and extending `VTable` — a generic, virtualized data table built for the `@muzakit/ui` component library.

You optimize for:
- Zero TypeScript errors (strict mode always on)
- Performance (WeakMap cell caching, virtual rendering, display: contents rows)
- Correct generic propagation (`TData extends Record<string, unknown>`)
- Clean separation: composables own logic, components own rendering

---

## Architecture Overview

```
VTable.vue (generic SFC, TData extends Record<string, unknown>)
│
├── Composables (pure reactive logic, no DOM)
│   ├── useColumnResize       → column width state + drag resize
│   ├── useFixedColumns       → sticky column positions + z-index
│   ├── useGroupedHeaders     → multi-level header tree → flat rows
│   ├── useColumnSetup        → column visibility / reorder / storage
│   ├── useExpandableTable    → tree data → FlattenedRow[] + toggle state
│   ├── useTableFormatters    → value → display string (currency, %, date…)
│   ├── useTableSelection     → multi-select + dependent mode
│   ├── useTableSort          → sort state + front/server sort logic
│   ├── useVirtualTable       → TanStack Virtual windowed rendering
│   ├── useTablePage          → page ref + TABLE_PAGE_KEY provide/inject
│   └── useTablePeriodSelect  → period dropdown → API params
│
├── Subcomponents (rendering only, receive computed values from VTable)
│   ├── TableRow              → display: contents row wrapper
│   ├── TableCell             → data cell (padding, indent, truncate)
│   ├── TableCheckboxCell     → selection checkbox per row
│   ├── TableHeaderSimple     → flat header row (no groups)
│   ├── TableHeaderGrouped    → multi-level grouped header rows
│   ├── TableHeader           → single header cell (sort, resize, tooltip)
│   ├── TableHeaderGroup      → group label cell (colspan, non-interactive)
│   ├── TableHeaderCheckbox   → select-all checkbox in header
│   ├── TablePagination       → bottom pagination controls
│   ├── TableEmptyState       → centered empty overlay
│   ├── TableToolbar          → top toolbar (search, actions, slots)
│   ├── TableColumnSetup      → column visibility/reorder dialog
│   ├── DeltaValue            → main value + delta with arrow
│   ├── DeltaIndicator        → standalone delta arrow + value
│   ├── TablePeriodSelect     → period selector dropdown
│   └── TableTitleBlock       → section header block
│
├── Types (libs/ui/src/components/table/types/)
│   ├── index.ts      → Column, CellContext, ExpandableRow, FlattenedRow, SortItem, …
│   ├── props.ts      → TableProps<TData>, TableEmits<TData>, RowClassNameFunction
│   ├── selection.ts  → MultiSelectConfig, CheckboxState, SelectionMode
│   └── toolbar.ts    → ToolbarConfig, ExportFormat, ColumnSetupConfig
│
└── Assets (libs/ui/src/components/table/assets/styles/)
    ├── index.scss         → main layout: wrapper, grid, virtual spacer
    ├── header.scss        → header cells, group headers, sort icons, resize handle
    ├── rows.scss          → row wrappers, states (hover, selected, disabled, expanded)
    ├── cells.scss         → data cells, indent, expand button, interactive
    ├── pagination.scss    → pagination bar, buttons, size selector
    ├── toolbar.scss       → toolbar layout, search, action buttons
    ├── column-setup.scss  → column dialog, drag items, pin button, footer
    └── loading.scss       → loading overlay, spinner, empty state
```

---

## Key Invariants

1. **`Column<TData = any>`** — `any` as default (AG Grid pattern) lets composables use `Column[]` with no explicit annotation. Typed usage `Column<User>[]` is assignable to `Column[]` because `any` bypasses variance checks. Never change the default from `any` to `Record<string, unknown>`.

2. **`defineEmits` in generic SFCs** — Vue SFC compiler resolves only the last overload when the component has `generic="TData..."`. Use the runtime array + cast workaround:
   ```ts
   const emit = defineEmits([
     "row-click", "update:selected-rows", /* ... all events */
   ]) as unknown as TableEmits<TData>
   ```
   `TableEmits<TData>` lives in `types/props.ts` as a function intersection type, not a Vue emit map.

3. **`TData & FlattenedRow`** — rows going through `useExpandableTable` become `FlattenedRow`. Methods that receive both the user's TData fields and the internal flatten fields use `TData & FlattenedRow` as the parameter type.

4. **WeakMap cell metadata cache** — `new WeakMap<object, Map<string, CellMetadata>>()` prevents computing `cellClass`, `cellStyle`, and other per-cell callbacks on every render cycle. Cache key is the row object. Reset when `displayData` changes.

5. **Reactive prop destructuring (Vue 3.5+)** — VTable uses `const { data, ... } = defineProps<TableProps<TData>>()`. Props are reactive without `props.x`. For composables that need a reactive source, pass as getter: `() => data`.

6. **No color tokens in table SCSS** — structural SCSS only (layout, grid, z-index, position, transitions). All colors come from CSS variables defined outside the table (design tokens). Never hard-code colors inside table SCSS files.

---

## Composables Reference

### `useColumnResize(columns: Ref<Column[]>)`
```
Returns:
  gridTemplateColumns: ComputedRef<string>    — CSS grid-template-columns value
  getGridTemplateWithCheckbox: () => string   — with optional checkbox column prepended
  resizedWidths: Ref<Map<string, number>>     — manual overrides by column key
  isResizing: Ref<boolean>                    — drag in progress
  isColumnResizable: (col: Column) => boolean — checks col.width !== 'flex'
  startResize: (key, event) => void           — mouse drag handler
  autoFitColumn: (key, width) => void         — double-click auto-fit
  getColumnWidth: (key) => number | undefined — current override
  resetWidths: () => void                     — clear all overrides
```

### `useFixedColumns(columns: Ref<Column[]> | ComputedRef<Column[]>, columnWidths?: Ref<Map<string, number>>)`
```
Returns:
  leftFixedColumns: ComputedRef<Column[]>
  rightFixedColumns: ComputedRef<Column[]>
  normalColumns: ComputedRef<Column[]>
  getFixedStyles: (col) => Record<string, string>   — { position, left/right, zIndex }
  isFixed: (col) => boolean
  isLastLeftFixed: (col) => boolean                 — for shadow class
  isFirstRightFixed: (col) => boolean               — for shadow class
  getZIndex: (col) => number
```

### `useGroupedHeaders(columns: Ref<Column[]> | ComputedRef<Column[]>, columnWidths: Ref<Map<string, number>>)`
```
Returns:
  hasGroups: ComputedRef<boolean>
  flatColumns: ComputedRef<Column[]>               — leaf columns only
  headerLevels: ComputedRef<HeaderCell[][]>        — rows[0] = top level, rows[n] = leaves
  getGroupWidth: (cell: HeaderCell) => string      — sum of leaf widths
  getColspan: (cell: HeaderCell) => number
  isGroupFixed: (cell: HeaderCell) => boolean
```

### `useColumnSetup(config: ColumnSetupConfig)`
```
Returns:
  setupItems: Ref<ColumnSetupItem[]>
  visibleColumns: ComputedRef<Column[]>
  getSetupItem: (key) => ColumnSetupItem | undefined
  toggleColumn: (key) => void
  setColumnVisibility: (key, visible) => void
  reorderColumns: (from, to) => void
  reset: () => void
  showAll: () => void
  hideAll: () => void
```
Config shape: `{ key, columns, type: 'indexedDB' | 'localStorage' | 'sessionStorage', allowReorder, initialVisible }`

### `useExpandableTable(data: Ref<ExpandableRow[]>)`
```
Returns:
  flattenedData: ComputedRef<FlattenedRow[]>  — depth-first flat array
  expandedRows: Ref<Set<string | number>>
  toggleRow: (id) => void
  expandAll: () => void
  collapseAll: () => void
  isExpandable: (row) => boolean              — row.children?.length > 0
```

### `useTableFormatters()`
```
Returns:
  formatCellValue: (value, column, row?) => string | number
  formatCurrency: (value, opts) => string
  formatPercentage: (value, opts) => string
  formatNumber: (value, opts) => string
  formatDate: (value, opts) => string
  formatBoolean: (value, opts) => string
  formatFileSize: (value, opts) => string
```
Applies `column.format` options in order: custom formatter → currency → percentage → number → date → boolean → fileSize.

### `useTableSelection(options: UseTableSelectionOptions)`
```
Options:
  config: Ref<MultiSelectConfig>
  flattenedData: Ref<FlattenedRow[]>
  selectedRows: Ref<ExpandableRow[]>
  onSelectionChange: (selected: ExpandableRow[]) => void

Returns:
  isEnabled: ComputedRef<boolean>
  isDependentMode: ComputedRef<boolean>
  selectedIds: ComputedRef<Set<string | number>>
  isRowSelected: (row) => boolean
  isRowSelectable: (row) => boolean
  toggleRow: (row) => void
  toggleAllRows: () => void
  getParentCheckboxState: (row) => CheckboxState
  getHeaderCheckboxState: () => CheckboxState
  clearSelection: () => void
  selectRows: (rows) => void
```

### `useTableSort<T>(options: UseTableSortOptions<T>)`
```
Options:
  data: Ref<T[]>
  config: Ref<SortConfig>
  sortState: Ref<SortItem[]>
  onServerSort: (payload: FrontSortPayload) => void
  onSortStateChange: (state: SortItem[]) => void

Returns:
  sortState: Ref<SortItem[]>
  sortConfig: ComputedRef<SortConfig>
  getSortState: (field) => { isSorted, sortOrder, sortIndex } | null
  handleSortClick: (column: Column) => void
  hasSortedColumns: ComputedRef<boolean>
  resetSort: () => void
  sortedData: ComputedRef<T[]>
```

### `useVirtualTable(scrollContainerRef: Ref<HTMLElement | null>, data: Ref<Record<string, unknown>[]>, options?: VirtualTableOptions)`
```
Options:
  estimateSize?: number   (default: 48)
  overscan?: number       (default: 5)
  measureElement?: boolean (default: false — keep false for perf)

Returns:
  virtualizer: Virtualizer
  virtualItems: ComputedRef<VirtualItem[]>
  totalSize: ComputedRef<number>
```

### `useTablePage(resetOn: WatchSource[] = [])`
```
Returns: page Ref<number> (1-based)
Side effect: provides TABLE_PAGE_KEY injection key
Auto-resets page to 1 when any resetOn source changes.
```

### `useTablePeriodSelect(options: UseTablePeriodSelectOptions)`
```
Options:
  granularity: Ref<PeriodGranularity>  — 'month' | 'week' | 'day'
  dateRange: Ref<PeriodDateRange>      — { from: string, to: string }
  includeSummary?: boolean

Returns:
  selectedPeriod: Ref<PeriodOption | null>
  periodOptions: ComputedRef<PeriodOption[]>
  defaultPeriod: ComputedRef<PeriodOption | null>
  periodRequestParams: ComputedRef<Record<string, unknown>>
  isGroupByDate: ComputedRef<boolean>
  handlePeriodChange: (option) => void
  resetPeriod: () => void
```

---

## Subcomponents Reference

### `TableRow`
Wrapper that renders its slot with `display: contents`. No props beyond default slot.

### `TableCell`
```
Props:
  value?:          unknown           — cell display value
  align?:          'left' | 'center' | 'right'
  depth?:          number            — nesting depth (indent multiplier)
  isFirstColumn?:  boolean           — applies indent

Renders: padding, truncate, optional expand button slot, indent spacer.
```

### `TableCheckboxCell`
```
Props:
  checked:       boolean
  indeterminate?: boolean
  disabled?:     boolean
Emits: toggle
```

### `TableHeaderCheckbox`
```
Props:
  state:    CheckboxState   — 'checked' | 'unchecked' | 'indeterminate'
  disabled?: boolean
Emits: toggle
```

### `TableHeaderSimple`
```
Props:
  columns:           Column[]
  getColumnClasses:  (col) => string[]
  getFixedStyles:    (col) => Record<string, string>
  getSortState:      (col) => SortStateResult | null
  isColumnResizable: (col) => boolean
Emits: resize-start, resize-dblclick, sort-click
```

### `TableHeaderGrouped`
```
Props:
  columns:            HeaderCell[][]          — pre-computed from useGroupedHeaders
  getColumnClasses:   (cell) => string[]
  getFixedStyles:     (cell) => Record<string, string>
  getGroupWidth:      (cell) => string
  getGroupFixedStyles:(cell) => Record<string, string>
  getSortState:       (cell) => SortStateResult | null
  isColumnResizable:  (col) => boolean
Emits: resize-start, resize-dblclick, sort-click
```

### `TableHeader`
```
Props:
  column:      Column
  label:       string
  align?:      string
  columnKey:   string
  resizable?:  boolean
  isSorted?:   boolean
  sortOrder?:  SortOrder
  sortIndex?:  number          — multi-sort rank badge
Emits: sort-click(column), resize-start(key, event), resize-dblclick(key, event)
```

### `TableHeaderGroup`
```
Props:
  cell:        HeaderCell
  groupWidth?: string          — CSS width (sum of leaf columns)
Renders: group label, non-interactive.
```

### `TablePagination`
```
Props:
  page:              number
  pageSize:          number
  total:             number
  pageSizeOptions?:  number[]
  showSizeChanger?:  boolean
  loading?:          boolean
Emits: page-change({ page, pageSize })
```

### `TableEmptyState`
```
Props:
  title?:       string
  description?: string
  icon?:        string
Slot: default (custom content)
Position: absolute centered inside scroll container.
```

### `TableToolbar`
```
Props:
  config?:  ToolbarConfig
  search?:  string
Emits: update:search, refresh, reset-sort, export(format, selectedOnly?)
Slot forwarding: title, search, actions, column-setup (via provide/inject "tableSlots")
```

### `TableColumnSetup`
```
Props:
  columns:  Column[]
  config?:  ColumnSetupConfig
Emits: update:visible-columns(Column[]), close
Features: drag-and-drop reorder, pin-to-left (first 2 only), indexedDB/localStorage/sessionStorage persist.
```

### `DeltaValue`
```
Props:
  value?:             unknown
  delta?:             number
  format?:            ColumnFormatOptions
  deltaFormat?:       ColumnFormatOptions
  deltaAsPercentage?: boolean   (default: true)
  reverse?:           boolean   (default: false) — invert color semantics
  size?:              'default' | 'sm' | 'lg'
  showZeroDelta?:     boolean   (default: true)
```

### `DeltaIndicator`
```
Props:
  value?:    number
  format?:   ColumnFormatOptions
  reverse?:  boolean   (default: false)
  size?:     'default' | 'sm' | 'lg'
  showIcon?: boolean   (default: true)
  showZero?: boolean   (default: true)
```

### `TablePeriodSelect`
```
Props:
  granularity:    PeriodGranularity
  dateRange:      PeriodDateRange
  includeSummary?: boolean
  widthClass?:    string
  placeholder?:   string
Emits: change({ selected, requestParams, isGroupByDate })
```

### `TableTitleBlock`
```
Props:
  title?: string
  icon?:  string
Slot: default (toggle controls, actions)
```

---

## SCSS Class Inventory (Structural — No Color Tokens)

### Wrapper & Grid (`index.scss`)
```
.v-table-wrapper               flex column, border-radius, box-shadow
.v-table-wrapper--with-toolbar modifier for toolbar present
.v-table-toolbar-slot          toolbar wrapper
.v-table-scroll-container      overflow: auto, contain: strict, custom scrollbar
.v-table-scroll-container--loading pointer-events: none
.v-table-container-wrapper     flex row: scroll area + empty state + loading
.v-table-grid                  display: grid; grid rows for header + body
.v-table-grid.v-is-resizing    cursor: col-resize; user-select: none
.v-table-virtual-spacer        grid-column: 1 / -1; height = totalSize
```

### Header (`header.scss`)
```
.v-table-header-row               display: contents
.v-table-header-row-level-0       position: sticky; top: 0px
.v-table-header-row-level-1       position: sticky; top: 48px
.v-table-header-row-level-2       position: sticky; top: 96px
.v-table-header-cell              position: sticky; top: 0; z-index: 2; min-height: 48px
.v-table-header-cell--left        text-align: left
.v-table-header-cell--center      text-align: center
.v-table-header-cell--right       text-align: right
.v-table-header-cell--sortable    cursor: pointer
.v-table-header-cell--clickable   cursor: pointer (custom onHeaderClick)
.v-table-header-cell--grouped     multi-level group modifier
.v-table-header-cell--rowspan     spans multiple header rows
.v-table-header-content           display: flex; align-items: center; gap: 0.25rem
.v-table-header-label-wrapper     display: flex; label container
.v-table-header-label-wrapper--clickable  opacity transition on hover
.v-table-header-label             overflow: hidden; text-overflow: ellipsis
.v-table-header-group             position: sticky; text-align: center; font-weight: 700; text-transform: uppercase
.v-table-header-group--left|--center|--right  alignment
.v-table-header-group-label       group label text

.v-table-resize-handle            position: absolute; right: 0; cursor: col-resize; height: 100%; width: 8px
.v-table-resize-indicator         flex column; gap: 3px; align-items: center
.v-table-resize-line              height: 2px; width: 3px (grip dots)
.v-table-resize-divider           position: absolute; right: 0; height: 60%; width: 1px

.v-table-header-sort              display: flex; gap: 4px; align-items: center
.v-sort-icon                      opacity: 0.45; transition: opacity, filter
.v-sort-icon--active              opacity: 1; filter: drop-shadow
.v-sort-index                     sort rank badge (multi-sort)

.v-table-header-checkbox-cell     position: sticky; left: 0; z-index: 3; height: 48px
.v-table-header-checkbox-cell--empty  empty cell when checkbox hidden
```

### Rows (`rows.scss`)
```
.v-table-row-wrapper              display: contents; cursor: pointer
.v-table-row-wrapper:hover > .v-table-cell   hover: background, left-border, bottom-border change
.v-table-row-wrapper:active > .v-table-cell  active: background
.v-table-row-wrapper--disabled    cursor: not-allowed; opacity: 0.5 on cells
.v-table-row-wrapper--selected > .v-table-cell  selected bg, left-border, font-weight: 600
.v-table-row-virtual              display: contents
.v-table-row-expandable           display: contents
.v-table-row-expandable--entering  transition-in animation
.v-table-row-expandable--leaving   transition-out animation
```

### Cells (`cells.scss`)
```
.v-table-cell                     padding, min-height, border-bottom, border-right
.v-table-cell--left               text-align: left
.v-table-cell--center             text-align: center
.v-table-cell--right              text-align: right
.v-table-cell--indented           padding-left adjusted for depth
.v-table-cell-content             display: flex; align-items: center; gap: 0.5rem
.v-table-cell-text                flex: 1; min-width: 0
.v-table-cell-text--truncate      overflow: hidden; text-overflow: ellipsis; white-space: nowrap
.v-table-cell-text--wrap          white-space: normal
.v-table-cell--interactive        overflow: visible
.v-table-cell--expandable         cursor: pointer; hover/active bg
.v-table-cell-expand-btn          display: inline-flex; icon button; transition: transform
.v-table-cell-expand-spacer       width: 20px placeholder when no expand button

.v-table-checkbox-cell            display: flex; align-items: center; justify-content: center; border-right

.v-table-fixed-column             z-index: 1; background; transition: box-shadow
.v-table-fixed-left               position: sticky; left: 0
.v-table-fixed-right              position: sticky; right: 0
.v-table-fixed-left-last          box-shadow: 2px 0 solid (right shadow separator)
.v-table-fixed-right-first        box-shadow: -2px 0 solid (left shadow separator)

.v-table-total-cell               position: sticky; bottom: 0; z-index: 2; font-weight: 700
.v-table-total-cell--left|--center|--right  alignment
.v-table-total-content            display: flex; align-items: center; gap: 0.5rem
.v-table-total-text               flex: 1; min-width: 0; font-weight: 700
.v-table-total-text--truncate     overflow hidden
.v-table-total-spacer             width: 20px placeholder
```

### Pagination (`pagination.scss`)
```
.v-table-pagination               display: flex; justify-content: space-between; gap: 1.5rem; border-top
.v-table-pagination-info          info text
.v-table-pagination-info-highlight  font-weight: 600
.v-table-pagination-controls      display: flex; align-items: center; gap: 0.25rem
.v-table-pagination-btn           display: inline-flex; min-width: 2.25rem; border; transition
.v-table-pagination-btn--active   active page: primary background
.v-table-pagination-size          display: flex; align-items: center; gap: 0.5rem (size selector)
.v-table-pagination-ellipsis      display: flex; align-items: center (… dots)
```

### Toolbar (`toolbar.scss`)
```
.v-table-toolbar                  display: flex; align-items: center; gap: 0.75rem; padding; border-bottom
.v-table-toolbar-title            flex: 1; font-weight: 600
.v-table-toolbar-subtitle         font-size: 0.75rem
.v-table-toolbar-search           flex: 1; max-width: 280px
.v-table-toolbar-actions          display: flex; gap: 0.5rem
.v-table-toolbar-btn              button base
.v-table-toolbar-export-dropdown  position: relative; dropdown container
```

### Column Setup Dialog (`column-setup.scss`)
```
.column-setup                     max-width: 360px; max-height: min(500px, 70vh); display: flex flex-col; border-radius; box-shadow
.column-setup-header              display: flex; justify-content: space-between; padding; border-bottom
.column-setup-title               display: flex; align-items: center; gap: 8px; font-weight: 600
.column-setup-toggle-all          padding; border-bottom (show all / hide all controls)
.column-setup-list                flex: 1; overflow-y: auto; padding: 8px
.column-setup-item                display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius; cursor: move
.column-setup-item--dragging      opacity: 0.6; cursor: grabbing; transform: scale(1.02)
.column-setup-item--drag-over     border: primary; box-shadow (drop target indicator)
.column-setup-item--fixed         label opacity: 0.7; font-style: italic
.column-setup-item--no-reorder    cursor: default
.column-setup-item-drag           drag handle icon
.column-setup-item-checkbox       checkbox input
.column-setup-item-label          flex: 1; font-size: 13px; truncate
.column-setup-item-fixed-btn      pin toggle button
.column-setup-item-fixed-btn--active  pinned state (primary)
.column-setup-item-badge          warning badge (invalid column indicator)
.column-setup-footer              display: flex; justify-content: space-between; padding; border-top
.column-setup-hint                display: flex; align-items: center; gap: 4px; font-size: 12px
```

### Loading & Empty State (`loading.scss`)
```
.v-table-loading-overlay          position: absolute; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center
.v-table-loading-backdrop         position: absolute; inset: 0; backdrop-filter: blur(1px)
.v-table-loading-spinner          position: relative; z-index: 1; display: flex; align-items: center; justify-content: center
.v-table-empty-state              position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%)
.v-table-empty-state-content      display: flex; flex-direction: column; gap: 1rem; pointer-events: auto
.v-table-empty-state-icon         opacity mix
.v-table-empty-state-title        font-size: 1.125rem; font-weight: 600
.v-table-empty-state-description  font-size: 0.875rem; max-width: 400px; text-align: center
```

---

## Extension Points

### Adding a New Prop to VTable

1. Add the prop to `TableProps<TData>` in `types/props.ts`
2. Destructure it in `VTable.vue` via `defineProps<TableProps<TData>>()`
3. Pass it to the relevant subcomponent or composable

### Adding a New Emit

1. Add to `TableEmits<TData>` in `types/props.ts` as a function intersection entry:
   ```ts
   & ((e: "my-event", payload: MyPayload) => void)
   ```
2. Add the event string to the runtime `defineEmits([...])` array in `VTable.vue`
3. Call `emit("my-event", payload)` where needed

### Adding a New Composable

1. Create `composables/useMyFeature.ts`
2. Accept reactive inputs via `MaybeRefOrGetter<T>` + `toValue()`
3. Export explicit return type (required for shared composables)
4. Import and call in `VTable.vue` — pass computed/ref values, not raw props
5. Register cleanup inside the composable (`onUnmounted`)

### Adding a New Subcomponent

1. Create `components/MyComponent.vue` — PascalCase, one file per component
2. Script → Template → Style (scoped) order
3. Use typed `defineProps<{...}>()` with `ReadonlyArray<T>` for array props
4. Emit via `defineEmits<{ 'event-name': [arg: Type] }>()`
5. Import in `VTable.vue` — no `defineAsyncComponent` for always-visible components

### Adding a New SCSS File

1. Create `assets/styles/my-feature.scss`
2. Import in `assets/styles/index.scss` (or per-component `<style>`)
3. Use structural classes only — no hard-coded colors, only CSS variables from the design token system
4. Class names: `.v-table-` prefix for global table classes

---

## Forbidden Patterns

- `Column<Record<string, unknown>>` as default — always `Column<any>` (see Invariant #1)
- `defineEmits<{ 'event': [arg] }>()` in VTable.vue — broken in generic SFCs, use runtime array + cast
- Inline styles in subcomponents — use CSS variable binding or class binding
- Hard-coded colors in table SCSS — all colors via CSS variables
- `reactive()` return from composables — loses type inference on destructuring
- `props.x` access after destructuring — banned by Vue 3.5+ rules
- `any` in composable signatures (not default generics) — use `unknown` + type guards
- Side effects at composable top level — put inside `onMounted` or watchers
