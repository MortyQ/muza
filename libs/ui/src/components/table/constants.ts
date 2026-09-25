/**
 * The height of a body row, in px. It lives in JS rather than in the
 * stylesheet because the virtualizer needs a number and does not measure rows
 * (`measureElement: false`): VTable hands it to CSS as `--v-table-row-h`, so the
 * rows the browser draws and the rows the virtualizer counts cannot disagree.
 *
 * 40 is `--ui-control-h-lg`: a 30px control and 5px of air on either side,
 * so a button or a select in a cell fits the row instead of growing it. A
 * browser contract fails if the control scale moves away from this number.
 */
export const DEFAULT_ROW_HEIGHT = 40;
