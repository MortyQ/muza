# Changelog — `@muzakit/ui`

## Unreleased — UI refresh

### Added

- **`VStat`**: the one figure a block leads with. A muted label sits 2px above a strong figure in tabular digits, at 24px (`md`) or 30px (`lg`). It has `chip` and `hint` slots, and `tone="danger"` colours the figure only.
- **`VCount`**: a figure that rolls to a new value instead of jumping. It takes an already formatted string. Changed digits roll in their own column, the last digit first. Separators and currency never roll, and a length change eases the width. At rest the DOM is the plain value. Nothing moves on first paint or under reduced motion.
- **`VSkeleton`**: a placeholder at the content's own geometry. A `line` fills the exact line box of a type step, so the text that replaces it moves nothing. There are also `disc` and `block` shapes. It is `aria-hidden`; the loading region carries the status role.
- **`VEmptyState`**: one muted line and an optional `action` slot.
- **Tokens**:
  - `--ui-weight-regular` (450), `--ui-weight-medium` (500) and `--ui-weight-strong` (600);
  - `--ui-text-2xl` / `--ui-text-3xl` and their `--ui-leading-*`, for headline figures only.

### Changed

- **`VTag`** now uses a single geometry:
  - Sizes sit on the type scale: `xs` 10, `sm` 11, `md` 12 and `lg` 13px, down one step from before. Height is the line box plus a spacing token. Every variant has the same box.
  - Soft, outline and ghost read the tone's `-hover` on a `-subtle` fill. `-foreground` is used on solid fills only.
  - Weight is medium, with tabular digits.
  - **Class names changed.** `vtag--soft-primary` is now `vtag--soft vtag--tone-primary`. The root carries `data-tone` and `data-variant`. The `customColor` property is now `--v-tag-custom`, not `--_tag-color`. CSS that targeted the old classes needs updating.
  - The status name is `danger`. `error` and `gray` still work, as aliases of `danger` and `neutral`.
- **`VTable`**:
  - A first load with no rows draws twelve skeleton rows at the row height instead of a spinner. A refetch over rows already shown keeps the dimmed overlay.
  - The scroll container carries `aria-busy`.
- **`DeltaIndicator` / `DeltaValue`** roll their figures through `VCount` and use tabular digits.

### Fixed

- `VTable` no longer shows "No data to display" while its first load is still running.

### Look

Every component's type now comes from the type and weight scales. Nothing under `libs/ui/src` sets a literal font size or weight, and a convention test keeps it that way. Visible differences:

- **Headings**:
  - card title 18 → 15px;
  - card subtitle 14 → 12px, 2px under the title;
  - modal and drawer titles 20 → 18px.
- **14px text is now 13px** (`base`): card descriptions, toasts, the progress bar, deltas, the navigation guard modal and the list editor's tags.
- **The column picker and column setup** lose their 9.5–12.5px sizes to the 10, 11 and 12px steps.
- **Weights**:
  - 700 is now 600 wherever it was used: the sidebar header and mobile header, the column picker and column setup labels, and the table's bold weight;
  - 400 is now 450: the select's dropdown text and the table's regular weight, which means table body text;
  - 550 is now 500: avatar initials.
