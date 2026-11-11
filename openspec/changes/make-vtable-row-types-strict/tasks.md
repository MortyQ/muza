# Tasks

Each group is one reviewable block and one commit. Before each commit, run the block loop of
`.claude/review/PIPELINE.md`: stage the block, run `.claude/hooks/review.sh <<< '{}'`, and fix
any critical finding. Nothing here is visual, so the blocks need no new token contract (see
`testing.md`). The existing contracts must still pass.

## 1. Pin the contract first — `test(ui): pin the table's row typing contract`

- [ ] 1.1 Add a `test:types` script to `libs/ui/package.json` (Vitest typecheck mode, `tests/types/**/*.test-d.ts`). Add it to the CI job in `.github/workflows/ci.yml`. Verify: `pnpm --filter @muzakit/ui test:types` runs and finds the file.
- [ ] 1.2 Write `libs/ui/tests/types/table-row-typing.test-d.ts`, with one `expectTypeOf` / `@ts-expect-error` case per scenario in `specs/ui-table-row-typing/spec.md`. Verify: it **fails** on the current code. The untyped-column, undeclared-field and missing-field cases resolve to `any`, so their `@ts-expect-error` lines are unused. Record the failing output in the commit body.
- [ ] 1.3 Document the type-test layer in `.agents/instructions/testing.md`: what it covers and the command to run it. Verify: `.agents/instructions/workflow.md` lists the command next to the other test commands.

## 2. Strict row types — `refactor(ui): drop any from the table's row types`

- [ ] 2.1 In `types/index.ts`, turn the `Column` callbacks and `HeaderContext.onHeaderClick` into method signatures (design D1), each with its one-line comment. Default `Column` / `CellContext` to `Record<string, unknown>`. Verify: `grep -n "any" libs/ui/src/components/table/types/` returns no type usages and no `no-explicit-any` disables.
- [ ] 2.2 Change `ExpandableRow` to `[key: string]: unknown` (design D2). Make `MultiSelectConfig.isRowSelectable` a method signature in `types/selection.ts`. Verify: `pnpm --filter @muzakit/ui type-check` lists the internal fallout.
- [ ] 2.3 Fix that fallout in `VTable.vue`, `useTableSelection`, `useExpandableTable`, `useTableCellMetadata`, `useTableColumnConfig`, `useTableSort` and any subcomponent it reports. Narrow at the point of use, add no casts, and delete any `as unknown as` bridge that has become redundant. Read `.agents/skills/vtable/internals.md` first. If the fallout needs more than local narrowing in more than about five places, stop and revise `design.md` (see its Risks). Verify: `pnpm --filter @muzakit/ui type-check` passes.
- [ ] 2.4 Delete the legacy `TableHeader` interface and the `TableRow` type (design D3). Verify: `grep -rn "TableRow\b" libs apps` matches only the `TableRow.vue` component.
- [ ] 2.5 Verify: `pnpm --filter @muzakit/ui test:types` is now green, and `pnpm --filter @muzakit/ui test:unit` and `test:tokens` pass with no assertion edited (spec: runtime behaviour unchanged).

## 3. Consumers and docs — `refactor(dashboard): type the table demo's rows`

- [ ] 3.1 In `apps/muzakit-dashboard/src/pages/TableDemoPage.vue`, declare a row interface per fixture that extends `ExpandableRow` and replace the bare `ExpandableRow[]` types. Fix `HomePage.vue` if type-check reports it. Verify: `pnpm --filter @muzakit/dashboard exec vue-tsc --noEmit` passes.
- [ ] 3.2 Update `.agents/skills/vtable/SKILL.md`:
  - drop "`VTable.vue` is not generic";
  - say that rows read through slots and callbacks take their type from `data`;
  - say that an `ExpandableRow` reads undeclared fields as `unknown`, so extend it.

  Verify: the `vtable` skill no longer contradicts `VTable.vue:1`.
- [ ] 3.3 Add an entry to `libs/ui/CHANGELOG.md` under Changed, marked **BREAKING (types only)**, with the one-line migration. Note the removal of the unexported legacy types. Verify: the entry names `Column`, `CellContext` and `ExpandableRow`.

## 4. Integration check

- [ ] 4.1 Run the cold-build verify from `ui-component-migration.md` § Verify, plus `pnpm exec eslint libs apps` and `pnpm --filter @muzakit/ui test:coverage`. Verify: all clean.
- [ ] 4.2 Run `REVIEW_MODE=feature .claude/hooks/review.sh <<< '{}'`. Verify: no R-TS-01 finding and no new critical finding.

## Workflow follow-up

- The owner reviews this change before apply starts.
- After merge: `openspec-sync-specs`, then `openspec-archive-change`.
- Update the `so-platform-ai-port-and-audit` memory to mark the R-TS-01 decision as taken.
