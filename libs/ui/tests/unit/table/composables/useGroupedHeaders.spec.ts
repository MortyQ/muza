import { nextTick, ref } from "vue";

import { describe, expect, it } from "vitest";

import { useGroupedHeaders } from "../../../../src/components/table/composables/useGroupedHeaders";
import type { Column } from "../../../../src/components/table/types";
import { withScope } from "../../../setup/scope";
import { makeColumns, makeGroupedColumns } from "../../../setup/table";

/**
 * Header geometry: which cell sits on which row, how far it spans, and how wide
 * a group is once its leaves are resized. Everything the header renderer needs
 * comes from here, so an off-by-one in `rowspan` shows up as a visibly broken
 * header and as nothing at all in the type system.
 */

function setup(columns: Column[], widths = new Map<string, number>()) {
  const cols = ref(columns);
  const columnWidths = ref(widths);
  const { result } = withScope(() => useGroupedHeaders(cols, columnWidths));
  return { ...result, cols, columnWidths };
}

const keysOf = (cells: { key: string }[]) => cells.map(c => c.key);

describe("useGroupedHeaders", () => {
  describe("hasGroups", () => {
    it("is false for a flat column list", () => {
      expect(setup(makeColumns()).hasGroups.value).toBe(false);
    });

    it("is true when any column has children", () => {
      expect(setup(makeGroupedColumns()).hasGroups.value).toBe(true);
    });

    it("is false when a children array is present but empty", () => {
      expect(setup([{ key: "a", label: "A", children: [] }]).hasGroups.value).toBe(false);
    });

    it("reacts to columns being replaced", async () => {
      const { hasGroups, cols } = setup(makeColumns());
      cols.value = makeGroupedColumns();
      await nextTick();
      expect(hasGroups.value).toBe(true);
    });
  });

  describe("flatColumns", () => {
    it("is the column list itself when there are no groups", () => {
      expect(keysOf(setup(makeColumns()).flatColumns.value))
        .toEqual(["id", "name", "status", "revenue", "updatedAt"]);
    });

    it("replaces a group with its leaves, in place", () => {
      expect(keysOf(setup(makeGroupedColumns()).flatColumns.value))
        .toEqual(["id", "name", "revenue", "ratio"]);
    });

    it("never includes the group itself", () => {
      expect(keysOf(setup(makeGroupedColumns()).flatColumns.value)).not.toContain("performance");
    });

    it("descends through more than one level", () => {
      const deep: Column[] = [
        {
          key: "g1",
          label: "G1",
          children: [
            { key: "g2", label: "G2", children: [{ key: "leaf", label: "Leaf" }] },
          ],
        },
      ];
      expect(keysOf(setup(deep).flatColumns.value)).toEqual(["leaf"]);
    });

    it("is empty for no columns", () => {
      expect(setup([]).flatColumns.value).toEqual([]);
    });
  });

  describe("getColspan", () => {
    it("is 1 for a leaf", () => {
      const { getColspan } = setup(makeGroupedColumns());
      expect(getColspan({ key: "x", label: "X" })).toBe(1);
    });

    it("counts the leaves under a group", () => {
      const cols = makeGroupedColumns();
      expect(setup(cols).getColspan(cols[2])).toBe(2);
    });

    it("counts leaves recursively, not direct children", () => {
      const nested: Column = {
        key: "g",
        label: "G",
        children: [
          { key: "a", label: "A" },
          { key: "sub", label: "Sub", children: [{ key: "b", label: "B" }, { key: "c", label: "C" }] },
        ],
      };
      expect(setup([nested]).getColspan(nested)).toBe(3);
    });

    it("is 1 for a group with an empty children array", () => {
      const empty: Column = { key: "g", label: "G", children: [] };
      expect(setup([empty]).getColspan(empty)).toBe(1);
    });
  });

  describe("headerLevels — flat columns", () => {
    it("produces exactly one level", () => {
      expect(setup(makeColumns()).headerLevels.value).toHaveLength(1);
    });

    it("puts every column on it", () => {
      expect(keysOf(setup(makeColumns()).headerLevels.value[0]))
        .toEqual(["id", "name", "status", "revenue", "updatedAt"]);
    });

    it("gives each cell colspan and rowspan of 1", () => {
      for (const cell of setup(makeColumns()).headerLevels.value[0]) {
        expect(cell.colspan).toBe(1);
        expect(cell.rowspan).toBe(1);
        expect(cell.isGroup).toBe(false);
        expect(cell.level).toBe(0);
      }
    });

    it("carries the source column on the cell, not a copy", () => {
      // Compared against `cols.value[0]` rather than the array passed in: `ref`
      // deep-reactifies, so the cell holds the proxy. Identity against the
      // proxy still proves no copy was made along the way.
      const { headerLevels, cols } = setup(makeColumns());
      expect(headerLevels.value[0][0].column).toBe(cols.value[0]);
    });
  });

  describe("headerLevels — grouped columns", () => {
    const levels = () => setup(makeGroupedColumns()).headerLevels.value;

    it("produces one level per depth", () => {
      expect(levels()).toHaveLength(2);
    });

    it("puts flat columns and group labels on the top level", () => {
      expect(keysOf(levels()[0])).toEqual(["id", "name", "performance"]);
    });

    it("puts the group's leaves on the second level", () => {
      expect(keysOf(levels()[1])).toEqual(["revenue", "ratio"]);
    });

    it("does not repeat a flat column on the second level", () => {
      expect(keysOf(levels()[1])).not.toContain("id");
    });

    it("spans a root-level leaf down through every header row", () => {
      const idCell = levels()[0].find(c => c.key === "id");
      expect(idCell?.rowspan).toBe(2);
      expect(idCell?.colspan).toBe(1);
    });

    it("gives the group a colspan of its leaves and a rowspan of 1", () => {
      const group = levels()[0].find(c => c.key === "performance");
      expect(group).toMatchObject({ isGroup: true, colspan: 2, rowspan: 1, level: 0 });
    });

    it("marks the deeper leaves as level 1 with rowspan 1", () => {
      for (const cell of levels()[1]) {
        expect(cell).toMatchObject({ level: 1, rowspan: 1, colspan: 1, isGroup: false });
      }
    });

    it("handles three levels", () => {
      const deep: Column[] = [
        { key: "flat", label: "Flat" },
        {
          key: "g1",
          label: "G1",
          children: [
            { key: "g2", label: "G2", children: [{ key: "leaf", label: "Leaf" }] },
          ],
        },
      ];
      const built = setup(deep).headerLevels.value;

      expect(built).toHaveLength(3);
      expect(keysOf(built[0])).toEqual(["flat", "g1"]);
      expect(keysOf(built[1])).toEqual(["g2"]);
      expect(keysOf(built[2])).toEqual(["leaf"]);
      expect(built[0][0].rowspan).toBe(3);
    });
  });

  describe("getGroupWidth", () => {
    it("returns a leaf's own px width", () => {
      const cols = makeGroupedColumns();
      expect(setup(cols).getGroupWidth(cols[0])).toBe(60);
    });

    it("falls back to the default width when the column has none", () => {
      const cols = makeGroupedColumns();
      expect(setup(cols).getGroupWidth(cols[1])).toBe(150);
    });

    it("falls back to the default for a non-px width", () => {
      const flexed: Column = { key: "a", label: "A", width: "flex" };
      expect(setup([flexed]).getGroupWidth(flexed)).toBe(150);
    });

    it("sums the leaves of a group", () => {
      const cols = makeGroupedColumns();
      expect(setup(cols).getGroupWidth(cols[2])).toBe(200); // 120 + 80
    });

    it("prefers a resized width over the declared one", () => {
      const cols = makeGroupedColumns();
      const widths = new Map([["revenue", 300]]);
      expect(setup(cols, widths).getGroupWidth(cols[2])).toBe(380); // 300 + 80
    });

    it("recomputes after a resize is recorded", () => {
      const cols = makeGroupedColumns();
      const { getGroupWidth, columnWidths } = setup(cols);

      expect(getGroupWidth(cols[2])).toBe(200);
      columnWidths.value = new Map([["ratio", 500]]);
      expect(getGroupWidth(cols[2])).toBe(620);
    });

    it("sums recursively through nested groups", () => {
      const nested: Column = {
        key: "g",
        label: "G",
        children: [
          { key: "a", label: "A", width: "50px" },
          { key: "sub", label: "Sub", children: [{ key: "b", label: "B", width: "70px" }] },
        ],
      };
      expect(setup([nested]).getGroupWidth(nested)).toBe(120);
    });
  });

  describe("isGroupFixed", () => {
    it("returns a leaf's own fixed side", () => {
      expect(setup([]).isGroupFixed({ key: "a", label: "A", fixed: "left" })).toBe("left");
    });

    it("returns null for an unfixed leaf", () => {
      expect(setup([]).isGroupFixed({ key: "a", label: "A" })).toBeNull();
    });

    it("returns the side when every leaf agrees", () => {
      const group: Column = {
        key: "g",
        label: "G",
        children: [
          { key: "a", label: "A", fixed: "left" },
          { key: "b", label: "B", fixed: "left" },
        ],
      };
      expect(setup([group]).isGroupFixed(group)).toBe("left");
    });

    it("returns null when the leaves disagree", () => {
      const group: Column = {
        key: "g",
        label: "G",
        children: [
          { key: "a", label: "A", fixed: "left" },
          { key: "b", label: "B", fixed: "right" },
        ],
      };
      expect(setup([group]).isGroupFixed(group)).toBeNull();
    });

    it("returns null when one leaf is unfixed", () => {
      const group: Column = {
        key: "g",
        label: "G",
        children: [
          { key: "a", label: "A", fixed: "left" },
          { key: "b", label: "B" },
        ],
      };
      expect(setup([group]).isGroupFixed(group)).toBeNull();
    });

    it("looks through nested groups at the leaves", () => {
      const group: Column = {
        key: "g",
        label: "G",
        children: [
          { key: "sub", label: "Sub", children: [{ key: "a", label: "A", fixed: "right" }] },
          { key: "b", label: "B", fixed: "right" },
        ],
      };
      expect(setup([group]).isGroupFixed(group)).toBe("right");
    });
  });
});
