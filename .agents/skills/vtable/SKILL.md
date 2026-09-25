---
name: vtable
description: Use when rendering, configuring or debugging a VTable from @app/core in any app — defining columns, cell slots, pagination, sorting, selection, row actions, empty/loading states — or when hitting TS4104 / "readonly array" / "not assignable to ExpandableRow[]" on the data prop, or pages not syncing. Also the entry point when modifying VTable itself under libs/core/src/components/table.
---

# VTable

`VTable` is the shared data table in `@app/core`, used by every app. This skill covers **consuming**
it. Changing the component itself is a different job — see [Extending VTable](#extending-vtable).

Source of truth for the contract: `libs/core/src/components/table/types/props.ts` (`TableProps`,
`TableEmits`) and `types/index.ts` (`Column`, `PaginationConfig`). Read those before inventing a prop.

## Quick reference

| Need | How |
|---|---|
| Columns | `:columns="Column[]"` — `{ key, label, width?, align?, sortable?, format?, fixed? }` |
| Rows | `:data="ExpandableRow[]"` — **mutable array, see gotcha below** |
| Custom cell | `<template #cell-<columnKey>="{ value, row, rowIndex }">` |
| Row click | `@row-click="(row) => …"` — payload is `Record<string, unknown>`, cast at the boundary |
| Loading | `:loading="true"` — renders the built-in overlay; don't hand-roll one |
| Empty state | built in (`TableEmptyState`) — don't wrap the table in your own `v-if="!rows.length"` |
| Fixed column | `fixed: "left" | "right"` on the column |
| Actions column | a normal column with `width: "flex"` + a `#cell-actions` slot |
| Selection | `v-model:selected-rows` + `:multi-select="MultiSelectConfig"` |
| Sorting | `:sort="{ type: 'front' | 'server', multiple }"`, `v-model:sort-state` |
| Page size | `v-model:page-size` — bind when the size *is* a request `limit` |
| Toolbar search | `toolbar.search` + `v-model:search` — the built-in input debounces itself |

Defaults worth knowing: `virtualized: true`, `rowHeight: 50`, and **`sort` defaults to
`{ type: "server", multiple: true }`** — a table that "doesn't sort" is usually one that expected
client sorting but never got `sort: { type: "front" }`.

## Gotcha 1 — `data` is a mutable array

`TableProps.data` is `ExpandableRow[]`. Passing a readonly prop straight through fails:

```
TS4104: The type 'readonly EmailDelivery[]' is 'readonly' and cannot be assigned to the mutable type 'ExpandableRow[]'
```

Do **not** "fix" this by widening your own prop away from `ReadonlyArray` — props stay readonly
(TypeScript Rule 15). Copy into a `computed` instead:

```ts
// ✅ correct — prop stays readonly, VTable gets its mutable array
const { deliveries } = defineProps<{ deliveries: ReadonlyArray<EmailDelivery> }>();

const rows = computed(() => [...deliveries]);
```

```vue
<VTable :columns :data="rows" :loading />
```

`ExpandableRow` carries an index signature (`[key: string]: any`), so most row shapes assign to it
without a cast. Going the other way — the `row-click` payload back to your type — does need one,
because `Record<string, unknown>` doesn't structurally overlap enough for a single `as`:

```ts
const onRowClick = (row: Record<string, unknown>): void => {
  emit("select", row as unknown as EmailDelivery);
};
```

## Gotcha 2 — every row needs a stable `id`

Rows are keyed by `row.id`, never by index: index keys make Vue reuse components across different
rows at the same position and leak state. VTable auto-assigns an `id` to rows missing one, but if
your rows already have a natural id, make sure it lands on the `id` field.

## Gotcha 3 — pagination is built for the server

`pagination?: PaginationConfig` is documented in the source as **server-side only**. `total` is its
only required field: `page` and `pageSize` are outranked whenever an owner exists (`v-model:page` /
`useTablePage()` for the page, `v-model:page-size` for the size), so passing them there is dead
weight. `showSizeChanger` defaults to whether `pageSizeOptions` was passed — hand it the options
and the changer appears.

There are three coexisting page modes — pick one deliberately, mixing them breaks sync:

| Mode | Wiring | Use when |
|---|---|---|
| 1 | `@request` only, no `page` prop; display driven by `props.pagination` | server pagination, table owns the page |
| 2 | `v-model:page` | you own the page ref |
| 3 | `useTablePage()` injection via `TABLE_PAGE_KEY` | linked tables (`useLinkedTables`) |

**There is no built-in client-side pagination mode.** When the endpoint has no `page`/`offset`, ask
what its `limit` means before writing anything — the answer picks the pattern, and the wrong one
ships a pager that lies.

### Case A — `limit` caps the newest N, older rows are unreachable

Do not paginate. Bind `v-model:page-size` to the `limit`, and the pagination bar's size changer
*becomes* the limit control: one fetch, one page, and the "Showing 1–50 of 50" line is the whole
truth. A pager offering "page 2 of 3" over 50 fetched rows implies a page 2 on the server; there
isn't one.

Reference: `features/admin/communication/deliveries/` — `useDeliveries.ts` plus
`components/DeliveriesTable.vue`.

```ts
// constants.ts — one number is both the request limit and the page size
export const DEFAULT_LIMIT = 50;
export const LIMIT_OPTIONS = [25, DEFAULT_LIMIT, 100, 200];
```

```ts
// the table component — no @request handler, the model carries size changes
const limit = defineModel<number>("limit", { required: true });
```

```vue
<VTable
  v-model:page-size="limit"
  :data="rows"
  :pagination="{ total, pageSizeOptions: LIMIT_OPTIONS }"
/>
```

`page`, `pageSize` and `showSizeChanger` are all absent on purpose — see Gotcha 3.

### Case B — the endpoint returns the whole set and `limit` is a safety valve

Then paging in memory is real, and it is **mode 3**: `useTablePage` owns the page, the slice is a
computed. Do not reach for mode 1 — `@request` plus a local `ref(1)` plus a reset watcher is three
copies of what `useTablePage` does in one line (Rule 11 in `composables.instructions.md`).

The page lives in the composable, beside the filters that reset it:

```ts
const total = computed<number>(() => orders.value?.length ?? 0);

// `total` belongs in resetOn: a refetch returning a shorter list would otherwise leave the page
// pointing past its end. A refresh returning the same count keeps the reader where they were.
const page = useTablePage([status, brandShortName, total]);

const rows = computed<Order[]>(() => {
  const start = (page.value - 1) * PAGE_SIZE;
  return (orders.value ?? []).slice(start, start + PAGE_SIZE);
});
```

```vue
<!-- No `page` in the config — the injected ref outranks it (`pageRef`, VTable.vue:358) -->
<VTable
  :columns
  :data="rows"
  :pagination="{ total, pageSize: PAGE_SIZE }"
/>
```

`useTablePage` calls `provide()`, so the composable holding it is callable only from a component's
setup, and the VTable must be a descendant of that component.

Bonus: `.slice()` on a `ReadonlyArray` returns a mutable `T[]`, so this also resolves Gotcha 1 with
no extra copy.

Be honest in the UI when a `limit` caps the result set — rows past the cap are invisible, and a
pager reading "page 1 of 10" hides that there was ever an 11th page. Case A exists precisely so
that sentence has nothing left to warn about.

## Emits

`row-click`, `update:selected-rows`, `expand-click`, `update:sort-state`, `update:page`,
`update:pageSize`, `update:search`, `update:highlight-state`, `request` (unified server-side
payload: page, sort, …), `sort` (client sort), and toolbar events `toolbar:refresh`,
`toolbar:reset-sort`, `toolbar:export`.

Use `request` for server-side operations — it carries page and sort together, so you don't need to
listen to `update:page` and `update:sort-state` separately and race them. What it is *not* for is
anything a model already carries: with `v-model:page-size` bound, a `@request` handler that reads
`payload.pageSize` is a second path to the same state.

## Common mistakes

| Mistake | Fix |
|---|---|
| Widening a prop to `ExpandableRow[]` to silence TS4104 | Keep the prop readonly, spread into a `computed` |
| Custom empty state wrapper around the table | VTable already renders one |
| Custom loading spinner beside the table | Pass `:loading` |
| Raw `<span>` badge for a status cell | `VTag` in a `#cell-<key>` slot, `variant="outline"` in tables |
| Expecting client sort out of the box | `sort` defaults to `server` — pass `{ type: "front" }` |
| Mixing `v-model:page` with `@request` paging | Pick one page mode |
| `@request` handler reading `payload.pageSize` next to `v-model:page-size` | Drop the handler — the model already carries it |
| Own debounce around the toolbar search box | The built-in `VInput` debounces (800 ms) |
| Index as row key | Rows key on `row.id` |

## Extending VTable

Only when editing files under `libs/core/src/components/table/**` — adding a prop, emit, composable,
subcomponent or SCSS partial. **Read `internals.md` in this skill directory** for the component and
composable contracts, extension points and forbidden patterns.

Do not load `internals.md` merely to render a table in an app — it is ~850 lines of internals and
answers none of the questions above.

Two caveats when you do:
- `internals.md`'s SCSS file list is stale. `libs/core/src/components/table/README.md` has the
  current filenames; use `internals.md` for composable and component contracts.
- `VTable.vue` is **not** generic — `Column`, `TableProps`, `TableEmits` take no `TData`. Adding one
  is a real architecture change, not a bug fix; confirm intent with the user first.

For visual and interaction changes to the table, also apply the `emil-design-eng` skill, per
`.agents/claude/behavior.md`.
