# Review rules — muzakit

Scope: `libs/**` (`@muzakit/ui`, `@muzakit/utils`, `@muzakit/config`) and `apps/**`
(`muzakit-dashboard`, `muzakit-starter-without-tailwind`).
Excluded: `**/*.spec.ts`, `**/tests/**`, `**/dist/**`, `*.md`, `package.json`, lockfiles, images.

**Scope is the diff only: added and modified lines.** Existing code outside the diff is
not evaluated, even when it violates a rule. A violation on an unchanged line is not a
finding. (In a full audit — `REVIEW_MODE=all` — every line is an added line.)

Every rule has an ID. The ID is mandatory in the output — it is how false-positive rates
are counted per rule. A finding without a rule ID from this file is invalid.

Severity:
- `critical` — will break behaviour for a user, lose data, make a control unusable by
  keyboard or screen reader, display a wrong number or date, or break a consumer of
  `@muzakit/ui`. Blocks.
- `warning` — convention or maintainability. Does not block; logged only.

Where the rules come from: `.agents/instructions/**` (vue-syntax, typescript, conventions,
ui-component-migration, testing) and the `vtable` skill. This file is the subset that can be
proved from a diff.

---

## A. Null safety (`strict: true`, but `noUncheckedIndexedAccess` is off everywhere)

**R-NULL-01** `critical` — indexing an array or record and then accessing a field on the
result with no guard: `items[0].name`, `rows[i].value`, `map[key].label`. The compiler types
the element as present; at runtime it is `undefined` for an empty list or a missing key.
Not a violation: the index is proved in range on the same line or just above
(`if (i < rows.length)`, a `for` over `.length`, `.at(-1)?.`).

**R-NULL-02** `critical` — a field read on data that is `undefined` before a request
resolves or on error (`data.value.items`, `response.total`) without `?.`, a `v-if`, or an
early return.

**R-NULL-03** `warning` — non-null assertion `!` outside `onMounted` / `onUpdated` callbacks,
or `!` right after a guard that already narrowed the type (TS Rule 7).

## B. Reactivity, races, leaks

**R-REACT-01** `critical` — an async `watch` whose result is written into state with no
cancellation of the previous run. Signal: `watch(x, async () => { state.value = await … })`
with no `onWatcherCleanup`, no `AbortController`, no freshness check. Not a finding when the
request goes through one `@ametie/vue-muza-use` instance — every `execute()` aborts that
instance's in-flight request. Before reporting, name what is awaited (raw fetch/axios, timer,
SDK, two different `useApi` instances).

**R-REACT-02** `critical` — a subscription with no teardown: `addEventListener` on
`window` / `document` / an element that outlives the component, a repeating `setInterval`,
a `setTimeout` that writes state after unmount, `ResizeObserver`, `IntersectionObserver`,
`MutationObserver`, a store `$subscribe`. Teardown belongs in `onUnmounted` /
`onBeforeUnmount` / `onScopeDispose`, or the API is `@vueuse/core`'s auto-cleaning
equivalent (`useEventListener`, `useResizeObserver`, …).

**R-REACT-03** `critical` — a synchroniser watcher (vue-syntax Rule 10a): a `watch` that
copies one piece of state into another that something else also writes (a prop into a local
ref that the user also edits, a model into a ref that a handler also sets) with no exit
condition. Before reporting, name both writers. If you cannot, do not report.

**R-REACT-04** `warning` — destructuring a `reactive()` object or a store without
`storeToRefs`, so the destructured values stop updating.

**R-REACT-05** `warning` — `ref<HTMLElement | null>(null)` used as a template ref instead
of `useTemplateRef` (vue-syntax Rule 4).

**R-REACT-06** `critical` — a module-level `ref` / `reactive` / `Map` registry in
`libs/ui` that is written per component instance and never cleaned when the instance unmounts
(registries leak entries across mounts and across tests).

## C. Accessibility (`libs/ui` is consumed by every app — a gap here ships everywhere)

**R-A11Y-01** `critical` — a non-interactive element (`div`, `span`, `li`, `tr`, `svg`) with
`@click` and no keyboard path: missing `role` + `tabindex="0"` + `@keydown.enter` /
`@keydown.space`, when no native `button` / `a` / `input` inside it handles the same action.

**R-A11Y-02** `critical` — an icon-only control (a `button` or `VButton` whose visible content
is only a `VIcon` / `svg`) with no accessible name: no `aria-label`, `aria-labelledby`, or
visually-hidden text.

**R-A11Y-03** `critical` — a form control (`input`, `select`, `textarea`, custom switch or
checkbox) with no programmatic label: no `<label for>` paired via `useId()`, no wrapping
`<label>`, no `aria-label` / `aria-labelledby`. IDs generated with `Math.random()`,
`Date.now()`, or a counter are a finding under this rule too (vue-syntax Rule 5).

**R-A11Y-04** `critical` — focus indication removed: `outline: none` / `outline: 0` on a
focusable element with no `:focus-visible` replacement (ring via `var(--ui-ring)` or a
visible border/shadow change) in the same rule set or the same file.

**R-A11Y-05** `warning` — a widget role without its required state: `role="progressbar"` /
`"slider"` / `"meter"` without `aria-valuenow`; `role="tab"` without `aria-selected`;
`role="switch"` / `"checkbox"` without `aria-checked`; a disclosure button without
`aria-expanded`; an `aria-controls` / `aria-labelledby` pointing at an id not rendered.

**R-A11Y-06** `critical` — an overlay (modal, drawer, popover with focusable content) that
opens without moving focus into it or closes without returning focus, or a modal with no
Escape handling. Report only when the diff adds or changes the open/close path.

## D. Styling and tokens (`libs/ui` only — `ui-component-migration.md`)

**R-STYLE-01** `critical` — a raw colour in `libs/ui`: hex, `rgb()`, `hsl()`, `oklch()` with
literal channels, or a named colour, in a `.scss` under `styles/components/` or
`components/table/assets/styles/`, or in a template. Colours are `--ui-*` tokens; alpha is
`color-mix(in oklch, var(--ui-x) N%, transparent)`. `tokens.css` and
`libs/config/src/tailwind/theme.css` are where raw values live and are not findings.

**R-STYLE-02** `critical` — a Tailwind utility class in a `libs/ui` component template
(`flex`, `px-4`, `text-sm`, `bg-…`). Every class there is BEM.

**R-STYLE-03** `warning` — a literal `font-size`, `font-weight`, `line-height`, control
height, gap, padding, or radius in `libs/ui` SCSS where a token exists (`--ui-text-*`,
`--ui-weight-*`, `--ui-leading-*`, `--ui-control-h*`, `--ui-space-*`, `--ui-radius*`).
Not a finding: `0`, `1px` hairlines, percentages, `$`-size variables in
`components/table/assets/styles/_variables.scss`, values pinned with a comment saying why.

**R-STYLE-04** `warning` — an inline `:style` / `style=""` in a template that sets anything
other than a CSS custom property (`:style="{ '--v-x': value }"` is the allowed form).

**R-STYLE-05** `warning` — a `libs/ui` component whose `<style>` is not `lang="scss" scoped`
holding exactly one `@use` of its paired stylesheet; `@import` inside a `lang="scss"` block;
`@apply`, `theme()`, `$`-variables, `@mixin` / `@include` in `styles/components/`.

**R-STYLE-06** `warning` — an animation or transition on movement/size added without a
`prefers-reduced-motion: reduce` override in the same stylesheet, or `transition: all`.

**R-STYLE-07** `warning` — a hover style on a control with a touch story not wrapped in
`@media (hover: hover) and (pointer: fine)`.

## E. Component API and the library contract (`libs/ui`)

**R-LIB-01** `critical` — a cross-package relative import (`../../libs/ui/src/…`,
`../../../utils/src/…`) instead of `@muzakit/ui` / `@muzakit/utils`; or `libs/ui` importing
from `apps/**`.

**R-LIB-02** `critical` — a new runtime import in `libs/ui/src` of a package that is neither
in `libs/ui/package.json` dependencies/peerDependencies nor a workspace package. Report only
when the import is in the diff.

**R-LIB-03** `critical` — an app importing `@muzakit/ui/style.css` or `dist/style.css`
(ui-component-migration Step 10: ships a stale second copy of every rule).

**R-LIB-04** `warning` — `declare module "vue"` augmentation added to `libs/ui/src/index.ts`
instead of `global-components.d.ts`, or `global-components.d.ts` losing its `export {};`.

**R-LIB-05** `warning` — `withDefaults`, `const props = defineProps(…)` + `props.x`, runtime
object `defineProps({...})`, array `defineEmits([...])`, or a manual `modelValue` prop +
`update:modelValue` emit instead of `defineModel` (vue-syntax Rules 2, 3, 11).

## F. Tables

**R-TABLE-01** `critical` — a VTable page held as a bare `ref(1)` plus a resetting watcher
instead of `useTablePage` or `v-model:page`.

**R-TABLE-02** `critical` — a filter, search, or page-size change that does not reset the
page to 1, leaving the user past the end of a shorter result set.

**R-TABLE-03** `warning` — rows copied into a `computed` only to satisfy VTable's mutable
`ExpandableRow[]` type: `computed(() => [...rows.value])` bound to `:data` (TS Rule 15a). A
computed that filters, maps, sorts, or slices is not a finding.

**R-TABLE-04** `critical` — a `v-for` keyed by index over data rows that can be reordered,
inserted, or removed (`:key="index"`, `:key="i"`).

**R-TABLE-05** `critical` — a VTable in a unit spec or a non-sized container rendered with
the default `virtualized: true` and asserted on rows (testing.md trap 17) — report only in
non-test code that renders a VTable inside a container with no height.

## G. Numbers and dates

**R-FMT-01** `critical` — money, percentage, compact-number, or date formatting done by hand
in a component (`toFixed`, `* 100` then `+ '%'`, manual thousands separators,
`toLocaleString()` with no locale) where `@muzakit/utils` formatters exist.

**R-FMT-02** `warning` — date handling outside luxon: native `Date` arithmetic, manual
millisecond maths, `new Date(string)` on a non-ISO string.

## H. Loading and empty states

**R-LOAD-01** `critical` — a page-level loader: `v-if="loading"` that replaces a page's or a
block's whole content with a loader or skeleton, instead of each block staying mounted and
taking its own `:loading`.

**R-LOAD-02** `warning` — a data view with a loading branch and a data branch but no empty
branch, and the component used does not provide one itself (VTable does).

## I. TypeScript

**R-TS-01** `critical` — `any` (explicit, `as any`, `<any>`), or `@ts-ignore` /
`@ts-expect-error` without a comment explaining it.

**R-TS-02** `warning` — `as` used to bypass a check (`x as Product`, `as unknown as T`)
outside a DOM ref in a lifecycle hook, with no comment justifying it (TS Rule 8).

**R-TS-03** `warning` — a hand-written `enum` instead of a union or an `as const` object.

**R-TS-04** `warning` — a type-only import without `import type`.

**R-TS-05** `warning` — an exported composable with no explicit return type (TS Rule 5).

## J. Match against the task

**R-SPEC-01** `critical` — an item present in the task or plan and absent from the diff.
List the missing items verbatim.

**R-SPEC-02** `warning` — changes in the diff that the task did not ask for. Does not
apply to changes required for compilation.

---

# What is NOT a finding (never report these)

Covered by tooling, decided by the owner, or not verifiable from a diff:

- formatting, indentation, quotes, semicolons, line length, import order — eslint
  (`@muzakit/config`) and lint-staged cover them
- SFC block order, multi-word component names — `eslint-plugin-vue`
- the conventions guard in `libs/ui/tests/conventions.spec.ts` already enforces part of group
  D on every `base`/`feedback`/`inputs`/`layout`/`overlay` component; still report D
  violations in the diff, since a red test is not proof the author saw it
- Conventional Commits — commitlint
- anything under `.agents/skills/**` (vendored skills), `libs/ui/dist/**`, generated files
- "consider extracting", "over-engineered", "could be simplified", "add a comment" — value
  judgements with no provable violation
- performance and re-renders — they need measurement
- visual taste, spacing aesthetics, colour choice between two valid tokens — not provable
  from a diff
- missing tests as a finding in their own right
- demo pages (`apps/muzakit-dashboard/src/pages/*DemoPage.vue`) using fake data, `setTimeout`
  to simulate latency, or hardcoded sample numbers — that is what a demo is; real defects in
  them (leaks, a11y, wrong component usage) are still findings
