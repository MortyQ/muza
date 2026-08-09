# VTable — `@muzakit/ui` table component

A generic, virtualized data table. This file is a map of the directory for
anyone — human or agent — working inside `libs/ui/src/components/table/`.

> **Extending VTable internals?** `.agents/skills/vtable/SKILL.md` is the
> detailed contract: every composable signature, the invariants, the forbidden
> patterns. This README is the orientation map. Where the two disagree, the
> source wins and both should be corrected.
>
> A previous revision of this file was carried over from `so-platform`
> (`libs/core`, consumed by `pim-client` / `insights-client` / `tools-client`)
> and described that codebase, not this one. If you find a note claiming
> `VTable.vue` is non-generic, or referring to `useTableCellMetadata` /
> `useTableColumnConfig`, it came from there.

---

## What VTable is

`VTable.vue` is one generic SFC — 1412 lines — composing 13 headless
composables and 21 rendering-only subcomponents:

- Virtualized rendering (TanStack Virtual) over CSS Grid with
  `display: contents` rows
- Column resize, sticky columns on both edges, multi-level grouped headers
- Client or server sort (single and multi), client or server pagination
- Tree data with automatic depth-first flattening
- Multi-select, independent or parent/child-dependent
- A pinned cross: one row and one column highlighted independently
- Fullscreen with a FLIP grow/shrink animation
- Toolbar: search, refresh, reset-sort, export, column setup, column picker
- Cell formatting via `column.format` (currency, %, number, date, boolean,
  file size)
- Cross-table linking: synced scroll, pagination and highlight between sibling
  instances

App code touches `VTable` through props, emits and slots. Nothing else in this
folder is meant to be imported directly, except the subcomponents the barrel
exports for standalone use: `DeltaValue`, `DeltaIndicator`, `TablePeriodSelect`,
`TableTitleBlock`, `TableEmptyState`, `TableFullscreenToggle`, `TablePinButton`,
`TableLoadingOverlay`, `TableExpandAdditionalHeadersButton`.

---

## Directory map

```
table/
  VTable.vue          ← the component; all orchestration lives here
  composables/        ← 13 files, reactive logic, one concern each
  components/         ← 21 subcomponents, rendering only
  types/              ← 5 files
  utils/              ← storage.ts, columnState.ts
  assets/styles/      ← 16 partials composed by table.scss, plus two standalone
```

### `composables/` (13)

| File | Purpose |
|---|---|
| `useColumnResize.ts` | Width state, rAF-throttled drag resize, double-click reset, `gridTemplateColumns` |
| `useFixedColumns.ts` | Sticky left/right offsets, z-index, shadow-edge detection |
| `useGroupedHeaders.ts` | `children` → leaf columns + one header row per depth |
| `useExpandableTable.ts` | Tree data → depth-first `FlattenedRow[]` + expand state |
| `useTableFormatters.ts` | Dispatcher: `column.format` → the right formatter in `@muzakit/utils` |
| `useTableHighlight.ts` | The pinned cross — one row, one column, independently |
| `useTableSelection.ts` | Multi-select, independent or dependent mode |
| `useTableSort.ts` | Sort state, then either sort locally or ask for a refetch |
| `useVirtualTable.ts` | TanStack Virtual wrapper |
| `useTablePage.ts` | `page` ref + `TABLE_PAGE_KEY` provide/inject (page mode 3) |
| `useTableFullScreen.ts` | FLIP fullscreen, chrome measurement, placeholder, Escape |
| `useTablePeriodSelect.ts` | Month/week/day dropdown → API request params |
| `useLinkedTables.ts` | Cross-table scroll, page and highlight sync via a module registry |

Signatures live in the skill's **Composables Reference**. Several differ from
what their names suggest — `isRowSelected` takes an id, `isLastLeftFixed` takes
a key, `getGroupWidth` returns a number — so check there before guessing.

### `components/` (21, barrel-exported via `components/index.ts`)

| Component | Role |
|---|---|
| `TableRow` | `display: contents` row wrapper |
| `TableCell` | Data cell: alignment, depth indent |
| `TableCheckboxCell` / `TableHeaderCheckbox` | Row and select-all checkboxes |
| `TableHeaderSimple` | Flat header row |
| `TableHeaderGrouped` / `TableHeaderGroup` | Multi-level header rows / group label cell |
| `TableHeader` | One header cell: label, sort control, resize handle, tooltip |
| `TablePagination` | Bottom pagination bar |
| `TableEmptyState` | Centred overlay when there are no rows |
| `TableLoadingOverlay` | Backdrop + spinner while loading |
| `TableToolbar` | Top toolbar: title, search, actions, slot arbitration |
| `TableColumnSetup` | Visibility / reorder / pin dialog |
| `TableColumnPicker` | Two-panel dialog: catalogue on the left, chosen set on the right |
| `TableFullscreenToggle` / `TableBackdrop` | Fullscreen button and its dim layer |
| `TablePinButton` | The highlight pin, on rows and header cells |
| `TableExpandAdditionalHeadersButton` | Chevron toggle; exported but not used internally |
| `DeltaValue` / `DeltaIndicator` | Value + delta with arrow; also usable standalone |
| `TablePeriodSelect` | Period dropdown, pairs with `useTablePeriodSelect` |
| `TableTitleBlock` | Section header (title + slot for toggles) |

### `types/` (5)

| File | Contents |
|---|---|
| `index.ts` | `Column<TData>`, `CellContext`, `HeaderContext`, `HeaderCell`, `ExpandableRow`, `FlattenedRow`, sort types, `PaginationConfig`, `RequestPayload`, highlight types (`HighlightConfig`, `HighlightCoordinate`, `TableHighlightState`, `HighlightSyncController`), linked-table types (`ScrollSyncController`, `LinkedTableBindings`, `LinkedTablesOptions`, `UseLinkedTablesReturn`), and the legacy `TableHeader` / `TableRow` shapes kept for the XLSX export helpers |
| `props.ts` | `TableProps<TData>`, `TableEmits<TData>`, `RowClassNameFunction` |
| `format.ts` | `ColumnFormatOptions` and its formatter unions |
| `selection.ts` | `MultiSelectConfig`, `SelectionMode`, `CheckboxState` |
| `toolbar.ts` | `ToolbarConfig`, `ExportFormat`, `ColumnPickerItem`, `ColumnPickerGroup` |

### `assets/styles/`

`table.scss` is what `VTable.vue` loads. It composes, in order:

```
variables                          → sizing/spacing $-variables, no colours
wrapper, grid                      → outer wrapper, grid structure
header, row, cell, total           → table element structure
fixed, highlight, pagination, fullscreen → the feature layers
utilities, overlay, sort, loader, toolbar → helpers and chrome
```

`column-setup.scss` and `column-picker.scss` sit outside that chain: each is
loaded by its own component, because both dialogs are portalled to `<body>` by
VFloating and their rules have to be global to reach the markup at all.

**Hard rule:** no colour literals anywhere under `assets/styles/`. Structure
only; every colour is a `--ui-*` token. `_variables.scss` holds `$`-variables
for sizes exclusively.

---

## Data flow inside `VTable.vue`

1. **Columns.** `columns` → `effectiveColumns` (swapped for `visibleColumns`
   once the column setup or picker has produced a selection, including the
   async restore from storage) → `useGroupedHeaders` splits it into
   `flatColumns` / `headerLevels` when any column has `children` →
   `columnsForData` is what actually renders. `columnSetupEnabled` gates on
   `hasGroups`: the setup dialog is not implemented for grouped headers and
   logs a warning instead.
2. **Widths.** `useColumnResize` owns `resizedWidths`; a `watch` merges it with
   the static `px` widths into `columnWidths`, which `useFixedColumns` uses for
   sticky offsets. Flex columns are deliberately absent from that map.
3. **Sort.** `sortStateRef` is a get/set computed over `sortState` that emits
   `update:sort-state`. `useTableSort` either sorts locally (`sort.type ===
   "front"`) or emits `request` for the caller to refetch.
4. **Page.** Three modes coexist, resolved by the `pageRef` computed:
   - `@request` alone — nothing bound, display driven by `pagination`
   - `v-model:page` — `page` is bound, synced through `update:page`
   - `useTablePage()` — a page ref injected under `TABLE_PAGE_KEY`
5. **Data.** `dataToDisplay` picks sorted or raw data and fills in an `id` for
   any row missing one, recursively — expand and select both key on it. Then
   `useExpandableTable` flattens the tree, and `displayData` is the flat list
   feeding selection and virtualization.
6. **Virtualization.** `useVirtualTable(scrollContainerRef, displayData, {
   estimateSize: rowHeight, overscan: 2, measureElement: false })`.
   `measureElement` is off on purpose: fixed row heights are dramatically
   cheaper, at the cost of a slightly inaccurate scrollbar once rows expand.
7. **Cells.** `getCellMetadata(row, column, colIndex, rowIndex)` computes the
   formatted value, class, title, indent and expandability in one pass, cached
   in a `WeakMap<row, Map<cacheKey, CellMetadata>>` and provided down as
   `tableCellMetadata` so `TableCell` resolves its own rather than having VTable
   call it four times per cell in the template.
8. **Highlight.** `normalizeHighlight` flattens the `boolean | HighlightConfig`
   union once; `useTableHighlight` owns what is pinned; `buildHighlightState`
   resolves it against the current rows and columns on every change, so a
   column hidden by the picker reports as null without any watcher.
9. **Linked tables.** When `scrollSync` / `highlightSync` are present (from
   `useLinkedTables`), `onMounted` registers the scroll container and the
   highlight receiver, and `onUnmounted` unregisters both.

---

## Sharp edges (verified against the current source)

- **`VTable.vue` IS generic**, and its emits depend on a cast:
  `defineEmits([...]) as unknown as TableEmits<TData>`. `defineEmits<TableEmits<TData>>()`
  does not work inside a `generic=` SFC — the compiler only resolves the last
  overload of a function-intersection type. Do not "simplify" it.
- **`VTable.vue` redeclares `SavedColumnState` locally** and calls
  `tableStorage.getTableConfig` directly, rather than using `readColumnState`
  from `utils/columnState.ts`. Only `TableColumnSetup` and `TableColumnPicker`
  went through that helper. The shapes agree today; nothing enforces it.
- **`scrollSync` and `highlightSync` must be present at creation.** Both are
  registered once in `onMounted`; going from `undefined` to a value afterwards
  does nothing. The same applies to `v-model:highlight-state` in the input
  direction.
- **`rowsToRender` returns `[]` until the scroll container is measured.** That
  guard is what stops the whole dataset rendering on first paint — and it is
  why any jsdom test of VTable has to pass `virtualized: false`.
- **Row keys must be `row.id`, never the index.** An index key makes Vue reuse
  a component across different rows at the same position, carrying state with
  it.
- **Every Map and Set is replaced, never mutated** — `resizedWidths`,
  `expandedRows`, `selectedIds`. Vue does not track in-place mutation of
  either.
- **The `useLinkedTables` registry is module-level**, shared by every tree that
  imports the module, and cleaned up through `onScopeDispose`. `resetState` is
  kept out of the `link` object on purpose, so `v-bind="link"` cannot spread it
  as an unknown prop.
- **Column setup is disabled when the header has groups**, with a console
  warning. Not yet implemented for that case.
- **Three unscoped `<style>` blocks, each justified in a comment above it.**
  VTable's rules have to reach elements its subcomponents render; the two
  dialogs are portalled out of the subtree entirely.

---

## Tests

Under `libs/ui/tests/`, with `.agents/instructions/testing.md` § "The table"
covering the layers and the traps. Fixtures come from `tests/setup/table.ts`;
composables are exercised through `withScope()` rather than by mounting a host.

The two things that cost the most time to rediscover: a jsdom test of VTable
must turn virtualization off, and a browser test must render the table in place
— re-parenting it after mount invalidates the rect TanStack measured on its
first frame.

---

## Where to go next

- Adding a prop, emit, composable, subcomponent or SCSS file →
  `.agents/skills/vtable/SKILL.md` § "Extension Points" and § "Forbidden
  Patterns".
- Consuming VTable in a feature → `TableProps` / `TableEmits` from `types/` are
  all you need; the composables are an implementation detail.
- Visual changes → also apply the `emil-design-eng` guidance per
  `.agents/claude/behavior.md`.
