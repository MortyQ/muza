# Proposal

## Why

`@muzakit/ui` has tokens for every dimension, but the scales are too loose to act as a system:
- 8 type sizes, four of them 1px apart (10/11/12/13);
- 6 shadow levels and more than ten transition durations, one of them with an overshoot;
- 192 `gap`/`padding`/`margin` declarations and 50 radii typed by hand, many off any grid (3, 5, 7, 10, 14px);
- `--ui-primary` used 193 times, so the accent colour no longer marks anything.

The owner reviewed two UI best-practice sources: a five-token design-system rule set and the "Linear issue list" density rules. A Hallmark audit (app-screen scope) then added findings. The owner checked every candidate change on a real-size before/after comparison of the live components and chose which to adopt. This change makes those choices the library's contract. The stylesheet guard enforces them, so the scales stay tight without relying on review.

## What Changes

Packages:
- **`libs/ui`**;
- **`libs/config`**: the raw scales in `src/tailwind/theme.css` and their Tailwind namespace mapping;
- both apps, where they use a removed utility or an off-scale size.

**Spacing**
- Every gap, padding and margin comes from `--ui-space-*`.
- The scale is a 4px grid. 2px and 6px are the only half steps, kept for dense controls.
- The scale gains `3xl` (32px) and `4xl` (40px).
- The control tokens keep their values; see Out of scope.
- The stylesheet guard bans literal spacing.

**Radius**
- A nested corner follows outer = inner + padding, expressed with tokens.
- Literal radii are banned, except hairline marks allow-listed by name.

**Type**
- Four working sizes: `xs` 11, `base` 13, `lg` 15 and `xl` 20.
- One `display` size of 28px, for headline figures (`VStat`) only.
- Two letter-spacing tokens replace eight literal values: `tight` (-1%, body and UI text) and `caps` (+4%, uppercase labels).
- The dashboard's own pages move their off-scale sizes (14, 16, 10 and 12px) onto the scale.
- **BREAKING (tokens):**
  - `--ui-text-2xs`, `-sm`, `-2xl` and `-3xl` and their `--ui-leading-*` are removed;
  - `--ui-text-xl` changes from 18 to 20px;
  - `--ui-text-display` is added.

**Shadows**
- Two levels:
  - `sm` for resting cards;
  - `lg` for anything that floats: modal, drawer, dropdown, popover, tooltip, toast.
- Hover changes the surface value, never the elevation.
- `VSegmentedControl` takes the field recipe: `--ui-input-bg`, `--ui-input-border` and the fields' shadow. It then matches input, select and datepicker in a toolbar row.
- **BREAKING (tokens):** `--ui-shadow-xs`, `-md`, `-xl` and `-inner` are removed.

**Motion**
- New duration tokens:
  - `--ui-duration-instant` (80ms): hover and press feedback;
  - `--ui-duration-fast` (150ms): in-place transitions;
  - `--ui-duration-overlay` (200ms): overlays entering.
- New easing tokens: `--ui-ease-out` and `--ui-ease-in-out`.
- Table cells and headers answer hover in 80ms instead of 300ms.
- No overshoot anywhere: the `VThemeSwitcher` bounce goes.
- Literal durations are banned.

**Colour**
- `--ui-primary` marks only three things:
  - the primary action;
  - a current or selected state; a pinned (fixed) table column counts as a state;
  - focus.
- Every other use goes neutral.
- The fixed-column accent gets quieter: a 1px edge at 55% instead of 2px at 70%, and a 3% background tint. The edge rises to 85% on row hover.

**Table highlight (bug fix)**
- With highlight enabled and nothing pinned, VTable dims every row to 38% opacity.
- Dimming applies only while a row or a column is pinned.

**Accessibility**
- `VSwitch` shows a focus ring on keyboard focus.
- `VTooltip` opens on focus without the hover delay.
- These decorative graphics are hidden from assistive technology:
  - the three svgs in `TableColumnSetup`;
  - the canvas in `VAnimatedBackground`.

**Copy**
- `VComposer`'s error drops its em dash.
- `VListEditor`'s separator hint drops its middle dots.

**Alignment**
- Table cells set tabular figures.
- **BREAKING:** `VIcon`'s default `size` changes from 24 to 16, and an icon is centred on the line of text it sits in.

**Tailwind theme**
- The theme in `libs/config` resets the `text`, `shadow` and `inset-shadow` namespaces.
- A removed step then produces no utility at all, instead of falling back silently to Tailwind's own value (14px for `text-sm`).

**Changelog and docs**
- `libs/ui/CHANGELOG.md` records every token removal and value change, and the `VIcon` default.
- `ui-component-migration.md` updates its token table and records the accent roles.

**Out of scope** (owner decisions):
- **Table row height** stays 40px.
- **Table grid** is unchanged: vertical rules, the header and total-row gradients, and the always-visible sort icons all stay. With vertical rules, left- and right-aligned content reads as intended.
- **Status cells** keep `VTag` pills. Tables often carry 5–10 statuses, which an icon alone cannot tell apart. No `VStatus` component is added.
- **Control sizes** keep their values: `--ui-control-h*` and `--ui-control-px` (10px). The library is moving smaller, not larger.
- **`VSelect` focus** keeps its 2px border. A ring would cut through the floating label's notch.
- **Keyboard-shortcut hints** (`kbd`) are not part of this change.
- **Colour hues and the light/dark palettes** do not change; only where the accent is used.
- **No pixel-regression suite** is reintroduced.

## Capabilities

### New Capabilities
- `ui-design-tokens`: the token scales `@muzakit/ui` exposes, and the accent-colour roles.
  - Scales: spacing, radius, type, tracking, elevation, motion.
  - Component styles take every such value from these scales.
- `ui-table-appearance`: the table's resting look. It covers the fixed-column accent, how fast a row answers hover, and when highlight dims rows.
- `ui-accessibility`: keyboard focus that can be seen and reached, and decorative graphics hidden from assistive technology.
- `ui-icon`: `VIcon`'s default size and its vertical alignment within text.

### Modified Capabilities
- None. `openspec/specs/` holds no living spec yet. The only in-flight change (`make-vtable-row-types-strict`) covers table row typing, which this change does not touch.

## Impact

- **Public API of `@muzakit/ui` changes.**
  - Tokens are removed and one changes value, which breaks any consumer stylesheet that reads them.
  - `VIcon` gets a new default size.
  - Every change gets a `CHANGELOG.md` entry.
- **`libs/config/src/tailwind/theme.css`**: raw scales and the `@theme inline` mapping.
- **`libs/ui/src/styles/**` and `libs/ui/src/components/table/assets/styles/**`**: the spacing, type, shadow and motion sweeps touch nearly every stylesheet. The table's `_fixed.scss` and `_highlight.scss` change too.
- **`VTable.vue`**: the highlight modifier depends on a pin existing.
- **`libs/ui/tests/conventions.spec.ts`**: new guards for spacing, radius, shadow, duration and letter-spacing literals, next to the existing type-values guard.
- **Token contracts in `libs/ui/tests/visual/tokens/`** that pin a removed token are re-pointed, for example the card's `--ui-shadow-md` and the modal's `--ui-shadow-xl`.
- **Apps**:
  - Tailwind utilities from removed steps in `apps/**`: `text-2xs` ×3, `text-sm` ×6, `text-2xl` ×1 and `shadow-md` ×1.
  - `text-xl` (×1) grows from 18 to 20px.
  - Page-level font sizes on the dashboard's demo pages move onto the scale.
- **Visual check**: the visual result changes everywhere. With no pixel suite, every block ends with a check by eye on `/home`, `/components-demo` and `/table-demo`, in both themes.
