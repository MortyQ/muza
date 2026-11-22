# Design

## Context

See proposal.md for motivation. Current state, measured on `feat/ui-refresh` at 9876690:

- Raw scales live in `libs/config/src/tailwind/theme.css` (`--space-*`, `--corner-*`, `--type-*`,
  `--elevation-*`, `--control-*`). `libs/ui/src/styles/tokens.css` wraps each one as `--ui-*`, with
  a fallback. Every scale change therefore touches both files, and the `@theme inline` block
  decides which steps Tailwind utilities get.
- `tests/conventions.spec.ts` already has a "type values" guard that walks every `.scss` file and
  every `.vue` style block. The new guards follow the same shape.
- Usage counts in library stylesheets:
  - **Literals:** 192 literal spacing declarations, 50 literal radii, 0 literal font sizes.
  - **Shadows:** `xs` 13, `sm` 12, `lg` 11, `md` 10, `xl` 6, `inner` 2.
  - **Text sizes:** `2xs` 20, `xs` 15, `sm` 49, `base` 50, `lg` 6, `xl` 4, `2xl`/`3xl` 2 each.
  - **Primary:** `--ui-primary*` 250 uses in total.
  - **Durations:** more than ten distinct values, from 0.1s to 0.3s plus 280ms.
- `VSegmentedControl` already nests its radius correctly, with a literal (`calc(var(--ui-radius-lg) - 2px)`).
  Its track is `--ui-surface-sunken` with `--ui-shadow-sm`, while the fields beside it in a toolbar
  are `--ui-input-bg` with `--ui-shadow-xs`; in the dark theme it reads as a darker, heavier box.
- Table cells and headers transition 0.3s (`_highlight.scss:13`, `_variables.scss:103`): 466 cells
  on `/table-demo`. The fixed column's edge is 2px at 70% accent (`_fixed.scss:23`).
- `.v-table-grid--highlight` is set whenever highlight is enabled (`VTable.vue:1052`), and
  `_highlight.scss:119` dims every row outside the pinned cross to 0.38. With nothing pinned, the
  whole table renders dimmed; verified on the live `/table-demo`.
- Token contracts in `tests/visual/tokens/` pin some components to tokens that this change removes.

Every choice below was checked by the owner on a real-size before/after page built from the live
components.

Repo skills that apply: **emil-design-eng** (motion, hover, density), **vtable** (fixed column,
highlight, the skill text itself), and `ui-component-migration.md` for every stylesheet edit.

## Goals / Non-Goals

**Goals:**
- Every scale is small enough to hold in one's head, and the guard makes going off-scale a test
  failure rather than a review comment.
- Each block changes one dimension, so a visual regression can be traced to one commit.

**Non-Goals:**
- No re-design of individual components beyond what the scales force.
- No codemod or automated value rounding. Each literal is mapped by hand, because 10px may be
  either 8 or 12 depending on its neighbours.

## Decisions

### D1. Keep t-shirt names, change the steps under them
The type scale stays `xs` / `base` / `lg` / `xl` plus a new `display`, instead of semantic names
(`caption` / `body` / `heading` / `title`).

**[ADVOCATE]** Semantic names say what a size is for, so "never use one in between" becomes
self-evident.
**[SKEPTIC]** Renaming every surviving token touches all 150+ uses and every Tailwind utility in the
apps, for no visual gain. The removed steps already force a decision at each use site.
**[VERDICT]** Keep the names. The removal is what enforces the rule. `theme.css` gets a one-line job
per step, as the comment there already does.

**Mapping of removed steps:**

| Removed | 2xs 10px | sm 12px | 2xl 24px | 3xl 30px |
|---|---|---|---|---|
| Becomes | `xs` 11px | `xs` for meta (badges, chip labels, hints, legends); `base` for running text (tooltip, toast, info notice, card body) | `xl` 20px (`VStat` size `md`) | `display` 28px (`VStat` size `lg`) |

Each use of 12px is decided at its site.

### D2. Spacing: 4px grid with 2 and 6 as the only half steps
**[SKEPTIC]** A strict multiple-of-4 rule removes 6px. That gap is what the 30px controls, the
13px type and the select's chip row stand on, and rounding it to 4 or 8 visibly loosens or cramps
every control.
**[ADVOCATE]** The half steps are already in the scale and already in use (`sm` 22 uses, `2xs` 30),
so keeping them changes nothing. What breaks the grid are the literals (3, 5, 7, 10, 14px), not
the tokens.
**[VERDICT]** Keep `2xs` and `sm`, and add `3xl` (32px) and `4xl` (40px) for `VCard`'s large
paddings. The control tokens are not touched: `--ui-control-px` stays 10px. Moving it to 12px was
shown to the owner and rejected; it widens every button by 4px against the library's move to
smaller controls.

### D3. Guards are allow-list based and live in `conventions.spec.ts`
There is one `describe` per dimension, reusing the existing `FILES` walk (SCSS plus `.vue` style
blocks, comments stripped):

- **Spacing:** for `gap`, `row-gap`, `column-gap`, `padding*`, `margin*` and `inset*`, any
  `\d(px|rem|em)` other than `±1px` fails.
- **Radius:** a literal fails unless the file and value are in `HAIRLINE_RADII`, with a comment per
  entry (the checkbox tick, the button's focus inset, the sidebar's active bar).
- **Shadow:** only `var(--ui-shadow-sm|lg)` and `none` are allowed.
- **Duration and easing:** a literal `ms`/`s` inside `transition*` or `animation*` fails, and so
  does any `cubic-bezier`. `@keyframes` percentages are not durations and are skipped.
- **Tracking:** literal `letter-spacing` fails unless it is `0`.
- **Display size:** `--ui-text-display` is allowed only in `vstat.scss` and `vskeleton.scss`.

**Alternative:** a Stylelint plugin. It was rejected because the repo has no Stylelint, and the
type guard already proves this pattern works and reports file plus value.

### D4. Shadows: two levels, and the rest becomes border plus surface
| Old level | Used by | Becomes |
|---|---|---|
| `xs` | controls (button, input, select, pagination) | `none`; the 1px border carries it |
| `md` | cards, accordion, toolbar | `sm` |
| `md` | column picker, column setup, datepicker menu | `lg`, because they float |
| `md` | switch thumb | `sm` |
| `xl` | modal, drawer, toaster, guard modal | `lg` |
| `inner` | scroll panel, file upload | `--ui-surface-sunken` background, no shadow |
| `sm` | `VSegmentedControl` track | the field recipe: `--ui-input-bg`, `--ui-input-border`, the fields' shadow |
| `sm` | `VSegmentedControl` pill | `--ui-surface-active`, no shadow |

The segmented control follows the fields rather than the buttons because it stands in the same
toolbar row as search, select and datepicker, and the owner reads them as one set.

Hover rules that raise a shadow lose it and change the surface to `--ui-surface-hover`. The dark
theme keeps its violet-tinted `--elevation-sm|lg` values, because a black shadow is invisible on
a dark surface.

### D5. Motion: three durations, an overlay exception
**[SKEPTIC]** "Transitions under 150ms" applied to a 480px drawer or a modal reads as a cut, not
a motion. emil-design-eng puts modals and drawers at 200–500ms.
**[ADVOCATE]** The 150ms ceiling is right for everything in place (hover, toggles, dropdowns,
collapses), and that is most of the library's 300-odd transition declarations.
**[VERDICT]** `instant` 80ms is for hover and press colour, `fast` 150ms for every in-place
transition, and `overlay` 200ms only for modal, drawer and toast entering, with exits at `fast`.
There are two easings, `ease-out` `cubic-bezier(0.23, 1, 0.32, 1)` and `ease-in-out`
`cubic-bezier(0.77, 0, 0.175, 1)`. Plain `ease`, `ease-in` and the overshoot in
`vthemeswitcher.scss` go. Existing `prefers-reduced-motion` handling stays as it is.

### D6. Accent roles: audit by role, no automatic guard
A guard that checks *where* `--ui-primary` appears would have to parse selectors for state markers
(`--active`, `:checked`, `[aria-selected]`, …) and would be brittle. Instead, the block audits every
use against three roles: primary action, current or selected, and focus. A pinned table column is
a state and keeps its accent (D7). The block turns the rest to neutral and records the surviving
list in `ui-component-migration.md` under Tokens, where review checks it.

### D7. Fixed column: a quieter accent, the grid stays
Three variants were compared at real size: A (today: 2px edge at 70%, 2% tint), B (neutral 1px
`--ui-border-strong`, no colour) and C (1px edge at 55%, 3% tint, 85% on row hover).

**[SKEPTIC]** B removes the one cue that tells a pinned column from a scrolled one; the owner
rejected it on sight.
**[ADVOCATE]** C keeps the cue and halves its weight, and pinning is a state, so it sits inside the
accent roles.
**[VERDICT]** C, in `_fixed.scss` only. Flattening the grid (horizontal rules only, flat header,
sort icons on hover) was compared too and rejected: without vertical rules, left- and
right-aligned columns read as a broken layout. `VTag` stays in status cells; an icon-plus-label
status was rejected because tables often carry 5–10 statuses.

### D8. Highlight dims only around a pin
The modifier on the grid becomes `highlightConfig.enabled && hasPin`, where `hasPin` is true while
a row or a column is pinned (`useTableHighlight` already holds both). The dimming rules in
`_highlight.scss` stay as they are. Moving the condition into CSS (`:has()` on a pinned row) was
rejected: it would not cover a pinned column, which marks cells, not a row.

### D9. Accessibility fixes, kept minimal
- `VSwitch`: `.v-switch__input:focus-visible + .v-switch__track` gets an `outline` in `--ui-ring`
  with an offset, never a transition. The input stays visually hidden.
- `VTooltip`: the `@focus` handler opens with no delay; the `delay` prop applies to pointer hover.
- `aria-hidden="true"` on the three decorative svgs in `TableColumnSetup.vue` (lines 413, 557, 577)
  and the canvas in `VAnimatedBackground.vue` (line 140).
- `VSelect` is left alone: its 2px focus border is deliberate (a ring would cut the notch).

### D10. `VIcon` default 16 and centring
The default `size` changes from 24 to 16. The library's own call sites that relied on 24 are found
by a search for `<VIcon` without `size` and get an explicit size wherever 24 was meant. `VIcon`'s
root gets `display: inline-flex; vertical-align: middle; flex-shrink: 0`. Inside the flex rows the
library uses, that centres the icon on the line box. `VIcon` stays the one component exempt from a
paired stylesheet, so the rule lives in the existing scoped block.

### D11. Tailwind namespace reset
The `@theme inline` block starts with `--text-*: initial;`, `--shadow-*: initial;` and
`--inset-shadow-*: initial;` before mapping the system's steps. Without the reset, deleting
`--text-sm` brings back Tailwind's own 14px `text-sm` in the apps, which is exactly the size this
system removed. The apps' remaining uses of removed utilities are migrated in the same block, so
nothing renders unstyled.

## Risks / Trade-offs

- **[Risk] No pixel suite, and every screen changes.** → Each block ends with a check by eye on `/`,
  `/components-demo` and `/table-demo` in both themes. Blocks are ordered so that the
  largest-surface change (spacing) lands first, on its own.
- **[Risk] The highlight fix changes what a consumer sees on load.** → Tables with highlight on
  render at full opacity until a pin, which is the intended behaviour; a unit test pins both states.
- **[Risk] The segmented pill on `--ui-input-bg` may lose contrast in one theme.** → Checked in
  both themes in its block; if the pill disappears, it takes `--ui-surface-hover` instead.
- **[Risk] Mapping 12px to 11 or 13 per site is subjective.** → The rule (meta → `xs`, running
  text → `base`) is written in the theme comment, so review has a criterion.
- **[Risk] Removing `--ui-shadow-xs` from controls flattens them in the dark theme, where borders
  are faint.** → The dark theme's `--ui-border` is re-checked in the shadow block. A control without
  a visible edge there is a token fix, not a shadow reprieve.
- **[Trade-off] The accent audit has no automatic guard.** It relies on review against the role
  list in `ui-component-migration.md`.
- **[Risk] Breaking token changes for consumers outside the workspace.** → `CHANGELOG.md` lists
  each removal with its replacement. Inside the workspace, both type-checks and the guards catch
  every use.

## Migration Plan

Blocks land in order on `feat/ui-refresh`, one commit each (tasks.md). Each is independently
revertible: the tokens a block removes are used only by the stylesheets that same block rewrites.
There is no runtime migration, and consumers follow the `CHANGELOG.md` mapping.
