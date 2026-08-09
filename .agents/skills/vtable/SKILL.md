# Skill: VTable Developer — Extending VTable Functionality

## Metadata

| Field           | Value                                                                                                                                                                         |
|-----------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **name**        | `vtable`                                                                                                                                                                      |
| **description** | Deep reference for developers extending VTable internals: adding subcomponents, composables, SCSS, or new prop/emit contracts. Not for consuming the table — for building it. |
| **version**     | 1.1                                                                                                                                                                           |
| **applies_to**  | `libs/core/src/components/table/**`                                                                                                                                           |

## Auto-Activation Triggers

Apply this skill automatically when any of the following is true:

- Task involves editing any file inside `libs/core/src/components/table/`
- The user says "extend the table", "add a feature to VTable", "add column functionality", "новый composable для
  таблицы", "расширить таблицу", "добавить в таблицу"
- The user wants to add a new prop or emit to `VTable.vue`
- The user wants to add a new composable under `table/composables/`
- The user wants to create a new subcomponent inside `table/components/`
- The user wants to add a new SCSS file or class under `table/assets/styles/`
- The user is debugging behavior inside the table rendering pipeline

---

## Role

You are a senior Vue 3 / TypeScript frontend engineer maintaining and extending `VTable` — a generic, virtualized data
table built for the `@app/core` component library.

You optimize for:

- Zero TypeScript errors (strict mode always on)
- Performance (WeakMap cell caching, virtual rendering, display: contents rows)
- Working with the non-generic `Column`, `TableProps`, `TableEmits` types as they actually are (see Invariant #1)
- Clean separation: composables own logic, components own rendering

---

## Architecture Overview

```
VTable.vue (non-generic SFC — Column, TableProps, TableEmits take no TData parameter)
│
├── Composables (pure reactive logic, no DOM)
│   ├── useColumnResize       → column width state + drag resize
│   ├── useFixedColumns       → sticky column positions + z-index
│   ├── useGroupedHeaders     → multi-level header tree → flat rows
│   ├── useExpandableTable    → tree data → FlattenedRow[] + toggle state
│   ├── useTableFormatters    → value → display string (currency, %, date…)
│   ├── useTableCellMetadata  → per-cell formatted value/class/style/indent (WeakMap cached)
│   ├── useTableColumnConfig  → column setup/picker enablement, storage-restore, popover refs, effectiveColumns
│   ├── useTableSelection     → multi-select + dependent mode
│   ├── useTableSort          → sort state + front/server sort logic
│   ├── useVirtualTable       → TanStack Virtual windowed rendering
│   ├── useTablePage          → page ref + TABLE_PAGE_KEY provide/inject
│   ├── useTableFullScreen    → FLIP-based fullscreen expand/collapse + z-index + Escape
│   ├── useTablePeriodSelect  → period dropdown → API params
│   └── useLinkedTables       → cross-table scroll + pagination sync via module registry
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
│   ├── TableBackdrop         → fullscreen dim/blur layer, mount/unmount-driven (no state)
│   ├── DeltaValue            → main value + delta with arrow
│   ├── DeltaIndicator        → standalone delta arrow + value
│   ├── TablePeriodSelect     → period selector dropdown
│   └── TableTitleBlock       → section header block
│
├── Types (libs/core/src/components/table/types/)
│   ├── index.ts      → Column, CellContext, ExpandableRow, FlattenedRow, SortItem, …
│   │                    PaginationMode, ScrollSyncController, LinkedTableBindings,
│   │                    LinkedTablesOptions, UseLinkedTablesReturn
│   ├── props.ts      → TableProps, TableEmits, RowClassNameFunction
│   │                    (includes scrollSync?: ScrollSyncController)
│   ├── selection.ts  → MultiSelectConfig, CheckboxState, SelectionMode
│   └── toolbar.ts    → ToolbarConfig, ExportFormat, ColumnSetupConfig
│
├── Assets (libs/core/src/components/table/assets/styles/)
│   ├── index.scss         → main layout: wrapper, grid, virtual spacer
│   ├── header.scss        → header cells, group headers, sort icons, resize handle
│   ├── rows.scss          → row wrappers, states (hover, selected, disabled, expanded)
│   ├── cells.scss         → data cells, indent, expand button, interactive
│   ├── pagination.scss    → pagination bar, buttons, size selector
│   ├── toolbar.scss       → toolbar layout, search, action buttons
│   ├── column-setup.scss  → column dialog, drag items, pin button, footer
│   └── loading.scss       → loading overlay, spinner, empty state
│
└── Utils (libs/core/src/components/table/utils/)
    ├── storage.ts      → indexedDB/localStorage/sessionStorage adapters + TableStorageManager singleton
    └── columnState.ts  → SavedColumnState (shared contract) + readColumnState/writeColumnState,
                           wrapping storage.ts's setStorageType()-then-read/write ordering. Read by
                           VTable.vue, read+written by TableColumnSetup.vue and TableColumnPicker.vue.
```

---

## Key Invariants

1. **VTable.vue is not generic** — despite an earlier version of this skill claiming
   `generic="TData..."`, the current source has no `generic=` attribute, and `Column`,
   `TableProps`, `TableEmits` (`types/props.ts`) are plain, non-generic types. `defineEmits` is
   applied directly as `defineEmits<TableEmits>()` — the runtime-array-cast workaround this
   skill used to describe (`defineEmits([...]) as unknown as TableEmits<TData>`) does not apply
   here and should not be reintroduced without first confirming the component has actually
   become generic again.

2. **`FlattenedRow` is a plain, non-generic extension of `ExpandableRow`** (`types/index.ts`) — rows going through
   `useExpandableTable` become `FlattenedRow` (adds `depth`, `parentId`, `hasChildren`, `isExpanded` on top of
   `ExpandableRow`'s `id`/`children`/index signature). There is no `TData` generic anywhere in this chain —
   `ExpandableRow` already allows arbitrary extra fields via its `[key: string]: any` index signature, so no generic
   parameter is needed to carry the caller's row shape through.

3. **WeakMap cell metadata cache** — `new WeakMap<object, Map<string, CellMetadata>>()` prevents computing `cellClass`,
   `cellStyle`, and other per-cell callbacks on every render cycle. Cache key is the row object. Reset when
   `displayData` changes.

4. **`VTable.vue` does NOT use Vue 3.5+ reactive prop destructuring** — despite that being the codebase-wide
   convention (`vue-syntax.instructions.md` Rule 2), the actual current code is
   `const props = withDefaults(defineProps<TableProps>(), {...})`, accessed via `props.x` throughout. This is existing,
   established style in this specific large file — match it when editing `VTable.vue` itself; don't unilaterally convert
   it to destructuring as an unrelated refactor. (`TableProps` is non-generic, per Invariant #1 — no `<TData>` here
   either.)

5. **No color tokens in table SCSS** — structural SCSS only (layout, grid, z-index, position, transitions). All colors
   come from CSS variables defined outside the table (design tokens). Never hard-code colors inside table SCSS files.

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

### `useTableCellMetadata(options: UseTableCellMetadataOptions)`

```
Options:
  isExpandable: MaybeRefOrGetter<boolean>       — whole-table "has any expandable rows" flag
  isRowExpandable: (row: ExpandableRow) => boolean — per-row check (delegates to useExpandableTable)

Returns:
  getCellValue: (value, column, row) => unknown         — formatted display value (used for totalRow)
  getCellClass: (value, column, row) => string | undefined — formatted class (used for totalRow)
  getCellMetadata: (row, column, colIndex, rowIndex) => CellMetadata
```

`getCellMetadata` is the hot path for regular (non-total) rows: it computes `formattedValue`,
`cssClass` (format class + `column.cellClass`), `titleText`, `indentStyle` (depth-based, first
column only), `customStyle` (`column.cellStyle`), and `isExpandable` (first column only) in one
pass, cached in a `WeakMap<row, WeakMap<column, CellMetadata>>` keyed by row/column object
identity — new row or column objects naturally invalidate the cache, no manual reset needed.
Owns its own `useTableFormatters()` call internally.

### `useTableColumnConfig(options: UseTableColumnConfigOptions)`

```
Options:
  columns:     MaybeRefOrGetter<Column[]>              — full column list (props.columns)
  columnSetup: MaybeRefOrGetter<ColumnSetupAction>      — toolbar.actions.columnSetup (false | string | object)
  columnPicker: MaybeRefOrGetter<ColumnPickerAction>    — toolbar.actions.columnPicker (false | object)

Returns:
  columnSetupEnabledBasic: ComputedRef<boolean>         — string/object action, WITHOUT the hasGroups gate
  columnSetupConfig:       ComputedRef<ColumnSetupConfig>
  columnSetupPopoverRef:   Ref<{ close: () => void } | null> — bind via VFloating's ref="columnSetupPopoverRef"
  columnPickerPopoverRef:  Ref<{ close: () => void } | null> — bind via VFloating's ref="columnPickerPopoverRef"
  handleVisibleColumnsUpdate: (columns: Column[]) => void
  handleColumnSetupClose:  () => void
  handleColumnPickerClose: () => void
  columnPickerEnabled:     ComputedRef<boolean>
  columnPickerConfig:      ComputedRef<ColumnPickerAction (object) | null>
  effectiveColumns:        ComputedRef<Column[]>        — visible/ordered columns, fixed-left/right sorted to edges
```

Owns the async storage-restore of persisted column visibility/order (`readColumnState` from
`utils/columnState.ts`, three-level fallback: `props.columns` → column-picker item → `saved.labels`)
and the two column popover component refs. The eager `loadColumnsFromStorage().then(...)` call
fires at composable-setup time (a deliberate, commented exception to the no-top-level-side-effects
rule) — deferring it to `onMounted` would delay the restore by a tick and cause a visible flash of
unfiltered columns before the persisted selection applies.

**Does NOT own** `columnSetupEnabled` (the final gate combining `columnSetupEnabledBasic` with
`hasGroups`) — that stays in `VTable.vue` because `hasGroups` comes from `useGroupedHeaders`, which
is itself fed by this composable's `effectiveColumns`; folding the gate in here would create an
import cycle between the two composables.

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

###
`useVirtualTable(scrollContainerRef: Ref<HTMLElement | null>, data: Ref<Record<string, unknown>[]>, options?: VirtualTableOptions)`

```
Options:
  estimateSize?: number   (default: 48)
  overscan?: number       (default: 5)
  measureElement?: boolean (default: false — keep false for perf)

Returns:
  virtualizer: Virtualizer
  virtualItems: ComputedRef<VirtualItem[]>
  totalSize: ComputedRef<number>
  remeasure: () => void   — forces virtualizer.measure() + dispatches a synthetic
                            scroll event; does NOT attach/detach scroll listeners.
                            Use after the scroll element's own size changed outside
                            of a real scroll event (e.g. a fullscreen toggle).
```

### `useTablePage(resetOn: WatchSource[] = [])`

```
Returns: page Ref<number> (1-based)
Side effect: provides TABLE_PAGE_KEY injection key
Auto-resets page to 1 when any resetOn source changes.
```

### `useTableFullScreen(options: UseTableFullScreenOptions)`

```
Options:
  wrapperRef: Ref<HTMLElement | null>       — the `.v-table-wrapper` element to measure/transform
  isEnabled: MaybeRefOrGetter<boolean>      — whether the toolbar button is shown
  placeholderRef?: Ref<HTMLElement | null>  — element reserving the wrapper's original in-flow
                                               slot while fullscreen is active; its live rect is
                                               preferred over the cached open-time rect when
                                               computing the exit FLIP target, so exit lands
                                               correctly even if the page scrolled/resized/reflowed
                                               while fullscreen was open
  chromeRefs?: ReadonlyArray<Ref<HTMLElement | ComponentPublicInstance | null>>
                                             — elements whose rendered height must be excluded
                                               from the fullscreen panel's content area (e.g. a
                                               toolbar, pagination). The composable stays
                                               ignorant of the table's anatomy — it just sums
                                               whatever heights it's handed and exposes the
                                               result via `contentHeight`. A ref may hold a plain
                                               HTMLElement or a component instance (its `$el` is
                                               used). Measured before `isFullscreen` flips, inside
                                               `enter()`, and re-measured on window `resize`
  onToggle?: (isFullscreen: boolean) => void | Promise<void>

Returns:
  isFullscreen: Readonly<Ref<boolean>>
  isEnabled: ComputedRef<boolean>
  zIndex: ComputedRef<number>               — from the shared useModal registry
  placeholderStyle: ComputedRef<{ width: string, height: string } | null>
                                             — inline size for the placeholder element (both
                                               dimensions, from the cached open rect); null when
                                               not fullscreen (don't render the placeholder then)
  panelStyle: ComputedRef<Record<string, string> | null>
                                             — inline top/left/width/height (px) for the
                                               fullscreen panel, computed arithmetically from
                                               innerWidth/innerHeight (5%/90% inset split)
                                               BEFORE isFullscreen flips, so the first fullscreen
                                               render already has final geometry — never measured
                                               from the DOM. null when not fullscreen. Bind onto
                                               the wrapper element.
  contentHeight: ComputedRef<number>        — ready-to-use scroll-area height in px: panel height
                                               minus the summed height of `chromeRefs` elements
                                               (0 when not fullscreen). Both inputs are measured/
                                               computed before `isFullscreen` flips (see `enter()`),
                                               so consumers just pick between this and their
                                               normal-mode height — no arithmetic on the consumer
                                               side, no provisional "100%" frame
  toggle: () => void                        — called by the toolbar button; measures chromeRefs
                                               and the panel geometry before flipping the flag —
                                               do not bypass this by calling some other toggle
                                               directly, or the first fullscreen render will use
                                               stale/zero measurements
  close: () => void                         — called by backdrop click / Escape
```

Geometry is computed, never measured: earlier revisions measured `wrapperRef.offsetHeight`
via a ResizeObserver to size the panel — `offsetHeight` is border-box, and the wrapper has a
1px border, so each observer tick added 2px and the panel grew without bound. The composable
now derives the panel box purely from `window.innerWidth`/`innerHeight`, recomputed only on a
`resize` listener (pure arithmetic, cannot feed back into layout).

The chrome-height measurement (`chromeRefs` → `contentHeight`) and the panel-geometry
computation happen together inside `enter()`, both before `isFullscreen.value = true` — this is
what makes the first fullscreen render's FLIP animation measure a settled layout instead of a
provisional one that changes size again a tick later. This ordering is structural (inside the
composable), not a convention the consumer has to remember to uphold by calling a wrapper
function before `toggle()`.

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

### `useLinkedTables(id, linkedIds, options?): UseLinkedTablesReturn`

Links multiple VTable instances by string ID via a module-level registry. Synchronizes scroll position (X+Y) and
pagination across all linked tables regardless of component tree position.

```
Parameters:
  id:         string            — unique ID for this table in the registry
  linkedIds:  string[]          — IDs of sibling tables to sync with (self-ID filtered automatically)
  options?:   LinkedTablesOptions

Options (discriminated union):
  paginationMode: 'sync'        → totalPages: Ref<number> REQUIRED (TypeScript-enforced)
  paginationMode: 'independent' → pagination not synced (default)
  paginationMode: 'reset'       → linked tables reset to page 1 on navigation
  initialPage?: number          — starting page (default: 1)
  namespace?: string            — isolates registry keys, e.g. 'reports-page:table-a'
  resetOn?: MaybeRefOrGetter<unknown> — auto-calls resetState() when value changes

Returns: UseLinkedTablesReturn
  link:        LinkedTableBindings   — spread onto VTable via v-bind (page, onUpdate:page, scrollSync)
  resetState:  (page?: number) => void — resets page + scroll (X+Y) to zero for this table AND all linked tables
```

**Consumer pattern:**

```ts
const { link, resetState } = useLinkedTables("table-a", ["table-b"], {
  paginationMode: "sync",
  totalPages: computed(() => Math.ceil(total.value / PAGE_SIZE)),
  resetOn: filters,        // auto-reset when filters change
});

// Manual reset (e.g. on route change):
watch(route, () => resetState());
```

```vue
<VTable v-bind="link" :columns :data />
```

**Architecture notes:**

- Registry is a module-level `Map<string, LinkedTableEntry>` — shared across all component trees in the same JS module
  instance. Instances in different files share the same registry as long as they import the same module.
- `onScopeDispose` (not `onUnmounted`) handles cleanup — works in components and manual `effectScope()`.
- Scroll loop prevention: `isReceivingScroll` plain boolean flag + `nextTick` reset. When table A scrolls → sets flag on
  targets → watcher writes DOM → browser fires scroll event on target → flag is true → short-circuit.
- Late mount: `register(el)` syncs scroll from first available sibling's current position.
- `scrollSync` prop on VTable must be provided at component creation time — changing from `undefined` to a value after
  mount has no effect (conditional watcher is created once at setup).
- `resetState` is NOT included in `link` / `LinkedTableBindings` — it would otherwise be spread as an unknown prop via
  `v-bind`. Always destructure it separately.

**Pagination mode behavior:**

| Mode          | Linked tables go to                             |
|---------------|-------------------------------------------------|
| `sync`        | Same page, clamped to each table's `totalPages` |
| `reset`       | Page 1                                          |
| `independent` | Unchanged                                       |

---

## Utils Reference

### `readColumnState(key: string, type?: StorageType): Promise<SavedColumnState | null>`

### `writeColumnState(key: string, state: SavedColumnState, type?: StorageType): Promise<void>`

The single shared contract for the persisted column visibility/order/pin/label state. Both
wrap `utils/storage.ts`'s `tableStorage` singleton, encapsulating its `setStorageType(type)`-
then-read/write call ordering (the singleton mutates module-global state, so ordering matters
when different tables use different storage types).

```ts
export interface SavedColumnState {
  visible: string[]
  order: string[]
  fixed?: Record<string, "left" | "right">
  labels?: Record<string, string>
}
```

Neither function try/catches or logs — callers (`VTable.vue`, `TableColumnSetup.vue`,
`TableColumnPicker.vue`) differ in error-handling detail (console.warn vs console.error,
differing messages, some falling through to a no-saved-state default) and keep their own
try/catch around the call. `VTable.vue` only reads (it doesn't write column state itself —
the two dialog components own writing). `TableColumnSetup.vue` writes without `labels`;
`TableColumnPicker.vue` writes with `labels` — `writeColumnState` doesn't force either shape,
it persists exactly the `SavedColumnState` object it's given.

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

### `TableBackdrop`

```
Props:
  active:   boolean          — mounts/unmounts the backdrop div (v-if + Transition)
  zIndex:   number           — from useTableFullScreen's zIndex
Emits: click
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

1. Add the prop to `TableProps` in `types/props.ts`
2. Destructure it in `VTable.vue` via `defineProps<TableProps>()`
3. Pass it to the relevant subcomponent or composable

### Adding a New Emit

1. Add to `TableEmits` in `types/props.ts` as a function intersection entry:
   ```ts
   & ((e: "my-event", payload: MyPayload) => void)
   ```
2. Add the event to `defineEmits<TableEmits>()` in `VTable.vue`
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

- Reintroducing a `generic="TData..."` attribute on `VTable.vue`, or the old runtime
  `defineEmits([...]) as unknown as TableEmits<TData>` cast workaround, without first confirming the component has
  actually become generic again (see Invariant #1)
- Inline styles in subcomponents — use CSS variable binding or class binding
- Hard-coded colors in table SCSS — all colors via CSS variables
- `reactive()` return from composables — loses type inference on destructuring. Exception: `useLinkedTables`
  intentionally returns `reactive({...})` as the `link` binding object because it is used with `v-bind` (not
  destructured). This is the only case. **`scrollSync` inside is wrapped with `markRaw()`** — `reactive()` deep-wraps
  nested objects and auto-unwraps their Refs, which would silently break `watch(props.scrollSync.scrollPosition, ...)`
  in VTable (the watcher would receive a plain value instead of a Ref and never fire). `markRaw` prevents this proxy so
  `scrollPosition` arrives as a real `Ref`.
- `props.x` access after destructuring — banned by Vue 3.5+ rules
- `any` in composable signatures (not default generics) — use `unknown` + type guards
- Side effects at composable top level — put inside `onMounted` or watchers
