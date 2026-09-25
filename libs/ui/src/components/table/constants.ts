/**
 * The height of a body row, in px. It lives in JS rather than in the
 * stylesheet because the virtualizer needs a number and does not measure rows
 * (`measureElement: false`): VTable hands it to CSS as `--v-table-row-h`, so the
 * rows the browser draws and the rows the virtualizer counts cannot disagree.
 */
export const DEFAULT_ROW_HEIGHT = 50;
