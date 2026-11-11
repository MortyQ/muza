# Changelog — `@muzakit/ui`

## Unreleased — UI refresh

### Added

- **`VStat`**: the one figure a block leads with. A muted label sits 2px above a strong figure in tabular digits, at 24px (`md`) or 30px (`lg`). It has `chip` and `hint` slots, and `tone="danger"` colours the figure only.
- **`VCount`**: a figure that rolls to a new value instead of jumping. It takes an already formatted string. Changed digits roll in their own column, the last digit first. Separators and currency never roll, and a length change eases the width. At rest the DOM is the plain value. Nothing moves on first paint or under reduced motion.
- **`VSkeleton`**: a placeholder at the content's own geometry. A `line` fills the exact line box of a type step, so the text that replaces it moves nothing. There are also `disc` and `block` shapes. It is `aria-hidden`; the loading region carries the status role.
- **`VEmptyState`**: one muted line and an optional `action` slot.
- **`VTable`**, brought level with so-platform's table:
  - `v-model:page-size`. Bind it when the size is a request `limit` the parent owns. It outranks `pagination.pageSize` for the pager, page changes, sorting and refresh.
  - `toolbar.actions.refresh` takes an object form, `{ mode, loading }`, so the button can spin while the parent refetches. The boolean and string forms work as before.
  - `COLUMN_PICKER_TYPES`, one registry for the order, label, icon and tone of every column picker type. `columnPicker.types` adds a consumer's own types after the built-ins, or replaces a built-in in place.
  - `toolbar-filters` and `toolbar-column-actions` slots. Filters sit on the left after the search; column actions sit on the right, before the column buttons.
  - `defineExpose({ visibleColumns })`: the columns as the user sees them, after column setup or the picker and the storage restore.
  - A column pin button in each header when highlighting is on. The row pin already existed.
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
- **`VProgressBar`** is now a bare bar, in line with `VStat` and `VSkeleton`:
  - **It draws no card.** The border, shadow, surface and 200px minimum width are gone. Wrap it in `VCard` where the card was wanted.
  - The track is fully rounded on `--ui-surface-sunken`, with a solid fill. The flowing gradient and the looping shine are gone, so nothing moves while the value is still.
  - A change of value eases the fill to its new width, and the figure rolls through `VCount` in tabular digits. Both are instant under reduced motion.
  - The label and figure use the `sm` type step; the label is secondary text. At 100% the figure and fill turn success-green, with a plain check instead of `check-circle`.
  - Track heights are spacing tokens, at the same 4, 6 and 8px. The progressbar takes `step` as its accessible name.
  - The props are unchanged.
- **`VTable` pagination**:
  - `PaginationConfig.page` and `pageSize` are optional. An owner elsewhere (`v-model:page`, `useTablePage()`, `v-model:page-size`) outranks both.
  - The size changer shows whenever `pageSizeOptions` is passed. It was hidden unless `showSizeChanger: true` was also set. An explicit `showSizeChanger: false` still hides it.
- **`VTable` column picker**:
  - In "group by type" mode, types follow the registry's sixteen-step order instead of a five-type list; for example, `decimal` now sits right after `number`.
  - Types keep their registry labels, so `url` reads "URL".
- **`TablePeriodSelect`**: `widthClass` defaults to `""`, not the Tailwind class `w-40`. The library's own templates carry no utility classes. The wrapper is still 10rem wide, so nothing moves. Pass a class only for your app's own sizing.
- **Raw colours replaced with tokens**: `white` on primary fills is now `--ui-primary-foreground`, in the same colour. The switch thumb uses that token too. The modal and drawer glass edge is foreground at 10% instead of `white` at 30%, so it shows in light mode and no longer glares in dark.

### Fixed

- `VTable` no longer shows "No data to display" while its first load is still running.
- `VTable`, sorting and paging:
  - Clearing a front sort shows the current data again. It used to restore a snapshot of the first load, so a refetch, a page change or an edit made before the sort was lost.
  - Refresh and reset-sort ask for page 1. They asked for `pagination.page`, so a table that did not own its page refetched the page it was leaving.
  - A row or column pin clears on refresh, reset-sort, a server sort and a page change. Each of those replaces the rows the pin pointed at.
- `VTable`, wiring:
  - A `class`, `style` or data attribute set on `<VTable>` lands on the wrapper. It was dropped, because the root is a fragment.
  - The column picker shows without `columnSetup`. Its toolbar slot was gated on `columnSetup` alone.
  - In the column picker's "group by type" mode, two unknown types no longer interleave into repeated headers under their raw keys.
- `VTable`, drawing:
  - Table content is clipped to the card's rounded corners. The header gradient, the loading overlay and the empty state used to run past the top curve.
  - The hover and selected accent bar no longer overrides the tree indent.
  - Mid-resize, hovered cells keep a column's `cellStyle` background. It used to be forced to `none`.
  - A leaf header spanning both rows of a grouped header fills them, instead of leaving a hole.
  - The corner over a hidden header checkbox is opaque and sticky; rows no longer scroll through it.
  - The sort control shows a focus ring.
- `VTable` skips a virtual row whose index has run past the data, instead of reading an undefined row.
- `DeltaValue` groups thousands in an unformatted delta (`12,345`), as every other branch already did.
- `VTab`'s arrow keys no longer throw when every tab is disabled.
- `VFloating` removes its document `keydown` listener on every close path and on unmount. Closing through the trigger or unmounting while open used to leave it attached.

### Accessibility

Found by a full pass of the new reviewer (`.claude/hooks/review.sh`, `REVIEW_MODE=all`):

- **`VModal`, `VDrawer`**: `role="dialog"`, `aria-modal`, named by the title. Focus moves into the dialog on open, Tab stays inside, and focus returns to the trigger on close. Escape works without a click first; before, the key never reached the dialog. `NavigationGuardModal` now also returns focus. The shared `useDialogFocus` composable does this.
- **Click-only elements now work from the keyboard**. Each takes Enter/Space and has a focus ring:
  - a `clickable` `VCard` is `role="button"`;
  - `VChip` is a toggle button with `aria-pressed` when bound to a model, or a button when it has a click listener;
  - in the column picker, groups expand from a real button with `aria-expanded`, and columns are checkboxes;
  - "show all" in column setup is a tri-state checkbox;
  - a header label with `onHeaderClick` is a button.
- **Icon-only buttons are named**: `VTab`'s overflow button ("3 more tabs"), `VChip` close, file and list remove buttons, the table's refresh, row-expand, additional-headers and both column popover triggers. Disclosure buttons report `aria-expanded`.
- **Labels**:
  - `VSelect`'s floating label names its combobox.
  - `VCheckbox` keeps its label association when disabled.
  - The column picker's search input is labelled.

### Motion

- No `transition: all` remains. Every transition names its properties.
- Exits use ease-out instead of ease-in (tooltip, guard modal, mobile sidebar backdrop).
- Modals and drawers leave faster than they enter. Drawers and the mobile sidebar use the drawer curve.
- `prefers-reduced-motion` is honoured across the library:
  - modals, drawers, toasts, the mobile sidebar and table row expansion keep their fade and drop their movement;
  - press scales, hover lifts, enter/leave slides, chevron rotations and the switch thumb change instantly;
  - colour and opacity still ease;
  - spinners keep turning, since their motion is the message.
- Hover styles sit behind `@media (hover: hover) and (pointer: fine)`: 98 rules across the components and the table. A tap on a touch screen no longer leaves a button, row, chip or menu item stuck in its hover colour.
- Hover affordance only where a click does something:
  - only an interactive `VCard` reacts, lifting 2px instead of `scale(1.02)` on every elevated card;
  - a display-only `VChip` no longer darkens under the pointer.

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
