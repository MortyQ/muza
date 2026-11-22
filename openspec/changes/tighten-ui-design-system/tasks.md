# Tasks

Each group is one block and one commit: `feat(ui): <block>`, `feat(config,ui)` where `theme.css` changes, and `fix(ui)` for the highlight bug.

Each group runs the block loop of `.claude/review/PIPELINE.md`: staged review with `.claude/hooks/review.sh`, then commit.

There is no pixel suite, so every group ends with a check by eye on `/home`, `/components-demo` and `/table-demo` in both themes.

## 1. Highlight dims only around a pin

- [x] 1.1 Make the grid's highlight modifier conditional on a pin (D8).
  - Change: `v-table-grid--highlight` is set only while a row or a column is pinned.
  - Verify: a unit spec for both cases. With `highlight` on and nothing pinned, body cells have no dimming class. Pinning a row adds it; unpinning removes it.
- [x] 1.2 Check `/table-demo` by eye.
  - Verify: «Marketplace orders», «Pinned cross» and «Linked tables» render at full opacity until a pin.
  - Add a CHANGELOG Fixed entry.

## 2. Accessibility

- [x] 2.1 Give `VSwitch` a focus ring (D9).
  - Change: an instant `outline` in `--ui-ring` on `:focus-visible`.
  - Verify: a browser contract asserts the outline appears on keyboard focus and not on pointer click.
- [x] 2.2 Open `VTooltip` on focus without the hover delay.
  - Verify: a unit spec on fake timers. Focus opens it at 0ms; hover opens it after `delay`.
- [x] 2.3 Hide the decorative graphics from assistive technology.
  - Change: add `aria-hidden="true"` to the three decorative svgs in `TableColumnSetup.vue` and the canvas in `VAnimatedBackground.vue`.
  - Verify: unit assertions, and Hallmark's sloplint reports no gate 33 for those files.

## 3. Spacing scale and guard

- [x] 3.1 Add the two new spacing steps.
  - Change: `--space-3xl` (2rem) and `--space-4xl` (2.5rem) in `theme.css`, and their `--ui-space-*` wrappers in `tokens.css`.
  - Leave the control tokens unchanged.
  - Verify: a token contract asserts all nine spacing tokens compute to 2/4/6/8/12/16/24/32/40px in both themes.
- [x] 3.2 Add the spacing guard to `tests/conventions.spec.ts` (D3).
  - Rule: a literal `gap`, `padding*`, `margin*` or `inset*` fails, except `±1px`.
  - Verify: it fails on the current tree and lists the 192 declarations.
- [x] 3.3 Replace every literal spacing value with a token, mapping each value by hand (D2).
  - Scope: `libs/ui/src/styles/**` and `components/table/assets/styles/**`.
  - Verify: the spacing guard passes, and `test:unit` and `test:tokens` stay green.
- [x] 3.4 Update the docs and contracts.
  - Re-point any token contract that pinned a literal spacing value.
  - Update the Rhythm row of the token table in `ui-component-migration.md`.
  - Add a CHANGELOG entry for the new steps.
  - Verify: `test:tokens` passes.

## 4. Radius rule and guard

- [x] 4.1 Add the radius guard with a commented `HAIRLINE_RADII` allow-list (D3).
  - Verify: it fails on the current tree with the expected list.
- [x] 4.2 Replace literal radii with tokens.
  - Nested inner radii become `calc(<outer token> - <padding token>)`. This covers `VSegmentedControl`'s `- 2px`, `vcard.scss` and `vtab.scss`.
  - Verify: the guard passes, and a token contract asserts the segmented pill's radius equals the track radius minus the track padding.
- [x] 4.3 Document "outer = inner + padding" under Step 6 of `ui-component-migration.md`.
  - Verify: the doc names the guard.

## 5. Type scale and tracking

- [x] 5.1 Reshape the type scale.
  - In `theme.css`:
    - remove `--type-2xs`, `--type-sm`, `--type-2xl` and `--type-3xl`;
    - set `--type-xl` to 1.25rem, line height 1.75rem;
    - add `--type-display` at 1.75rem, line height 2.25rem;
    - rewrite the scale comment with one job per step and the 12px mapping rule (D1).
  - Mirror these changes in `tokens.css`.
  - Add `--ui-tracking-tight` (-0.01em) and `--ui-tracking-caps` (0.04em).
  - Verify: a token contract for the five sizes and two trackings.
- [x] 5.2 Map only the system's type steps in Tailwind (D11).
  - Change: add `--text-*: initial` to `@theme inline` and map only `xs`/`base`/`lg`/`xl`/`display`.
  - Migrate the apps' `text-2xs`, `text-sm` and `text-2xl` uses.
  - Move the dashboard pages' own off-scale sizes onto the scale: 14px descriptions and 16px section titles on the demo pages, 10px sidebar and workspace badges, 12px toolbar subtitle.
  - Verify: `pnpm build` succeeds, and a search for the removed utilities in `apps/` returns nothing.
- [x] 5.3 Re-map library uses of the removed steps per D1.
  - Each `--ui-text-2xs`/`-sm`/`-2xl`/`-3xl` use moves; each 12px site becomes `xs` for meta or `base` for running text.
  - `VStat` moves `md` to `xl` and `lg` to `display`; `VSkeleton`'s figure lines follow.
  - Verify: `test:unit`, plus the `VStat` and `VSkeleton` token contracts updated to the new sizes.
- [x] 5.4 Replace literal `letter-spacing` with the tracking tokens.
  - Extend the type-values guard with the tracking rule and the display allow-list (D3).
  - Verify: the guard passes and fails when a literal is reintroduced.
- [x] 5.5 Fix the copy in two components.
  - `VComposer`'s error message: no em dash.
  - `VListEditor`'s separator hint: no middle dots.
  - Verify: Hallmark's sloplint reports no gate 19 or 63 for those two files.
- [x] 5.6 Update the docs.
  - Update the Type row in `ui-component-migration.md`.
  - Add CHANGELOG **BREAKING** entries: each removed step with its replacement, `xl` 18 → 20px, `display` added.
  - Verify: the changelog lists every removed token.

## 6. Two elevation levels and one toolbar chrome

- [x] 6.1 Cut the elevation tokens to two levels.
  - In `theme.css`, for both themes, remove `--elevation-xs`, `-md`, `-xl` and `-inner`.
  - In `@theme inline`, reset `--shadow-*` and `--inset-shadow-*` and map only `sm` and `lg`.
  - Mirror these changes in `tokens.css`.
  - Verify: a token contract asserts that `sm` and `lg` resolve in both themes.
- [x] 6.2 Apply the D4 table across the library.
  - Remove hover rules that change `box-shadow`; use `--ui-surface-hover` instead.
  - Migrate the app's `shadow-md`.
  - Verify: the shadow guard (only `sm`, `lg` or `none`) passes, and the contracts for modal, drawer, toaster, datepicker menu and column picker assert `--ui-shadow-lg`.
- [x] 6.3 Give `VSegmentedControl` the field recipe.
  - Track: `--ui-input-bg`, `--ui-input-border` and the fields' shadow.
  - Pill: `--ui-surface-active`, no shadow.
  - Verify: a browser contract asserts that the track's background, border colour and shadow equal `VInput`'s, in both themes, and that the selected pill stays visible in both.
- [x] 6.4 Check control edges in the dark theme now that `xs` is gone.
  - Fix: if a control has no visible edge, fix `--border` in the dark block of `theme.css`.
  - Verify: by eye on `/components-demo` in dark, and with the `VInput` and `VSelect` chrome contracts.
- [x] 6.5 Update the docs.
  - Update the Shadow row in `ui-component-migration.md`.
  - Add CHANGELOG **BREAKING** entries.
  - Verify: the changelog maps each removed level to its replacement.

## 7. Motion tokens

- [x] 7.1 Add the motion tokens to `tokens.css` (D5).
  - Durations: `--ui-duration-instant` (80ms), `-fast` (150ms) and `-overlay` (200ms).
  - Easings: `--ui-ease-out` and `--ui-ease-in-out`.
  - Verify: a token contract for the three durations.
- [x] 7.2 Replace every literal duration and easing in library styles.
  - Table cells and headers use `instant`; this covers `$highlight-transition` and `$transition-slow`.
  - Overlays use `overlay` on enter and `fast` on exit.
  - Remove the `vthemeswitcher.scss` overshoot.
  - Verify: the duration and easing guard passes, a table cell computes an 80ms transition, `VCollapse`'s geometry spec still passes, and the reduced-motion branches are unchanged.
- [x] 7.3 Update the docs.
  - Add a Motion row to the token table in `ui-component-migration.md`.
  - Add a CHANGELOG entry.
  - Verify: the doc states the overlay exception.

## 8. Accent roles and the fixed column

- [x] 8.1 Give the fixed column the quieter accent from D7, in `_fixed.scss`.
  - Edge: 1px at 55%; 85% on row hover.
  - Tint: 3%.
  - Leave the grid's vertical rules, the header and total gradients, and the sort icons unchanged.
  - Verify: a `table.tokens` contract asserts the edge width and colour at rest and on row hover.
- [x] 8.2 Audit every `--ui-primary*` use against the three roles (D6).
  - The roles: primary action, current or selected state (a pinned column included), focus.
  - Turn the uses outside those roles to foreground, muted or surface tokens.
  - Verify:
    - on `/components-demo`, the accent appears only in those roles;
    - `test:tokens` is green after re-pointing contracts that pinned a decorative primary.
- [x] 8.3 Record the role list and the surviving uses per component in `ui-component-migration.md`.
  - Verify: every remaining `--ui-primary` file appears in that list.

## 9. Icons and alignment

- [x] 9.1 Change `VIcon`'s default `size` to 16 (D10).
  - Give an explicit size to every library call site that relied on 24.
  - Add `inline-flex`, `vertical-align: middle` and `flex-shrink: 0` to its root.
  - Verify:
    - a unit spec for the default and explicit size;
    - a browser contract that the icon's centre is within 1px of the text line's centre.
- [x] 9.2 Set `font-variant-numeric: tabular-nums` on table cells.
  - Verify: a `VTable.layout` assertion that a cell computes `tabular-nums`.
- [x] 9.3 Add a CHANGELOG **BREAKING** entry for the `VIcon` default.
  - Verify: it names the old and the new value.

## 10. Integration

- [ ] 10.1 Run the cold-build verification from `ui-component-migration.md` § Verify, plus `test:unit`, `test:tokens` and `test:types`.
  - Verify: all are green.
- [ ] 10.2 Run `REVIEW_MODE=feature .claude/hooks/review.sh`.
  - Verify: zero critical findings.

## Workflow follow-up

- The owner reviews the result on `/home`, `/components-demo` and `/table-demo` in both themes.
- Sync the specs (`openspec-sync-specs`) and archive the change once it is committed.
