import type { ColumnPickerType } from "./types/toolbar";

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

/**
 * Rows drawn while the first load has nothing to show. Twelve rows at the
 * default 40px fill most of the default 600px body, so the first paint is the
 * table's own shape rather than a spinner over an empty grid. A shorter table
 * clips the rest, which costs nothing.
 */
export const SKELETON_ROW_COUNT = 12;

/** Bar widths cycled across skeleton cells, so the rows do not read as stripes. */
export const SKELETON_WIDTHS = ["72%", "48%", "60%", "36%", "84%", "52%"] as const;

/**
 * Built-in column picker types: the one source of order, label, icon and tone in
 * "group by type" mode. Consumers extend it through `columnPicker.types`.
 */
export const COLUMN_PICKER_TYPES: ReadonlyArray<ColumnPickerType> = [
  { key: "text", label: "Text", icon: "lucide:align-left", color: "muted" },
  { key: "multi-text", label: "Multi-text", icon: "lucide:align-justify", color: "muted" },
  { key: "number", label: "Number", icon: "lucide:hash", color: "primary" },
  { key: "decimal", label: "Decimal", icon: "lucide:percent", color: "primary" },
  { key: "boolean", label: "Boolean", icon: "lucide:toggle-right", color: "success" },
  { key: "date", label: "Date", icon: "lucide:calendar", color: "warning" },
  { key: "datetime", label: "Datetime", icon: "lucide:calendar-clock", color: "warning" },
  { key: "select", label: "Select", icon: "lucide:list", color: "primary" },
  { key: "multi-select", label: "Multi-select", icon: "lucide:list-checks", color: "primary" },
  { key: "color", label: "Color", icon: "lucide:palette", color: "danger" },
  { key: "json", label: "JSON", icon: "lucide:braces", color: "danger" },
  { key: "url", label: "URL", icon: "lucide:link", color: "muted" },
  { key: "link", label: "Link", icon: "lucide:external-link", color: "muted" },
  { key: "asset", label: "Asset", icon: "lucide:image", color: "info" },
  { key: "multi-asset", label: "Multi-asset", icon: "lucide:images", color: "info" },
  { key: "sys", label: "File", icon: "lucide:file", color: "info" },
];
