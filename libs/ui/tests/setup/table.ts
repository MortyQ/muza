import type { Column, ExpandableRow } from "../../src/components/table/types";

/**
 * One fixture set for the whole table suite.
 *
 * Every value here is written out, never generated: a `Math.random()` row would
 * make a screenshot baseline unreproducible and a sort assertion depend on luck.
 * Unit specs and screenshots share these factories deliberately, so a failure in
 * one can be read against the other without translating between two datasets.
 */

export interface TableRow extends ExpandableRow {
  id: number
  name: string
  status: "active" | "paused" | "archived"
  revenue: number
  ratio: number
  updatedAt: string
}

const ROWS: readonly TableRow[] = [
  { id: 1, name: "Alpha", status: "active", revenue: 1250.5, ratio: 0.42, updatedAt: "2024-03-01T00:00:00.000Z" },
  { id: 2, name: "Bravo", status: "paused", revenue: 830, ratio: 0.17, updatedAt: "2024-01-15T00:00:00.000Z" },
  { id: 3, name: "Charlie", status: "active", revenue: 4400.25, ratio: 0.91, updatedAt: "2024-06-30T00:00:00.000Z" },
  { id: 4, name: "Delta", status: "archived", revenue: 0, ratio: 0, updatedAt: "2023-11-02T00:00:00.000Z" },
  { id: 5, name: "Echo", status: "active", revenue: 210.75, ratio: 0.63, updatedAt: "2024-05-20T00:00:00.000Z" },
];

/**
 * `count` rows from the fixture set, cycling with a numeric suffix once it runs
 * out so a virtualization test can ask for 500 without inventing its own data.
 */
export function makeRows(count = ROWS.length): TableRow[] {
  return Array.from({ length: count }, (_, i) => {
    const base = ROWS[i % ROWS.length];
    return i < ROWS.length
      ? { ...base }
      : { ...base, id: i + 1, name: `${base.name}-${Math.floor(i / ROWS.length)}` };
  });
}

/** The five flat columns. `overrides` patches a column by key. */
export function makeColumns(
  overrides: Record<string, Partial<Column<TableRow>>> = {},
): Column<TableRow>[] {
  const columns: Column<TableRow>[] = [
    { key: "id", label: "ID", width: "60px", align: "right" },
    { key: "name", label: "Name", sortable: true },
    { key: "status", label: "Status", align: "center" },
    { key: "revenue", label: "Revenue", width: "120px", align: "right", sortable: true, format: { currency: true } },
    { key: "updatedAt", label: "Updated", width: "140px", format: { date: "short" } },
  ];

  return columns.map(column =>
    overrides[column.key] ? { ...column, ...overrides[column.key] } : column,
  );
}

/**
 * Two-level header: a `Performance` group over `revenue` + `ratio`, with `id`
 * and `name` staying flat. Enough shape to exercise colspan, rowspan and the
 * leaf-flattening in `useGroupedHeaders` without becoming unreadable.
 */
export function makeGroupedColumns(): Column<TableRow>[] {
  return [
    { key: "id", label: "ID", width: "60px" },
    { key: "name", label: "Name", sortable: true },
    {
      key: "performance",
      label: "Performance",
      children: [
        { key: "revenue", label: "Revenue", width: "120px", sortable: true },
        { key: "ratio", label: "Ratio", width: "80px" },
      ],
    },
  ];
}

/**
 * Three levels deep on one branch, flat on the others — a tree where a
 * depth-first flatten produces a different order than a breadth-first one, so a
 * regression in `useExpandableTable` cannot pass by accident.
 *
 * Shape: 1 → (11 → (111), 12), 2, 3
 */
export function makeTreeRows(): TableRow[] {
  const leaf = (id: number, name: string): TableRow => ({
    ...ROWS[(id - 1) % ROWS.length], id, name,
  });

  return [
    {
      ...leaf(1, "Alpha"),
      children: [
        { ...leaf(11, "Alpha / One"), children: [leaf(111, "Alpha / One / Deep")] },
        leaf(12, "Alpha / Two"),
      ],
    },
    leaf(2, "Bravo"),
    leaf(3, "Charlie"),
  ];
}

/** Columns pinned to both edges, for `useFixedColumns` and sticky-offset specs. */
export function makeFixedColumns(): Column<TableRow>[] {
  return makeColumns({
    id: { fixed: "left" },
    name: { fixed: "left" },
    updatedAt: { fixed: "right" },
  });
}

/** A summary row shaped like a data row, for the sticky total-row branch. */
export function makeTotalRow(): Record<string, unknown> {
  return { id: "", name: "Total", status: "", revenue: 6691.5, updatedAt: "" };
}
