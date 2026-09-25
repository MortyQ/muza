import { ref } from "vue";

import { describe, expect, it, vi } from "vitest";

import { useTableCellMetadata } from "../../../../src/components/table/composables/useTableCellMetadata";
import type { Column, ExpandableRow } from "../../../../src/components/table/types/index";
import { withScope } from "../../../setup/scope";

/**
 * The one hot path in the table: this runs `rows × columns` times per frame, and
 * before it was a single function VTable's template called five helpers per cell,
 * each of which re-ran the formatter.
 */

interface Row extends Record<string, unknown> {
  id: string
  revenue: number
  name: string
  depth?: number
}

const row = (over: Partial<Row> = {}): Row =>
  ({ id: "1", name: "Widget", revenue: 1250, ...over });

function setup(options: {
  isExpandable?: boolean
  isRowExpandable?: (row: ExpandableRow) => boolean
} = {}) {
  const isExpandable = ref(options.isExpandable ?? false);
  const { result, scope } = withScope(() => useTableCellMetadata<Row>({
    isExpandable,
    isRowExpandable: options.isRowExpandable ?? (() => true),
  }));
  return { ...result, isExpandable, scope };
}

const plain = (key: keyof Row): Column<Row> => ({ key, label: key });

describe("useTableCellMetadata", () => {
  describe("the value", () => {
    it("passes an unformatted column's value through untouched", () => {
      const { getCellMetadata } = setup();
      expect(getCellMetadata(row(), plain("revenue"), 1, 0).formattedValue).toBe(1250);
    });

    it("runs the formatter when the column declares one", () => {
      const { getCellMetadata } = setup();
      const column: Column<Row> = { key: "revenue", label: "Revenue", format: { currency: "USD" } };
      expect(String(getCellMetadata(row(), column, 1, 0).formattedValue)).toContain("1,250");
    });

    it("unwraps a `{ text, class }` formatter result into value and class", () => {
      const { getCellMetadata } = setup();
      const column: Column<Row> = {
        key: "revenue",
        label: "Revenue",
        format: { formatter: () => ({ text: "up", class: "is-up" }) },
      };
      const meta = getCellMetadata(row(), column, 1, 0);
      expect(meta.formattedValue).toBe("up");
      expect(meta.cssClass).toBe("is-up");
    });
  });

  describe("the class", () => {
    it("is undefined when the column contributes none", () => {
      const { getCellMetadata } = setup();
      expect(getCellMetadata(row(), plain("name"), 0, 0).cssClass).toBeUndefined();
    });

    it("comes from cellClass when there is no formatter class", () => {
      const { getCellMetadata } = setup();
      const column: Column<Row> = { key: "revenue", label: "R", cellClass: () => "is-high" };
      expect(getCellMetadata(row(), column, 1, 0).cssClass).toBe("is-high");
    });

    it("appends cellClass to a formatter class rather than replacing it", () => {
      const { getCellMetadata } = setup();
      const column: Column<Row> = {
        key: "revenue",
        label: "R",
        format: { formatter: () => ({ text: "up", class: "is-up" }) },
        cellClass: () => "is-high",
      };
      expect(getCellMetadata(row(), column, 1, 0).cssClass).toBe("is-up is-high");
    });

    it("ignores a cellClass that returns nothing", () => {
      const { getCellMetadata } = setup();
      const column: Column<Row> = { key: "revenue", label: "R", cellClass: () => undefined };
      expect(getCellMetadata(row(), column, 1, 0).cssClass).toBeUndefined();
    });

    it("hands cellClass the cell's value, row and row index", () => {
      const cellClass = vi.fn(() => "x");
      const { getCellMetadata } = setup();
      const data = row();
      getCellMetadata(data, { key: "revenue", label: "R", cellClass }, 1, 7);
      expect(cellClass).toHaveBeenCalledWith({ value: 1250, row: data, rowIndex: 7 });
    });
  });

  describe("the style", () => {
    it("is undefined without a cellStyle", () => {
      const { getCellMetadata } = setup();
      expect(getCellMetadata(row(), plain("name"), 0, 0).customStyle).toBeUndefined();
    });

    it("is whatever cellStyle returns", () => {
      const { getCellMetadata } = setup();
      const column: Column<Row> = { key: "revenue", label: "R", cellStyle: () => ({ color: "red" }) };
      expect(getCellMetadata(row(), column, 1, 0).customStyle).toEqual({ color: "red" });
    });
  });

  describe("the title", () => {
    it("is the stringified formatted value", () => {
      const { getCellMetadata } = setup();
      expect(getCellMetadata(row(), plain("revenue"), 1, 0).titleText).toBe("1250");
    });

    it("is withheld from an interactive column", () => {
      // The cell holds a control the reader points at, and a native tooltip over
      // one obscures what it does.
      const { getCellMetadata } = setup();
      const column: Column<Row> = { key: "name", label: "Name", interactive: true };
      expect(getCellMetadata(row(), column, 0, 0).titleText).toBeUndefined();
    });
  });

  describe("the indent", () => {
    it("is null on a root row", () => {
      const { getCellMetadata } = setup();
      expect(getCellMetadata(row({ depth: 0 }), plain("name"), 0, 0).indentStyle).toBeNull();
    });

    it("is null on a column that is not the first, whatever the depth", () => {
      const { getCellMetadata } = setup();
      expect(getCellMetadata(row({ depth: 3 }), plain("revenue"), 1, 0).indentStyle).toBeNull();
    });

    it("hands the depth to CSS, which owns the step", () => {
      // The step is the expand button plus its gap (`--v-table-indent`), so the
      // geometry is asserted in the browser project, not here.
      const { getCellMetadata } = setup();
      expect(getCellMetadata(row({ depth: 1 }), plain("name"), 0, 0).indentStyle)
        .toEqual({ "--v-table-depth": "1" });
      expect(getCellMetadata(row({ depth: 3 }), plain("name"), 0, 0).indentStyle)
        .toEqual({ "--v-table-depth": "3" });
    });
  });

  describe("expandability", () => {
    it("is false while the table has no expandable rows at all", () => {
      const { getCellMetadata } = setup({ isExpandable: false, isRowExpandable: () => true });
      expect(getCellMetadata(row(), plain("name"), 0, 0).isExpandable).toBe(false);
    });

    it("is asked of the row only on the first column", () => {
      const isRowExpandable = vi.fn(() => true);
      const { getCellMetadata } = setup({ isExpandable: true, isRowExpandable });
      expect(getCellMetadata(row(), plain("revenue"), 1, 0).isExpandable).toBe(false);
      expect(isRowExpandable).not.toHaveBeenCalled();

      expect(getCellMetadata(row(), plain("name"), 0, 0).isExpandable).toBe(true);
      expect(isRowExpandable).toHaveBeenCalledTimes(1);
    });

    it("reads the flag through toValue, so a ref stays live", () => {
      const { getCellMetadata, isExpandable } = setup({ isExpandable: false });
      expect(getCellMetadata(row(), plain("name"), 0, 0).isExpandable).toBe(false);

      isExpandable.value = true;
      // A different row object, because the first answer is cached against the
      // old one — which is the cache behaving, not a bug.
      expect(getCellMetadata(row({ id: "2" }), plain("name"), 0, 0).isExpandable).toBe(true);
    });
  });

  describe("caching", () => {
    it("runs a column's formatter once per row", () => {
      const formatter = vi.fn(() => "x");
      const { getCellMetadata } = setup();
      const column: Column<Row> = { key: "revenue", label: "R", format: { formatter } };
      const data = row();

      getCellMetadata(data, column, 1, 0);
      getCellMetadata(data, column, 1, 0);
      getCellMetadata(data, column, 1, 0);

      expect(formatter).toHaveBeenCalledTimes(1);
    });

    it("returns the identical object, so a style binding does not churn", () => {
      const { getCellMetadata } = setup();
      const data = row();
      const column = plain("revenue");
      expect(getCellMetadata(data, column, 1, 0)).toBe(getCellMetadata(data, column, 1, 0));
    });

    it("keeps separate entries per column within a row", () => {
      const { getCellMetadata } = setup();
      const data = row();
      expect(getCellMetadata(data, plain("name"), 0, 0).formattedValue).toBe("Widget");
      expect(getCellMetadata(data, plain("revenue"), 1, 0).formattedValue).toBe(1250);
    });

    it("invalidates on a new row object, which is how VTable refreshes data", () => {
      const formatter = vi.fn((value: unknown) => String(value));
      const { getCellMetadata } = setup();
      const column: Column<Row> = { key: "revenue", label: "R", format: { formatter } };

      expect(getCellMetadata(row({ revenue: 1 }), column, 1, 0).formattedValue).toBe("1");
      expect(getCellMetadata(row({ revenue: 2 }), column, 1, 0).formattedValue).toBe("2");
      expect(formatter).toHaveBeenCalledTimes(2);
    });

    it("invalidates when a column gains or loses a cellClass", () => {
      // The cache key folds in the presence of the closures, so a column object
      // reused with a different shape cannot serve a stale entry.
      const { getCellMetadata } = setup();
      const data = row();
      const bare: Column<Row> = { key: "revenue", label: "R" };
      expect(getCellMetadata(data, bare, 1, 0).cssClass).toBeUndefined();

      const withClass: Column<Row> = { key: "revenue", label: "R", cellClass: () => "is-high" };
      expect(getCellMetadata(data, withClass, 1, 0).cssClass).toBe("is-high");
    });

    it("does not leak one row's answer into another", () => {
      const { getCellMetadata } = setup();
      const column = plain("name");
      expect(getCellMetadata(row({ name: "A" }), column, 0, 0).formattedValue).toBe("A");
      expect(getCellMetadata(row({ name: "B" }), column, 0, 0).formattedValue).toBe("B");
    });
  });
});
