# Migrating a Component into `@muzakit/ui`

How to bring a component from another codebase (typically `so-platform/libs/core`,
Tailwind v3) into `libs/ui`, which is Tailwind v4 CSS-first with `--ui-*` tokens
and BEM SCSS.

Reference implementation: `components/base/VButton.vue` +
`styles/components/base/vbutton.scss`. When this document and that pair disagree,
the code wins.

General Vue/TS rules live in `vue-syntax.instructions.md` and
`typescript.instructions.md`; this file only covers what is specific to porting.

---

## Layout of `libs/ui/src`

```
libs/ui/src/
  index.ts                 ← named exports + `import "./styles/tokens.css"`
  global-components.d.ts   ← the GlobalComponents augmentation, see below
  components/
    base/ feedback/ inputs/ layout/ overlay/
    navigation-sidebar/    ← multi-file component, own components/ + composables/
    table/                 ← multi-file component, own assets/styles/ (see below)
  composables/
  styles/
    tokens.css             ← every --ui-* token (do not add colours elsewhere)
    components/{category}/{name}.scss
  types/
  utils/
```

Two things the tree does *not* contain, contrary to older notes: there is no
`styles/index.css`, and there is no `VTabs.vue` or `VThemeToggle.vue` — this repo
names them `VTab.vue` and `VThemeSwitcher.vue`. Keep muzakit names on import.

---

## Step 1 — Props

`withDefaults` is out; Vue 3.5 reactive destructuring is the only accepted form.

```ts
// ❌
const props = withDefaults(defineProps<Props>(), { type: "text", size: "md" });

// ✅
const { type = "text", size = "md" } = defineProps<{
  type?: string
  size?: "sm" | "md" | "lg"
}>();
```

Inline the types into `defineProps<{...}>()`, inline the defaults into the
destructure, drop any separate `type Props`, and replace every `props.x` in both
script and template with plain `x`.

Array props take `ReadonlyArray<T>`, object props `Readonly<T>`.

---

## Step 2 — Validation type

Do not import `@vuelidate/core`; it is not a dependency of `libs/ui`. Use
`FieldValidation` from `src/types/validation.ts`:

```ts
import type { FieldValidation } from "../../types/validation";

const { validation } = defineProps<{ validation?: FieldValidation }>();
```

Template usage is unchanged: `validation?.$error`,
`validation?.$errors[0]?.$message`.

---

## Step 3 — Template: BEM only, no Tailwind utilities

Nothing in a `libs/ui` template may carry a Tailwind class. Every bit of layout,
sizing and colour belongs in the component's `.scss`.

```html
<!-- ❌ --> <span class="inline-flex items-center justify-center gap-2">
<!-- ✅ --> <span class="v-input__icon-left">
```

No inline `:style` either, except to hand a dynamic value to CSS as a custom
property:

```html
<div :style="{ '--v-progress-value': `${percent}%` }" class="v-progress-bar" />
```

---

## Step 4 — One scoped style block

Exactly one block, loading exactly one stylesheet — with `@use`, not `@import`:

```html
<style lang="scss" scoped>
@use "../../styles/components/inputs/vinput.scss";
</style>
```

`@import` is deprecated in Dart Sass and goes away in 3.0. Inside a block marked
`lang="scss"` it prints a warning on every dev-server start; `@use` compiles to
the same CSS. (Older components use `<style scoped>` with no `lang`, where the
`@import` is a plain CSS import that postcss resolves and Sass never sees — that
is why they are quiet. New work uses the form above.)

No second unscoped `<style>` block, and no `:where()` used to escape scoping.
A rule that needs to reach a child component's internals uses `:deep()`; a rule
that is genuinely global belongs in `tokens.css`.

---

## Step 5 — Colours

Tailwind v3 shipped colours as RGB channel triples so `/ alpha` would work. v4
does not, and the local `--_color-*` alias blocks that came with that pattern
must go:

```scss
/* ❌ */
--_color-primary: var(--color-primary, 14 165 233);
background-color: rgb(var(--_color-error) / 0.1);

/* ✅ */
color: var(--ui-primary);
background-color: color-mix(in oklch, var(--ui-danger) 10%, transparent);
```

Opacity is always `color-mix(in oklch, <token> N%, transparent)` — `N%` being the
old alpha ×100. Mixing toward `var(--ui-surface)` instead of `transparent` gives
a tint that survives on any background.

Banned in `.scss` under `styles/components/`: raw `oklch()` / `rgb()` / hex,
`theme()`, `@apply`, `$`-variables, `@mixin` / `@include`, nested `@import`.

---

## Step 6 — Tokens

Everything below is defined in `styles/tokens.css` for both themes. If you need a
colour that is not here, add the raw variable to **both** `:root[data-theme=…]`
blocks in `libs/config/src/tailwind/theme.css` *and* its `--ui-*` wrapper in
`tokens.css`. Never hardcode.

```
Brand       --ui-primary  -hover  -active  -foreground  -subtle  -muted
Background  --ui-background
            --ui-surface  -sunken  -raised  -overlay  -hover  -active
                          -tinted  -tinted-deep
Nav         --ui-nav  -hover  -active  -border
Text        --ui-foreground  -secondary  -muted  -subtle  -disabled  -inverted
Border      --ui-border  -subtle  -strong  -focus
Overlay     --ui-overlay   --ui-scrim
Status      --ui-{success|warning|danger|info}  -hover  -foreground  -subtle  -muted
Inputs      --ui-input-bg  --ui-input-border  --ui-input-placeholder
Badge       --ui-badge-neutral-bg  --ui-badge-neutral-text
Radius      --ui-radius-xs  --ui-radius  -lg  -xl  -2xl  -full
Shadow      --ui-shadow-sm (resting cards)  -lg (anything that floats)
Focus ring  --ui-ring  --ui-ring-offset
Type        --ui-text-xs  -base  -lg  -xl  -display      (11 13 15 20 28 px)
            --ui-leading-xs  -base  -lg  -xl  -display
            (display is headline figures only — VStat — never a heading)
Tracking    --ui-tracking-tight (-1%, body and UI text)  -caps (+4%, uppercase labels)
Motion      --ui-duration-instant (80ms, hover and press colour)
            --ui-duration-fast (150ms, every in-place change)
            --ui-duration-overlay (200ms, a modal, drawer or toast entering; it leaves at fast)
            --ui-ease-out (arrivals)  --ui-ease-in-out (a pill or thumb moving along its track)
            (no overshoot anywhere; a loop keeps its period, marked /* literal: loop period */)
Weight      --ui-weight-regular (450)  -medium (500)  -strong (600)
Control     --ui-control-h  -sm  -md  -lg   --ui-control-px  --ui-control-gap
Rhythm      --ui-space-2xs  -xs  -sm  -md  -lg  -xl  -2xl  -3xl  -4xl
            (2 4 6 8 12 16 24 32 40 px: a 4px grid, 2 and 6 the only half steps)
```

The last three groups are not colours, and the rule for them is the same: a
`font-size`, a control height or a gap written as a literal under
`styles/components/` is the same defect a raw `oklch()` is — it reads as a
decision when it is a value nobody has revisited.

Spacing is enforced, not only advised: every `gap`, `padding` and `margin` in
`libs/ui/src` takes a `--ui-space-*` token (zero and ±1px border compensation
aside), and `tests/conventions.spec.ts` fails on a literal. A value that only
looks like spacing (room reserved for a caret, a notch matched to a floating
label, a nesting step tied to an icon) stays a literal with
`/* literal: <reason> */` on the same line, so the exception is argued in place.
Past 40px, use a multiple of a step: `calc(var(--ui-space-4xl) * 2)`.

Four working sizes and one for figures: never a size in between. A former 12px
use is meta (→ `xs`) or running text (→ `base`), decided at its site.

`--ui-text-base` is 13px, which is what the button, the field and the select
stand at. **14px is deliberately not a step**: it is the size the system is
moving off, so a component still asking for `0.875rem` is one that has not been
converted yet, not one that chose 14.

`--ui-control-h` is the height of anything that can stand beside another control
in a toolbar row. `-sm`/`-md`/`-lg` are height-only overrides — the horizontal
padding and the type belong to the chrome, not to the size, so two sizes of one
control differ in exactly one dimension.

The status colour is `--ui-danger`, not `--ui-error` or `text-negative`.

### Accent roles: where `--ui-primary` may appear

The accent marks three things and nothing else:

1. **the primary action**: `VButton` `primary`, the toast's action, a link
   (`VButton` `link`, the file upload's action, the drop zone's call to action);
2. **a current or selected state**: the active nav item and tab, the selected
   day and range, a checked checkbox, an on switch, a selected segment, the
   selected multiselect tags, the current page, an active sort and its index,
   a pinned table row, column or cross, a dragged-over target, a running
   progress bar or loader;
3. **focus**: rings and the focused field's border and label.

Everything else (hover tints, decorative icons, empty-state titles, group
headings, secondary text buttons) takes foreground, muted or surface tokens.
A hover changes the surface, never the accent.

Three uses stand outside the roles on purpose: the sidebar's brand mark, the
avatar palette (identity colour, tone 0 and 5), and the table's header and
total-row gradients, which the owner chose to keep. `VTag`, `VChip`,
`VInfoNotice` and `VProgressBar` take the accent only through an explicit
`primary` tone; `VInfoNotice` defaults to `info`.

Files that still read `--ui-primary`, all within the roles above:
table `_fixed`, `_fullscreen` (focus), `_header` (resize line), `_highlight`,
`_pagination`, `_row` (selected), `_sort`, `_total`, column picker and setup
(selected, dragged over), `TableExpandAdditionalHeadersButton` (expanded,
focus); `vavatar`, `vbutton`, `vchip`, `vtag`, `vloader`, `vprogressbar`,
`vtoaster`, `dragndrop`, `vcheckbox`, `vcomposer`, `vdatepicker`, `vfileupload`,
`vinput`, `vlisteditor`, `vsegmentedcontrol` (the pill), `vselect`, `vselect-floating`, `vswitch`, `vaccordion`
(focus), `vanimatedbackground` (brand backdrop), `vinfonotice` (tone), `vtab`,
the sidebar partials, `vfloating` (selected item). Review a new use against
this list; nothing checks it automatically.

### Nested corners: outer = inner + padding

A rounded element inside a rounded, padded container takes the container's
radius minus that padding, written over tokens:
`border-radius: calc(var(--ui-radius-lg) - var(--ui-space-2xs))`. Equal radii
on both look pinched at the corners; the subtraction keeps the gap even all the
way round. `tests/conventions.spec.ts` rejects a literal radius, so the inner
corner can only be expressed this way. The one exception is a 1–2px mark (a
tick, an active bar), allow-listed by file in `HAIRLINE_RADII`.

### v3 → v4 mapping

| v3 | v4 |
|---|---|
| `--color-primary` | `--ui-primary` |
| `--color-error*` | `--ui-danger*` |
| `--color-mainText` / `--color-secondaryText` / `--color-mutedText` | `--ui-foreground` / `-secondary` / `-muted` |
| `--color-base-100` / `-200` / `-300` / `-400` | `--ui-surface` / `-raised` / `-hover` / `--ui-border` |
| `--color-cardBg` / `--color-secondaryBg` | `--ui-surface` / `--ui-surface-sunken` |
| `--color-borderFocus` | `--ui-border-focus` |
| `--color-{status}-50` / `-100` | `--ui-{status}-subtle` / `-muted` |
| `--color-{status}-200`…`-400` | `color-mix(in oklch, var(--ui-{status}) N%, var(--ui-surface))`, N = 20/35/55 |
| `--color-{status}` / `-500` / `-600` | `--ui-{status}` |
| `--color-{status}-dark` / `-700`+ | `--ui-{status}-hover` |

### Shadows and radii as Tailwind utilities

Two elevations only: `sm` for a card at rest, `lg` for anything that floats
(modal, drawer, dropdown, popover, tooltip, toast, a row being dragged).
Controls carry none; their border holds the edge. A hover changes the surface
(`--ui-surface-hover`), never the elevation. A ring or an inset line is not an
elevation and may be written out; the conventions spec fails on any other
blurred shadow, unless the line says `/* literal: <reason> */`.

`theme.css` maps the design system onto Tailwind's own namespaces, so
`shadow-sm`, `shadow-lg` and `rounded-xl` in an app take these values rather
than Tailwind's defaults; the `shadow` and `inset-shadow` namespaces are reset,
so `shadow-md` or `inset-shadow-sm` produce nothing. The raw variables are named `--elevation-*` and
`--corner-*` precisely because `--shadow-*: var(--shadow-*)` inside
`@theme inline` would be self-referential.

The dark theme's elevations are so-platform's: a deep black drop with a 5% white
line along the top edge, which is what lifts a card off a dark page.

---

## Step 7 — The `.scss` file

Create `styles/components/{category}/{name}.scss`, filename lowercase, matching
the component (`VListEditor.vue` → `vlisteditor.scss`).

Use SCSS nesting (`&__element`, `&--modifier`, `&:hover`). Keep any webkit
autofill overrides and Vue transition classes (`v-enter-active`, …) the original
had. Wrap hover styling in `@media (hover: hover) and (pointer: fine)` when the
control also has a touch story, and honour `prefers-reduced-motion` for anything
animated.

**Two exceptions to "no `$` variables, one flat file per component":**

- `components/table/assets/styles/` — the table owns its own partial set
  (`_wrapper`, `_header`, `_cell`, …) composed with `@use`, and `_variables.scss`
  holds `$`-variables for *sizes only*. Colours there are still `--ui-*`.
  See the `vtable` skill before touching any of it.
- `styles/components/navigation-sidebar/` — same partial-plus-`@use` shape.

---

## Step 8 — Exports

Add the named export to `src/index.ts`, alongside any types the component
defines:

```ts
export { default as VChip, type ChipVariant, type ChipColor } from "./components/base/VChip.vue";
```

If the component should also be usable without importing it, add it to
`src/global-components.d.ts`:

```ts
export {};                       // ← required, see below

declare module "vue" {
  export interface GlobalComponents {
    VChip: typeof import("./components/base/VChip.vue").default
  }
}
```

Two rules that are easy to break and produce baffling errors:

- **The `export {};` is load-bearing.** Without it the file is a script, not a
  module, and `declare module "vue"` *replaces* Vue's types instead of augmenting
  them — you get `Module '"vue"' has no exported member 'computed'` across the
  whole library.
- **The augmentation must not live in `index.ts`.** Putting it there makes
  `index.ts` part of its own components' type-resolution graph; the cycle trips
  TS7022 and silently degrades inferred types to `any`. `index.ts` pulls it in
  type-only: `import type {} from "./global-components";`.

A related trap: any `useSlots()` call inside a globally registered component can
re-form that cycle. Annotate it explicitly —
`const $slots: ReturnType<typeof useSlots> = useSlots();`

---

## Step 9 — Dependencies

`libs/ui` externalises everything it does not bundle. If the ported component
brings a new runtime dependency, add it to `dependencies` in
`libs/ui/package.json` *and* to `rollupOptions.external` in `vite.config.ts`,
which currently lists:

```ts
["vue", "vue-router", "@vueuse/core", "@iconify/vue", "@muzakit/utils", "luxon"]
```

Formatting helpers (`formatCurrency`, `formatDate`, `formatBytes`, …) live in
`@muzakit/utils`, not in `libs/ui/src/utils`. Import them from the package.

---

## Step 10 — Consuming apps must not import `@muzakit/ui/style.css`

`@muzakit/ui` resolves `.` to `src/index.ts`, so an app in this workspace
compiles the library from source and each component carries its own styles —
`tokens.css` included. Importing `dist/style.css` on top ships a second copy of
every rule, and that copy is a build artifact that goes stale as soon as a style
changes without a rebuild. Whichever copy the bundler injects last then wins,
which surfaces as styles that revert for no visible reason.

`dist/style.css` stays exported for consumers *outside* the workspace.

---

## Checklist

- [ ] `withDefaults` gone, defaults inline, no `props.x` anywhere
- [ ] `FieldValidation` from `types/validation.ts`, not `@vuelidate/core`
- [ ] Zero Tailwind classes and zero inline styles in the template
- [ ] Exactly one `<style lang="scss" scoped>` holding one `@use`
- [ ] No `--_color-*` block, no `rgb(var(…) / a)`, no raw colour values
- [ ] Every colour is `--ui-*`, every alpha is `color-mix(in oklch, …)`
- [ ] Every `font-size` is `--ui-text-*`, every `font-weight` is `--ui-weight-*`
- [ ] `.scss` at `styles/components/{category}/{name}.scss`
- [ ] Exported from `index.ts`; `global-components.d.ts` updated if global
- [ ] New runtime deps in both `package.json` and `vite.config.ts` externals

## Verify

Always on a cold build — a stale `dist` hides regressions.

```bash
rm -rf libs/ui/dist libs/utils/dist libs/ui/tsconfig.tsbuildinfo libs/utils/tsconfig.tsbuildinfo
pnpm build 2>&1 | grep -E 'error TS|Cannot apply|Deprecation Warning|Build failed|ERR_PNPM'
pnpm --filter @muzakit/ui type-check
pnpm --filter @muzakit/dashboard exec vue-tsc --noEmit
pnpm exec eslint libs apps --ext .ts,.vue
```

Grepping for `error TS` alone is not enough: a Tailwind failure such as
`Cannot apply unknown utility class` never matches it, and the dts build can
report clean while `vue-tsc --noEmit` still finds real errors. Run both.

Then check the component on `/components-demo` (or `/table-demo`) under
`data-theme="light"` and `data-theme="dark"`.
