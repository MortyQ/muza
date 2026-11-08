# UI refresh — what only the running app can confirm

Branch `feat/ui-refresh`. Token contracts, geometry specs and unit tests cover what can be measured, but the items below need a person looking at the app.

Check each item on `/components-demo` and `/table-demo` under both `data-theme="light"` and `data-theme="dark"`. A pass in one theme proves nothing about the other.

## Contrast

- [ ] **Warning tag in light theme.** Soft and outline warning text (`--ui-warning-hover`, L 65%) on `--ui-warning-subtle` (L 96%). The numbers suggest it may fall short; measure it.
- [ ] **Soft tags in dark theme.** Every status: `-hover` text on the `-subtle` fill.
- [ ] **Skeleton bars in both themes.** `--ui-surface-sunken` should read against the card and the table surface without shouting.

## Motion

- [ ] **`VCount` in the revenue card.** Use "Nudge" and "Change length". Only the changed digits move, the last one first. Separators and `$` stay still, the width eases, and nothing blurs or jumps.
- [ ] **Deltas in the table.** On a period or filter change, delta figures roll instead of jumping.
- [ ] **Reduced motion.** With *Reduce motion* turned on in the OS, nothing rolls, skeletons don't pulse, and tags don't transition.
- [ ] **Interrupted roll.** Press "Nudge" quickly several times. The figure always settles on the last value.

## Layout

- [ ] **Skeleton → first rows on `/table-demo`.** The bars sit where the text lands, and nothing shifts when the data arrives.
- [ ] **A short table.** Below 600px the skeleton rows are clipped, not squeezed.
- [ ] **Fixed columns and selection** during the skeleton. The pinned columns stay pinned and the checkbox column keeps its width.
- [ ] **`VTag` in every size, variant and shape.** One height per size across the variants, and a tag in a table row doesn't grow the row.
- [ ] **List editor tags** (`md`, now 12px): still comfortable to read and to remove.

## Type

- [ ] **Card, modal and drawer titles** at 15 / 18 / 18px. The card title shrank the most; check it still leads its card.
- [ ] **Former 14px text** (toasts, progress bar, deltas, descriptions) at 13px.
- [ ] **Column picker and column setup** at 10–12px: readable at a normal viewing distance.
- [ ] **Table body text** now at weight 450, previously 400.
