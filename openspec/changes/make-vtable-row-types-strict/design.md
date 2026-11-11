# Design

## Context

For motivation, see `proposal.md`, section Why. Current state:

- **`VTable.vue` is already generic.** It declares `<script generic="TData extends Record<string, unknown> = Record<string, unknown>">`, and the props, emits and slots carry `TData`. The `vtable` skill's claim that "`VTable.vue` is not generic" is out of date.
- **Four `any`s remain in `types/index.ts`:**
  - `CellContext<T = any>` and `Column<TData = any>`;
  - `ExpandableRow`'s `[key: string]: any`;
  - the legacy `TableRow = Record<string, any>`, used only by the equally unused legacy `TableHeader` interface. Neither is exported from `libs/ui/src/index.ts`.
- **Why the `Column` default is `any`.** The table's internals pass columns around as a bare `Column`, in about 76 places across the composables and subcomponents. A `Column<Product>` has to fit there. Its callbacks are declared as function-typed *properties* (`sortValue?: (row: TData, …) => …`), and `strictFunctionTypes` checks those contravariantly. So a `Column<Product>` is assignable to `Column<Record<string, unknown>>` only when the default is `any`.
- **`ExpandableRow`'s `any` index signature** is what lets internals read `row[column.key]` and lets the demo page treat `row.whatever` as a string. It is also why `VTable.vue` and `useTableCellMetadata` need `as unknown as` bridges between `TData & FlattenedRow` and `ExpandableRow`.
- **Unit tests are not type-checked.** `libs/ui/tsconfig.json` includes `src/**` only, so a type contract cannot be pinned by an ordinary `.spec.ts`.

Skills that apply:
- `vtable`: read `internals.md` before editing the composables, and correct the skill's stale caveat.
- `emil-design-eng` does not apply, since nothing visual changes.
- `use-api` does not apply.

## Goals / Non-Goals

**Goals:**
- Remove every `any` and every `eslint-disable … no-explicit-any` from the table's type files.
- Keep `Column<T>` assignable to `Column` without casts, both in internals and in consumer code.
- Pin the type contract in `spec.md` with a test that fails when it breaks.

**Non-Goals:**
- Removing the existing `as unknown as` bridges in `VTable.vue`. Any that become unnecessary are deleted; none are added.
- Relaxing the `TData` constraint, requiring `id`, and the emit cast. All three are listed as out of scope in the proposal.
- New components or a new file layout. The change edits existing files only, so no component decomposition is needed.

## Decisions

### D1 — Callbacks become method signatures

**What changes.** `sortValue`, `cellClass`, `cellStyle` and `onHeaderClick` on `Column`, and `isRowSelectable` on `MultiSelectConfig`, are declared with method syntax, e.g. `sortValue?(row: TData, key: string): unknown`. TypeScript checks method parameters bivariantly, so `Column<Product>` is assignable to `Column` while the default becomes `Record<string, unknown>`. Callers notice nothing, since a property holding an arrow function satisfies a method signature.

**[SKEPTIC]**
- Bivariance is the hole `strictFunctionTypes` was made to close. Internally a `Column` could call `sortValue` with a row of the wrong type, and the compiler would allow it.
- `@typescript-eslint/method-signature-style` may be turned on later and flag these lines.

**[ADVOCATE]**
- The table only ever calls a column's callbacks with rows from the same `data` the column came with. The unsoundness exists in the type system but cannot happen at runtime.
- The alternative is threading `TData` through 76 internal signatures and every subcomponent's props. That turns a type cleanup into a rewrite of the table's internals.
- The lint rule is not configured in `@muzakit/config`.

**Alternatives considered:**
- (a) Make every table composable and subcomponent generic. Rejected: the cost is a large diff in `libs/ui`'s largest area.
- (b) Default to `never`. Rejected: an untyped column would become unusable.
- (c) Keep `any` and add a comment. Rejected: that leaves the finding open.

**[VERDICT]** Method signatures. Each one gets a one-line comment naming the reason, so nobody "fixes" it back into a property.

### D2 — `ExpandableRow` gets an `unknown` index signature; internals read cells through one helper

**What changes.**
- `[key: string]: unknown`.
- Internals that read a dynamic key, mainly `row[column.key]`, already get `unknown` and already narrow it or pass it to formatters. Each one is fixed at the place it is used.
- The `as unknown as ExpandableRow` bridges in `useTableCellMetadata` and `VTable.vue` are re-checked. With an `unknown` index signature, `TData & FlattenedRow` should assign to `ExpandableRow` directly, and any bridge that turns out to be redundant is deleted.

**[SKEPTIC]** Consumers who read undeclared fields break at compile time. That includes `TableDemoPage`, whose `ExpandableRow[]` fixtures are read as strings in cell slots.

**[ADVOCATE]**
- That break is the purpose of the change: those reads are unchecked today.
- The fix in the consumer is to declare a row interface extending `ExpandableRow`. The `vtable` skill gains one line saying so.

**[VERDICT]** `unknown`, marked **BREAKING (types only)** in the CHANGELOG. The demo page gets row interfaces.

### D3 — The legacy `TableHeader` / `TableRow` types are deleted

They are not exported, not imported anywhere in `libs/` or `apps/`, and they are the only other `any`. Deleting them is safer than retyping dead code.

### D4 — The type contract is pinned by a Vitest typecheck file

**What changes.**
- Add `libs/ui/tests/types/table-row-typing.test-d.ts`, using `expectTypeOf` plus `// @ts-expect-error` for the negative scenarios.
- Run it through Vitest's typecheck mode as a new `test:types` script.
- Add a CI step next to the type-checks.

**[SKEPTIC]** It is a new test kind, another CI step and one more thing to learn.

**[ADVOCATE]**
- Every scenario in `spec.md` is a compile-time property.
- A runtime unit test cannot see compile-time behaviour.
- `vue-tsc` over `src/` only proves that the library compiles, not that a consumer's mistakes are caught.
- Vitest is already the runner here, so typecheck mode is configuration only, with no new dependency.

**Alternatives considered:**
- A consumer file inside the dashboard. Rejected: that puts test code in an app.
- A separate `tsconfig` run by `vue-tsc -p`. This works but is less idiomatic, and `expectTypeOf` reads better.

**[VERDICT]** Vitest typecheck. `testing.md` gets a short section on the new layer.

## Risks / Trade-offs

- **[Risk]** The `unknown` index signature cascades through internals further than expected.
  **Mitigation:** do group 2 of `tasks.md` (types plus internals) before anything else. If the internals need more than local narrowing in more than a handful of places, stop and revise this design before going on.
- **[Risk]** Method bivariance hides a real internal mismatch.
  **Mitigation:** the unit suite exercises every callback path, and the spec requires it to pass unchanged.
- **[Risk]** External consumers break on upgrade.
  **Mitigation:** the CHANGELOG entry shows the one-line migration (extend `ExpandableRow` with the fields read).

## Migration Plan

- Library and demo page change in one branch. There is no runtime migration.
- Rollback is a revert, because no data or storage format is involved.
