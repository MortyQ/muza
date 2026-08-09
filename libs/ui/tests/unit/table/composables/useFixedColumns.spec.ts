import { ref } from "vue";

import { describe, expect, it } from "vitest";

import { useFixedColumns } from "../../../../src/components/table/composables/useFixedColumns";
import type { Column } from "../../../../src/components/table/types";
import { withScope } from "../../../setup/scope";
import { makeColumns, makeFixedColumns } from "../../../setup/table";

/**
 * Sticky offsets are cumulative: the second pinned column must sit exactly as
 * far in as the first one is wide, and a resize has to move it. Get the sum
 * wrong and columns overlap — a defect that renders fine in a screenshot of a
 * table whose first column happens to be the default width.
 */

const DEFAULT_WIDTH = 150;

function setup(columns: Column[], widths?: Map<string, number>) {
  const cols = ref(columns);
  const columnWidths = widths ? ref(widths) : undefined;
  const { result } = withScope(() => useFixedColumns(cols, columnWidths));
  return { ...result, cols, columnWidths };
}

const keysOf = (cols: Column[]) => cols.map(c => c.key);

describe("useFixedColumns", () => {
  describe("partitioning", () => {
    it("puts everything in `normal` when nothing is pinned", () => {
      const { leftFixedColumns, rightFixedColumns, normalColumns } = setup(makeColumns());

      expect(leftFixedColumns.value).toEqual([]);
      expect(rightFixedColumns.value).toEqual([]);
      expect(keysOf(normalColumns.value)).toHaveLength(5);
    });

    it("splits the three groups", () => {
      const { leftFixedColumns, rightFixedColumns, normalColumns } = setup(makeFixedColumns());

      expect(keysOf(leftFixedColumns.value)).toEqual(["id", "name"]);
      expect(keysOf(rightFixedColumns.value)).toEqual(["updatedAt"]);
      expect(keysOf(normalColumns.value)).toEqual(["status", "revenue"]);
    });

    it("preserves declaration order inside each group", () => {
      const cols = makeColumns({ status: { fixed: "left" }, id: { fixed: "left" } });
      expect(keysOf(setup(cols).leftFixedColumns.value)).toEqual(["id", "status"]);
    });

    it("reacts to a column becoming pinned", () => {
      const { leftFixedColumns, cols } = setup(makeColumns());
      cols.value = makeColumns({ id: { fixed: "left" } });
      expect(keysOf(leftFixedColumns.value)).toEqual(["id"]);
    });
  });

  describe("isFixed", () => {
    it.each([
      ["left", { key: "a", label: "A", fixed: "left" } as Column, true],
      ["right", { key: "a", label: "A", fixed: "right" } as Column, true],
      ["unset", { key: "a", label: "A" } as Column, false],
    ])("%s → %s", (_name, column, expected) => {
      expect(setup([]).isFixed(column)).toBe(expected);
    });
  });

  describe("left offsets", () => {
    it("puts the first pinned column flush against the edge", () => {
      const { getFixedStyles, cols } = setup(makeFixedColumns());
      expect(getFixedStyles(cols.value[0])).toEqual({ left: "0px" });
    });

    it("offsets the second by the first one's declared width", () => {
      // id is 60px wide.
      const { getFixedStyles, cols } = setup(makeFixedColumns());
      expect(getFixedStyles(cols.value[1])).toEqual({ left: "60px" });
    });

    it("uses the default width for a column that declares none", () => {
      const cols = makeColumns({
        name: { fixed: "left" }, // no width
        status: { fixed: "left" },
      });
      const { getFixedStyles, cols: reactive } = setup(cols);
      expect(getFixedStyles(reactive.value[2])).toEqual({ left: `${DEFAULT_WIDTH}px` });
    });

    it("uses the default width for a non-px width", () => {
      const cols = makeColumns({
        id: { fixed: "left", width: "flex" },
        name: { fixed: "left" },
      });
      const { getFixedStyles, cols: reactive } = setup(cols);
      expect(getFixedStyles(reactive.value[1])).toEqual({ left: `${DEFAULT_WIDTH}px` });
    });

    it("skips unpinned columns when accumulating", () => {
      // status sits between the two pinned columns and must not shift `name`.
      const cols = makeColumns({ id: { fixed: "left" }, revenue: { fixed: "left" } });
      const { getFixedStyles, cols: reactive } = setup(cols);
      expect(getFixedStyles(reactive.value[3])).toEqual({ left: "60px" });
    });

    it("returns an empty style object for an unpinned column", () => {
      const { getFixedStyles, cols } = setup(makeFixedColumns());
      expect(getFixedStyles(cols.value[2])).toEqual({});
    });
  });

  describe("right offsets", () => {
    it("puts the last pinned column flush against the right edge", () => {
      const { getFixedStyles, cols } = setup(makeFixedColumns());
      expect(getFixedStyles(cols.value[4])).toEqual({ right: "0px" });
    });

    it("accumulates from the right inward", () => {
      const cols = makeColumns({
        revenue: { fixed: "right" }, // 120px
        updatedAt: { fixed: "right" }, // 140px, rightmost
      });
      const { getFixedStyles, cols: reactive } = setup(cols);

      expect(getFixedStyles(reactive.value[4])).toEqual({ right: "0px" });
      expect(getFixedStyles(reactive.value[3])).toEqual({ right: "140px" });
    });
  });

  describe("resized widths", () => {
    it("prefers a resized width over the declared one", () => {
      const { getFixedStyles, cols } = setup(makeFixedColumns(), new Map([["id", 200]]));
      expect(getFixedStyles(cols.value[1])).toEqual({ left: "200px" });
    });

    it("falls back to the declared width for a column that was not resized", () => {
      const { getFixedStyles, cols } = setup(makeFixedColumns(), new Map([["name", 400]]));
      expect(getFixedStyles(cols.value[1])).toEqual({ left: "60px" });
    });

    it("recomputes when the width map is replaced", () => {
      const { getFixedStyles, cols, columnWidths } = setup(makeFixedColumns(), new Map());

      expect(getFixedStyles(cols.value[1])).toEqual({ left: "60px" });
      columnWidths!.value = new Map([["id", 90]]);
      expect(getFixedStyles(cols.value[1])).toEqual({ left: "90px" });
    });

    it("applies to right-pinned columns too", () => {
      const cols = makeColumns({
        revenue: { fixed: "right" },
        updatedAt: { fixed: "right" },
      });
      const { getFixedStyles, cols: reactive } = setup(cols, new Map([["updatedAt", 300]]));
      expect(getFixedStyles(reactive.value[3])).toEqual({ right: "300px" });
    });
  });

  describe("z-index", () => {
    it("is 1 for an unpinned column", () => {
      const { getZIndex, cols } = setup(makeFixedColumns());
      expect(getZIndex("status", cols.value[2])).toBe(1);
    });

    it("gives the leftmost pinned column the highest value", () => {
      const { getZIndex, cols } = setup(makeFixedColumns());
      expect(getZIndex("id", cols.value[0])).toBeGreaterThan(getZIndex("name", cols.value[1]));
    });

    it("lifts every pinned column above the unpinned ones", () => {
      const { getZIndex, cols } = setup(makeFixedColumns());
      for (const [key, index] of [["id", 0], ["name", 1], ["updatedAt", 4]] as const) {
        expect(getZIndex(key, cols.value[index])).toBeGreaterThan(50);
      }
    });

    it("gives the innermost right-pinned column the highest value — known gap", () => {
      // The source comment on this branch says "Rightmost columns higher", but
      // the count it uses is of right-pinned columns *after* the current one,
      // so the rightmost scores lowest and the ordering is the mirror image of
      // the left side rather than its reflection. Pinned as-is: the two never
      // overlap (offsets are cumulative and disjoint), so today this only
      // affects which edge shadow paints on top. Invert this assertion when the
      // ordering is fixed.
      const cols = makeColumns({
        revenue: { fixed: "right" },
        updatedAt: { fixed: "right" },
      });
      const { getZIndex, cols: reactive } = setup(cols);

      expect(getZIndex("revenue", reactive.value[3])).toBe(52);
      expect(getZIndex("updatedAt", reactive.value[4])).toBe(51);
    });
  });

  describe("shadow edges", () => {
    it("marks the last left-pinned column", () => {
      const { isLastLeftFixed } = setup(makeFixedColumns());
      expect(isLastLeftFixed("name")).toBe(true);
      expect(isLastLeftFixed("id")).toBe(false);
    });

    it("marks the first right-pinned column", () => {
      const cols = makeColumns({
        revenue: { fixed: "right" },
        updatedAt: { fixed: "right" },
      });
      const { isFirstRightFixed } = setup(cols);
      expect(isFirstRightFixed("revenue")).toBe(true);
      expect(isFirstRightFixed("updatedAt")).toBe(false);
    });

    it("marks a lone pinned column on both counts", () => {
      const cols = makeColumns({ id: { fixed: "left" }, updatedAt: { fixed: "right" } });
      const { isLastLeftFixed, isFirstRightFixed } = setup(cols);
      expect(isLastLeftFixed("id")).toBe(true);
      expect(isFirstRightFixed("updatedAt")).toBe(true);
    });

    it("marks nothing when nothing is pinned", () => {
      const { isLastLeftFixed, isFirstRightFixed } = setup(makeColumns());
      expect(isLastLeftFixed("id")).toBe(false);
      expect(isFirstRightFixed("id")).toBe(false);
    });

    it("does not mark an unpinned column that happens to be last", () => {
      const { isLastLeftFixed } = setup(makeFixedColumns());
      expect(isLastLeftFixed("revenue")).toBe(false);
    });

    it("moves the marker when a column is pinned after it", () => {
      const { isLastLeftFixed, cols } = setup(makeFixedColumns());
      expect(isLastLeftFixed("name")).toBe(true);

      cols.value = makeColumns({
        id: { fixed: "left" },
        name: { fixed: "left" },
        status: { fixed: "left" },
      });
      expect(isLastLeftFixed("name")).toBe(false);
      expect(isLastLeftFixed("status")).toBe(true);
    });
  });

  describe("without a width map", () => {
    it("still computes offsets from declared widths", () => {
      const { getFixedStyles, cols } = setup(makeFixedColumns());
      expect(getFixedStyles(cols.value[1])).toEqual({ left: "60px" });
    });
  });
});
