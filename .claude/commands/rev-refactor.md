---
description: Refactors changed muzakit files (libs/**, apps/**) using a closed list of transformations. Separate commit.
allowed-tools: Read, Grep, Glob, Bash(git *), Bash(pnpm *), Edit
---

# Role

You perform refactoring **with no change in behaviour**. You are not "improving the code" —
you are applying specific transformations from the list below. A transformation that is not
on the list does not exist.

This is the most dangerous step in the pipeline: you are the only agent allowed to write
into existing code. The boundaries are therefore stricter than elsewhere.

# The feature diff

A feature is delivered as many commits, one per block. The diff you work from is therefore
the whole branch against its branch point, not the last commit:

```
BASE=$(git merge-base main HEAD)
git diff "$BASE" --name-only -- libs apps
```

Everywhere below, "the feature diff" means that list.

# Preconditions — do not start without them

1. `git status` is clean. All feature blocks and the characterization-test commit are in.
   No stray uncommitted work.
2. `pnpm --filter @muzakit/ui test:unit` is **green**. If red: stop, report, exit.
3. For a **Tier B** transformation (T2, T3, T4, T7), the file must have a
   `// @characterization` test covering it. No test means you do not apply Tier B to that
   file. **Tier A** transformations (T1, T5, T6, T8) do not require a per-file test: they are
   syntactic rewrites fully verified by `vue-tsc` and eslint, with no behaviour that is not
   already expressed in the types. Preconditions 1 and 2 apply to both tiers.

# Scope

Only files from the feature diff inside `libs/**` and `apps/**`.
Excluded: `**/dist/**`, `**/api/**`, `libs/ui/src/styles/tokens.css`, `libs/config/src/tailwind/theme.css`, anything outside these packages.

# Allowed transformations — closed list

**Tier A — no per-file test required.** Syntactic rewrites; `vue-tsc` and eslint verify them.

| # | From | To |
|---|---|---|
| T1 | `const props = defineProps<T>()` plus `props.x` | destructure props directly |
| T5 | `function name() {}` | arrow function (only in files already in the diff) |
| T6 | a deep import into another package or dashboard feature (`@muzakit/ui/src/…`, `../../libs/…`, `features/x/components/…`) | import via `@muzakit/ui` / `@muzakit/utils` or that feature's `index.ts` — **only if the export already exists there**; otherwise skip |
| T8 | `defineEmits([...])` array form | `defineEmits<T>()` with tuple notation |
| T9 | a defensive copy made only for a mutable prop type: `const tableData = computed(() => [...rows.value])` bound to `:data`, `const x: Option[] = [...CONST]`, `:options="[...list]"` | bind the source directly (`:data="rows"`, `:options="CONST"`); a `readonly Option[]` constant in the same feature becomes `Option[]` (TypeScript Rule 15a) |

**Tier B — requires a `// @characterization` test on the file.** Each of these can change an
executed value or the moment it is computed.

| # | From | To |
|---|---|---|
| T2 | hex / rgb / hsl / a Tailwind palette class / a literal font-size, weight or spacing in `libs/ui` | the matching `--ui-*` token from `libs/ui/src/styles/tokens.css` |
| T3 | `ref<HTMLElement \| null>(null)` used as a template ref | `useTemplateRef` |
| T4 | manual `modelValue` plus `emit('update:modelValue')` | `defineModel` |
| T7 | a literal or expression repeated 3 or more times in one file | a local constant in the same file |

For T2: if no suitable token exists, **do not invent one and do not create one**. Skip it
and note it in the report.

## Tier A caveats — a Tier A transformation is only safe with these

- **T1** — skip the file if `props` is passed anywhere as a whole: `toRefs(props)`,
  `{ ...props }`, `someFn(props)`, `v-bind="props"`. Destructuring changes what leaves the
  component in those cases. Note that `{ ...props.params }` spreads a *field* and is fine.
  If `withDefaults` is present, rewrite it together with the destructuring and carry every
  default value over verbatim.
- **T6** — apply only when `index.ts` exports the same entity under the same name. A
  re-export that renames is a skip.
- **T8** — derive the event signatures from the actual `emit(...)` calls in the same file;
  never invent a type. If any `emit` is called with a computed/dynamic event name, skip.
- **T9** — only a copy whose removal changes nothing but a type. A computed that prepends,
  filters, maps, sorts or slices is a transformation, not a copy: leave it. If the source is a
  `ReadonlyArray` **prop** (the data arrives from a parent), removing the copy needs the block to
  own its data — that is a structural finding (S3), not T9: skip with `unsafe-shape` and flag it.
  Retyping a constant is the one export change T9 allows, and only when every importer still
  type-checks.

# Structural checks — flag, never apply

Fixing these moves code between files, changes props and emits, or creates components, which
the Forbidden list below rules out here. So you **detect and report** them; the owner decides
whether a separate structural refactor runs. Rules: `.agents/instructions/conventions.md`
(component decomposition), `vue-syntax.instructions.md` (Rules 10a, 18),
`typescript.instructions.md` (Rule 15a), `ui-component-migration.md`. Read them before the scan.

Scan every `.vue` and composable in the feature diff (test or no test) for:

| # | Signal | Rule |
|---|---|---|
| S1 | A demo/app page that calls a composable and only forwards its fields down (`:rows`, `:loading`, `@refresh="refetch"`) to a block that could own them | conventions — blocks own their data |
| S2 | A prop only forwarded to a child, or an emit whose handler is a one-to-one passthrough | conventions — no pass-through props |
| S3 | A `ReadonlyArray` rows prop copied into a computed for VTable (TS Rule 15a) — the fix moves the data source | TS Rule 15a, vtable skill |
| S4 | A `libs/ui` component handling more than one visual section, or above ~8 props/models, or above ~300 lines of script | conventions "Component Decomposition" |
| S5 | A synchroniser watcher whose removal needs a model/prop redesign | vue-syntax Rule 10a |
| S6 | `as unknown as` on a VTable slot row instead of a type guard `isX(row): row is XRow` | TS Rule 8 |
| S7 | A table subcomponent reaching state through props that `VTable` already provides via inject (or the reverse) | vtable skill `internals.md` |

Each finding is one report line: file, line, S-number, what travels where, and who should own
the data. Do not edit anything for an S-finding, even when the fix looks small.

# Forbidden — any of these means stop

- Changing logic: conditions, branching, operation order, `async`/`await`, error handling.
- Changing the public interface: prop or emit names and types, slots, exports, routes.
- Splitting a file, moving code between files, creating new files.
- Touching `**/api/**` — the request layer is out of scope.
- Touching `tokens.css` or `theme.css` — adding or changing a token is a design decision.
- Changing the public API of `@muzakit/ui`: anything exported from `libs/ui/src/index.ts`, any prop, emit, slot or exposed member of an exported component.
- Touching anything under `tests/`. Not one line.
- Touching files outside the feature diff.
- Renaming anything other than local variables inside a single function.
- Fixing bugs. Even obvious ones. That is the reviewer's job and it runs after you.
- Adding teardowns, guards, or null checks. That is a behaviour change, not a refactor.

# Verification after each file

```
pnpm --filter @muzakit/ui test:unit
pnpm --filter @muzakit/ui type-check
pnpm --filter @muzakit/dashboard exec vue-tsc --noEmit
pnpm exec eslint libs apps
```

**The rule that matters most:** if a test fails and would need editing to pass, you changed
behaviour. That is not a refactor. Revert that file (`git checkout -- <file>`), leave the
test alone, and note it in the report.

If type-check or eslint is worse after your edits than before, revert that specific
change. Do not suppress the error and do not add `eslint-disable`.

# Commit

A separate commit, refactor only, with no feature changes:
```
git commit -m "refactor(<ui|utils|dashboard>): <list of transformations applied>"
```
The commit body lists the files and the transformation numbers (T1, T3, ...). Never add
files from the feature diff that you did not touch.

The message must **end with machine-readable footers**, one line per file, so the applied /
reverted / skipped counts can be recomputed later instead of being taken on trust:

```
Refactor-Applied: src/features/x/Y.vue=T1,T8
Refactor-Reverted: src/features/x/Z.vue=T2
Refactor-Skipped: src/features/x/W.vue=T2:no-token
Refactor-Flagged: src/features/x/V.vue=S1,S5
```

`Refactor-Flagged` lines record the structural findings; they are a report, not an edit. When
nothing was applied there is no commit, and the flags go in the report only.

Allowed `Skipped` reasons: `no-test`, `no-token`, `no-export`, `unsafe-shape`. Paths are
relative to the repo root.

Recount at any time with:

```
git log --format=%B --grep='^Refactor-' | grep -c '^Refactor-Applied'
```

# Report

```
Applied: <file> -> T1, T3
Skipped: <file> -> <number> -> <why: no test / no token / no export in index.ts>
Reverted: <file> -> test failed, behaviour would have changed
Flagged: <file>:<line> -> S<n> -> <what travels where, who should own it>
Checks: tests green / type-check no new errors / lint no new errors
Commit: <sha>
```

If nothing could be applied, that is a normal and frequent result. Say so. Do not invent
work.
