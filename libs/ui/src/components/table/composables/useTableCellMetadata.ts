import { toValue, type MaybeRefOrGetter } from "vue";

import type { Column, ExpandableRow } from "../types/index";

import { useTableFormatters } from "./useTableFormatters";

/** The object shape a `column.format` formatter may return in place of a value. */
interface FormattedCell {
  text?: unknown
  class?: string
}

/**
 * Everything a data cell needs to render, resolved in one pass.
 *
 * Before this existed, VTable's template called five separate helpers per cell —
 * one for the formatted value, one for the class, one for the title, one for the
 * indent and one for expandability — each of which re-ran the formatter. The
 * table renders `rows × columns` cells per frame, so that is the one place in
 * the component where redundant work is actually measurable.
 */
export interface CellMetadata {
  formattedValue: unknown
  cssClass: string | undefined
  titleText: string | undefined
  indentStyle: { paddingLeft: string } | null
  customStyle: Record<string, string> | undefined
  isExpandable: boolean
}

export interface UseTableCellMetadataOptions {
  /** Whether the table has expandable rows at all — the `colIndex === 0` short-circuit. */
  isExpandable: MaybeRefOrGetter<boolean>
  /** Per-row check, normally `useExpandableTable`'s own `isExpandable`. */
  isRowExpandable: (row: ExpandableRow) => boolean
}

export interface UseTableCellMetadataReturn<TData extends Record<string, unknown>> {
  getCellMetadata: (
    row: TData,
    column: Column<TData>,
    colIndex: number,
    rowIndex: number,
  ) => CellMetadata
}

export const useTableCellMetadata = <TData extends Record<string, unknown>>(
  options: UseTableCellMetadataOptions,
): UseTableCellMetadataReturn<TData> => {
  const { isExpandable, isRowExpandable } = options;
  const { formatCellValue } = useTableFormatters();

  /**
   * Keyed by row object identity, so a new row object invalidates naturally and
   * stale entries are garbage-collected — nothing resets this by hand.
   *
   * The inner key is a string rather than the column object, deliberately: it
   * folds in whether the column carries a `cellClass`/`cellStyle` closure, so
   * adding or removing one invalidates even when the column object is reused.
   * Keying by column identity instead would be marginally cheaper and strictly
   * worse — a `columns` computed that rebuilds its objects each evaluation would
   * defeat the cache entirely rather than merely widen it.
   */
  const cellMetadataCache = new WeakMap<object, Map<string, CellMetadata>>();

  const getCellMetadata = (
    row: TData,
    column: Column<TData>,
    colIndex: number,
    rowIndex: number,
  ): CellMetadata => {
    let rowCache = cellMetadataCache.get(row);
    if (!rowCache) {
      rowCache = new Map();
      cellMetadataCache.set(row, rowCache);
    }

    const cacheKey = `${column.key}-${!!column.cellClass}-${!!column.cellStyle}`;
    const cached = rowCache.get(cacheKey);
    if (cached) return cached;

    const formatted = column.format
      ? formatCellValue(row[column.key], column, row)
      : row[column.key];

    let formattedValue: unknown = formatted;
    let cssClass: string | undefined;

    if (
      formatted
      && typeof formatted === "object"
      && !Array.isArray(formatted)
      && "text" in formatted
    ) {
      formattedValue = (formatted as FormattedCell).text;
      cssClass = (formatted as FormattedCell).class;
    }

    if (column.cellClass) {
      const customClass = column.cellClass({ value: row[column.key], row, rowIndex });
      if (customClass) {
        cssClass = cssClass ? `${cssClass} ${customClass}` : customClass;
      }
    }

    const customStyle = column.cellStyle
      ? column.cellStyle({ value: row[column.key], row, rowIndex })
      : undefined;

    // An interactive cell holds a control the reader can point at, and a native
    // tooltip over one obscures whatever it does.
    const titleText = !column.interactive ? String(formattedValue) : undefined;

    const depth = (row.depth as number) || 0;
    const indentStyle = colIndex === 0 && depth
      ? { paddingLeft: `${depth * 24 + 16}px` }
      : null;

    const isExpandableRow = colIndex === 0 && toValue(isExpandable)
      ? isRowExpandable(row as unknown as ExpandableRow)
      : false;

    const metadata: CellMetadata = {
      formattedValue,
      cssClass,
      titleText,
      indentStyle,
      customStyle,
      isExpandable: isExpandableRow,
    };

    rowCache.set(cacheKey, metadata);

    return metadata;
  };

  return { getCellMetadata };
};
