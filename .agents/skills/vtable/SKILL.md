# Skill: VTable Developer — Extending VTable Functionality

## Metadata

| Field | Value |
|---|---|
| **name** | `vtable` |
| **description** | Deep reference for developers extending VTable internals: adding subcomponents, composables, SCSS, or new prop/emit contracts. Not for consuming the table — for building it. |
| **version** | 2.0 |
| **applies_to** | `libs/ui/src/components/table/**` |

## Auto-Activation Triggers

Apply this skill automatically when any of the following is true:

- Task involves editing any file inside `libs/ui/src/components/table/`
- The user says "extend the table", "add a feature to VTable", "add column
  functionality", "новый composable для таблицы", "расширить таблицу",
  "добавить в таблицу"
- The user wants to add a new prop or emit to `VTable.vue`
- The user wants to add a new composable under `table/composables/`
- The user wants to create a new subcomponent inside `table/components/`
- The user wants to add a new SCSS file or class under `table/assets/styles/`
- The user is debugging behavior inside the table rendering pipeline

---

## Role

You are a senior Vue 3 / TypeScript frontend engineer maintaining and extending
`VTable` — a generic, virtualized data table in `@muzakit/ui`.

You optimize for:

- Zero TypeScript errors (strict mode always on)
- Performance (WeakMap cell caching, virtual rendering, `display: contents` rows)
- Clean separation: composables own logic, components own rendering

---

## Architecture

```
VTable.vue (1412 lines, generic SFC — see Invariant #1)
│
├── Composables (13, pure reactive logic)
│   ├── useColumnResize       → width state + rAF-throttled drag resize
│   ├── useFixedColumns       → sticky offsets + z-index
│   ├── useGroupedHeaders     → multi-level header tree → flat rows
│   ├── useExpandableTable    → tree data → FlattenedRow[] + toggle state
│   ├── useTableFormatters    → value → display string (dispatcher only)
│   ├── useTableHighlight     → the pinned cross (one row, one column)
│   ├── useTableSelection     → multi-select + dependent mode
│   ├── useTableSort          → sort state + front/server routing
│   ├── useVirtualTable       → TanStack Virtual windowed rendering
│   ├── useTablePage          → page ref + TABLE_PAGE_KEY provide/inject
│   ├── useTableFullScreen    → FLIP expand/collapse + z-index + Escape
│   ├── useTablePeriodSelect  → period dropdown → API params
│   └── useLinkedTables       → cross-table scroll/page/highlight sync
│
├── Subcomponents (21, rendering only)
│   DeltaIndicator · DeltaValue · TableBackdrop · TableCell ·
│   TableCheckboxCell · TableColumnPicker · TableColumnSetup ·
│   TableEmptyState · TableExpandAdditionalHeadersButton ·
│   TableFullscreenToggle · TableHeader · TableHeaderCheckbox ·
│   TableHeaderGroup · TableHeaderGrouped · TableHeaderSimple ·
│   TableLoadingOverlay · TablePagination · TablePeriodSelect ·
│   TablePinButton · TableRow · TableTitleBlock · TableToolbar
│
├── types/  index.ts · props.ts · selection.ts · toolbar.ts · format.ts
├── utils/  storage.ts · columnState.ts
└── assets/styles/  16 partials + column-setup.scss + column-picker.scss,
                    composed by table.scss
```

---

## Key Invariants

1. **`VTable.vue` IS generic.** The SFC carries
   `generic="TData extends Record<string, unknown> = Record<string, unknown>"`,
   and `Column`, `TableProps`, `TableEmits` all take a `TData` parameter.
   *(Version 1.x of this skill claimed the opposite. It was wrong.)*

2. **`defineEmits` is a runtime array with a cast.** `defineEmits<TableEmits<TData>>()`
   does not work in a generic SFC — the compiler only recognizes the last
   overload of a function-intersection type. The workaround is deliberate:

   ```ts
   const emit = defineEmits([...]) as unknown as TableEmits<TData>;
   ```

   Do not "fix" this. The typing of every emit depends on the cast.

3. **`VTable.vue` uses Vue 3.5 reactive destructuring**, like the rest of the
   library. There is no `withDefaults` anywhere under `table/` any more.

4. **`FlattenedRow` is non-generic.** It extends `ExpandableRow`, which already
   carries an index signature, so the caller's row shape rides through without a
   type parameter.

5. **WeakMap cell metadata cache.** `getCellMetadata` caches per row object in a
   `WeakMap<row, Map<cacheKey, CellMetadata>>`. The key includes
   `!!column.cellClass` / `!!column.cellStyle`. A new row object invalidates
   naturally; nothing resets it manually.

6. **No colour literals in table SCSS.** Structure only — layout, grid, z-index,
   position, transitions. Every colour is a `--ui-*` token. `_variables.scss`
   holds `$`-variables for sizes exclusively.

7. **Three unscoped `<style>` blocks, all justified in a comment above them.**
   `VTable.vue`'s rules have to reach elements its subcomponents render;
   `TableColumnSetup` and `TableColumnPicker` are portalled to `<body>` by
   VFloating, where a scoped attribute selector matches nothing.

---

## Composables Reference

Signatures below are the real ones. Where an older note disagrees, the code wins.

### `useColumnResize(columns: Ref<Column[]>)`

```
gridTemplateColumns: ComputedRef<string>
getGridTemplateWithCheckbox: (checkboxWidth?: number) => string
resizedWidths: Ref<Map<string, number>>
isResizing: ComputedRef<boolean>
isColumnResizable: (col: Column) => boolean      // false only for width: "flex"
startResize: (columnKey: string, event: MouseEvent) => void
autoFitColumn: (columnKey: string) => void       // drops the override
getColumnWidth: (columnKey: string) => number | string
resetWidths: () => void
```

The drag is rAF-throttled: `mousemove` stores a pending width and one commit
happens per frame. `stopResize` flushes a pending frame before tearing down, or
the last few pixels of a fast drag are lost. Every write replaces the Map —
mutating it in place is invisible to Vue.

### `useFixedColumns(columns, columnWidths?)`

```
leftFixedColumns / rightFixedColumns / normalColumns: ComputedRef<Column[]>
getFixedStyles: (col: Column) => Record<string, string>   // { left } or { right }
isFixed: (col: Column) => boolean
isLastLeftFixed: (columnKey: string) => boolean           // takes a KEY
isFirstRightFixed: (columnKey: string) => boolean         // takes a KEY
getZIndex: (columnKey: string, column: Column) => number
```

Offsets accumulate in declaration order; a resized width wins over the declared
one, and a non-px width falls back to 150.

### `useGroupedHeaders(columns, columnWidths)`

```
hasGroups: ComputedRef<boolean>
flatColumns: ComputedRef<Column[]>          // leaves only
headerLevels: ComputedRef<HeaderCell[][]>   // one array per depth
getGroupWidth: (col: Column) => number      // a NUMBER, not a CSS string
getColspan: (col: Column) => number
isGroupFixed: (col: Column) => "left" | "right" | null
```

A leaf on level 0 gets `rowspan = maxDepth`; everything deeper gets 1.

### `useExpandableTable(data: Ref<ExpandableRow[]>)`

```
flattenedData: ComputedRef<FlattenedRow[]>   // depth-first
expandedRows: Ref<Set<string | number>>
toggleRow / expandAll / collapseAll
isExpandable: (row) => boolean               // children?.length || row.expandable
```

`hasChildren` on a flattened row and `isExpandable` deliberately disagree:
`hasChildren` needs `children.length` or `expandable && expandedContent`, while
`isExpandable` accepts `expandable` alone.

### `useTableFormatters()`

Returns `formatCellValue` plus the six formatters re-exported from
`@muzakit/utils`. `formatCellValue` is a **dispatcher**, in this order:
`formatter` → `currency` → `percentage` → `number` → `date` → `boolean` →
`fileSize`. Note the asymmetry: `currency: false` falls through, `percentage:
false` still formats (the guards were written differently).

### `useTableHighlight({ config, onChange? })`

Plus the standalone `normalizeHighlight(boolean | HighlightConfig | undefined)`.
`applyRemote` never calls `onChange` — that is what stops two linked tables
ping-ponging. `setPin` does.

### `useTableSelection({ config, flattenedData, selectedRows, onSelectionChange })`

`isRowSelected` takes an **id**, not a row. `selectChildren` / `selectParent`
are documented as defaulting to true but are read as plain truthy fields, so
omitting them behaves as false. With `selectOnlyVisible`, the walk starts with
`parentExpanded` hardcoded true, so the first level below a collapsed row still
counts as visible.

### `useTableSort({ sort?, sortState?, columns, page?, pageSize?, data?, onRequest?, onSort?, onUpdateSortState? })`

```
sortState: Ref<SortItem[]>
sortConfig: ComputedRef<Required<SortConfig>>     // default { server, multiple }
getSortState: (columnKey) => { isSorted, order, index }
handleSortClick: (column: Column) => void
hasSortedColumns: ComputedRef<boolean>
resetSort: () => void
sortedData: ComputedRef<T[]>                      // front mode only
```

A sort click always requests page 1; `resetSort` keeps the current page.

### `useVirtualTable(scrollContainerRef, data, options?)`

`{ virtualizer, virtualItems, totalSize, remeasure }`. Defaults:
`estimateSize: 50`, `overscan: 3`, `measureElement: false`. `remeasure` measures
and dispatches a synthetic scroll event; it does **not** touch listeners.

### `useTablePage(resetOn?: WatchSource[])`

Returns the page ref and provides it under `TABLE_PAGE_KEY`. On a reset it uses
`triggerRef` when already on page 1 — so read `page.value` inside an effect. A
value-comparing `watch` drops that notification.

### `useTableFullScreen({ wrapperRef, isEnabled, placeholderRef?, chromeRefs?, onToggle? })`

```
isFullscreen: Readonly<Ref<boolean>>   isEnabled: ComputedRef<boolean>
zIndex: ComputedRef<number>            placeholderStyle / panelStyle / contentHeight
toggle() / close()
```

Panel geometry is **computed from `window.inner*`, never measured** —
`PANEL_INSET_RATIO` is currently `0`, so the panel is full-bleed. Measuring the
wrapper is what caused the old unbounded-growth bug (`offsetHeight` is
border-box and the wrapper has a 1px border). `enter()` computes the geometry
and measures the chrome *before* flipping the flag, so the first fullscreen
render is already final.

### `useLinkedTables(id, linkedIds, options?)`

`{ link, resetState }`. `link` is `reactive({ scrollSync, highlightSync, page,
"onUpdate:page" })` — the only sanctioned `reactive()` return in the library,
because it is spread with `v-bind`. **Both controllers are `markRaw`'d**:
`reactive()` would unwrap `scrollPosition` into a plain value and VTable's
`watch` on it would never fire.

The registry is a module-level Map cleaned up by `onScopeDispose`. Pagination
modes: `sync` (clamped to each table's `totalPages`), `reset`, `independent`
(default). `resetState` ignores the mode — a manual reset moves everything.

---

## Utils Reference

`utils/storage.ts` — three adapters behind one async interface, plus the
`tableStorage` singleton. Default backend is IndexedDB via `keyv-browser`;
`setStorageType` mutates module-global state, which is why ordering matters.

`utils/columnState.ts` — `readColumnState` / `writeColumnState` wrap the
set-type-then-read ordering. Neither try/catches: the three call sites log
differently and one falls through to a default. `SavedColumnState` is a superset
— `TableColumnSetup` writes without `labels`, `TableColumnPicker` writes with.

---

## Extension Points

**A new prop** → add to `TableProps` in `types/props.ts`, destructure it in
`VTable.vue`'s `defineProps<TableProps<TData>>()`, pass it on.

**A new emit** → add a function-intersection entry to `TableEmits`, add the
event name to the runtime array in `defineEmits`, call `emit(...)`.

**A new composable** → `composables/useMyFeature.ts`, inputs as
`MaybeRefOrGetter<T>` + `toValue()`, explicit return type, cleanup registered
inside.

**A new subcomponent** → `components/MyComponent.vue`, script → template →
style, typed `defineProps<{…}>()` with reactive destructuring,
`ReadonlyArray<T>` for array props.

**A new SCSS file** → `assets/styles/_my-feature.scss`, `@use`d from
`table.scss`, structural rules only, `.v-table-` prefix.

---

## Testing

Full coverage lives in `libs/ui/tests/`; see `.agents/instructions/testing.md`
for the layers and the table-specific traps. The short version:

- Composables are tested through `withScope()` from `tests/setup/scope.ts`, not
  by mounting a host component.
- Fixtures come from `tests/setup/table.ts` — `makeColumns`, `makeRows`,
  `makeTreeRows`, `makeGroupedColumns`, `makeFixedColumns`, `makeTotalRow`.
- **Anything unit-testing VTable must pass `virtualized: false`.** jsdom reports
  zero for every measurement, so a virtualized table renders no rows at all —
  and the virtualizer re-measures itself into "Maximum recursive updates
  exceeded" while trying.
- Virtualization, sticky offsets, drag-resize and FLIP geometry belong to the
  browser project.

---

## Forbidden Patterns

- Removing the `generic=` attribute, or the `defineEmits([...]) as unknown as
  TableEmits<TData>` cast (Invariants #1 and #2)
- `withDefaults` — the whole directory is on reactive destructuring
- `props.x` after destructuring
- Inline styles in subcomponents — bind a CSS custom property instead
- Hard-coded colours in table SCSS
- `reactive()` returns from composables, except `useLinkedTables`'s `link`
- Mutating `resizedWidths` / `expandedRows` / `selectedIds` in place — every
  writer replaces the Map or Set
- `any` in composable signatures — `unknown` plus a type guard
- Side effects at a composable's top level. The one exception is
  `TableColumnSetup`'s eager storage restore, which is commented as such:
  deferring it to `onMounted` costs a visible flash of unfiltered columns.
