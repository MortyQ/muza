# Proposal

## Why

The reviewer's full audit left one critical finding open: R-TS-01, `any` in
`libs/ui/src/components/table/types/index.ts`. `VTable.vue` is already generic over its row type
(`<script generic="TData …">`), and `TableProps<TData>` / `TableEmits<TData>` already carry it. The
`any` sits in the shared types underneath: the defaults of `Column` and `CellContext`, the index
signature of `ExpandableRow`, and the unused `TableRow` type. Because of it, a consumer reading
`row.anything` on an `ExpandableRow` gets no type checking. Untyped columns also hand their
callbacks an `any` row.

## What Changes

- `Column<TData>` and `CellContext<T>` default to `Record<string, unknown>` instead of `any`.
  Column callbacks stay assignable across row types, so a `Column<Product>` still fits wherever
  the table takes a plain `Column`.
- **BREAKING (types only)** — `ExpandableRow`'s index signature becomes `unknown` instead of `any`.
  - Declared fields keep their types.
  - Reading an undeclared field now yields `unknown`, and code that used it as a string or
    number has to declare its row shape.
  - Runtime behaviour is unchanged.
- The legacy `TableHeader` / `TableRow` types are removed. Nothing in `libs/` or `apps/` uses
  them, and `@muzakit/ui` does not export them.
- The table internals that relied on the `any` are updated, along with the dashboard's
  `TableDemoPage`. The `vtable` skill's note that "VTable is not generic" is corrected.
- Affected packages: `@muzakit/ui` (`libs/ui`) and `@muzakit/dashboard` (`apps/muzakit-dashboard`,
  demo page only).
- **Public API:** the types `Column`, `CellContext` and `ExpandableRow` change, as described
  above. Props, emits, slots and tokens do not change. Add an entry to `libs/ui/CHANGELOG.md`.

**Out of scope:**
- Relaxing `VTable`'s `TData extends Record<string, unknown>` constraint so that interfaces
  without an index signature are accepted.
- Making `ExpandableRow.id` required. The `row.id!` in `useTableSelection` stays.
- The runtime `defineEmits` array cast, a Vue compiler limitation that is documented in
  `VTable.vue`.
- Any visual or behavioural change to the table.

## Capabilities

### New Capabilities
- `ui-table-row-typing`: how `@muzakit/ui`'s table types the rows it receives, covering column
  callbacks, cell slots, events and the default when no row type is given.

### Modified Capabilities
None. `openspec/specs/` holds no table capability yet.

## Impact

- `libs/ui/src/components/table/types/index.ts`, `types/selection.ts`, `types/props.ts`.
- `VTable.vue` and the table composables: `useTableSelection`, `useExpandableTable`,
  `useTableCellMetadata`, `useTableColumnConfig` and `useTableSort`.
- `apps/muzakit-dashboard/src/pages/TableDemoPage.vue`.
- `.agents/skills/vtable/SKILL.md`, `libs/ui/CHANGELOG.md`.
- External consumers that read undeclared fields off an `ExpandableRow` get type errors after
  upgrading. No runtime impact.
