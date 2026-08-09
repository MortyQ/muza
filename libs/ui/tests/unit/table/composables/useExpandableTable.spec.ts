import { nextTick, ref } from "vue";

import { describe, expect, it } from "vitest";

import { useExpandableTable } from "../../../../src/components/table/composables/useExpandableTable";
import type { ExpandableRow } from "../../../../src/components/table/types";
import { withScope } from "../../../setup/scope";
import { makeTreeRows } from "../../../setup/table";

/**
 * The flatten is what the virtualizer consumes, so its ordering *is* the row
 * order on screen. The fixture tree is deliberately lopsided — one branch three
 * levels deep, two siblings flat — because a breadth-first bug produces the
 * same set of rows in a different order, and a same-length assertion would miss
 * it entirely.
 */

function setup(rows: ExpandableRow[] = makeTreeRows()) {
  const data = ref<ExpandableRow[]>(rows);
  const { result, scope } = withScope(() => useExpandableTable(data));
  return { ...result, data, scope };
}

const names = (rows: { name?: string }[]) => rows.map(r => r.name);

describe("useExpandableTable", () => {
  describe("flattening", () => {
    it("starts with only the root rows", () => {
      const { flattenedData } = setup();
      expect(names(flattenedData.value)).toEqual(["Alpha", "Bravo", "Charlie"]);
    });

    it("marks every root row at depth 0 with no parent", () => {
      const { flattenedData } = setup();
      for (const row of flattenedData.value) {
        expect(row.depth).toBe(0);
        expect(row.parentId).toBeUndefined();
      }
    });

    it("flags rows that have children", () => {
      const { flattenedData } = setup();
      expect(flattenedData.value.map(r => r.hasChildren)).toEqual([true, false, false]);
    });

    it("reports collapsed rows as not expanded", () => {
      const { flattenedData } = setup();
      expect(flattenedData.value.every(r => !r.isExpanded)).toBe(true);
    });

    it("inserts children directly after their parent when expanded", () => {
      const { flattenedData, toggleRow } = setup();
      toggleRow(1);
      expect(names(flattenedData.value))
        .toEqual(["Alpha", "Alpha / One", "Alpha / Two", "Bravo", "Charlie"]);
    });

    it("goes depth-first, not breadth-first", () => {
      const { flattenedData, toggleRow } = setup();
      toggleRow(1);
      toggleRow(11);
      expect(names(flattenedData.value)).toEqual([
        "Alpha",
        "Alpha / One",
        "Alpha / One / Deep",
        "Alpha / Two",
        "Bravo",
        "Charlie",
      ]);
    });

    it("increments depth per level", () => {
      const { flattenedData, toggleRow } = setup();
      toggleRow(1);
      toggleRow(11);
      expect(flattenedData.value.map(r => r.depth)).toEqual([0, 1, 2, 1, 0, 0]);
    });

    it("stamps each child with its parent id", () => {
      const { flattenedData, toggleRow } = setup();
      toggleRow(1);
      toggleRow(11);

      const byName = Object.fromEntries(flattenedData.value.map(r => [r.name, r.parentId]));
      expect(byName["Alpha / One"]).toBe(1);
      expect(byName["Alpha / One / Deep"]).toBe(11);
      expect(byName["Bravo"]).toBeUndefined();
    });

    it("does not surface a grandchild while its parent is collapsed", () => {
      const { flattenedData, toggleRow } = setup();
      toggleRow(11); // expanded, but 11 is not visible yet
      expect(names(flattenedData.value)).toEqual(["Alpha", "Bravo", "Charlie"]);
    });

    it("keeps the grandchild's expanded state for when the parent opens", () => {
      const { flattenedData, toggleRow } = setup();
      toggleRow(11);
      toggleRow(1);
      expect(names(flattenedData.value)).toContain("Alpha / One / Deep");
    });

    it("copies row fields onto the flattened row", () => {
      const { flattenedData } = setup();
      expect(flattenedData.value[0]).toMatchObject({ id: 1, name: "Alpha", status: "active" });
    });

    it("returns an empty list for empty data", () => {
      expect(setup([]).flattenedData.value).toEqual([]);
    });

    it("recomputes when the source data is replaced", async () => {
      const { flattenedData, data } = setup();
      data.value = [{ id: 9, name: "Nine" }];
      await nextTick();
      expect(names(flattenedData.value)).toEqual(["Nine"]);
    });

    it("treats an empty children array as a leaf", () => {
      const { flattenedData } = setup([{ id: 1, name: "Alpha", children: [] }]);
      expect(flattenedData.value[0].hasChildren).toBe(false);
    });

    it("treats expandable + expandedContent as having children", () => {
      const { flattenedData } = setup([
        { id: 1, name: "Alpha", expandable: true, expandedContent: "detail" },
      ]);
      expect(flattenedData.value[0].hasChildren).toBe(true);
    });

    it("does not flag expandable alone as having children", () => {
      // `hasChildren` drives the chevron; `isExpandable` drives the click
      // handler. They disagree here on purpose and the difference is load-bearing.
      const { flattenedData, isExpandable } = setup([{ id: 1, name: "Alpha", expandable: true }]);
      expect(flattenedData.value[0].hasChildren).toBe(false);
      expect(isExpandable(flattenedData.value[0])).toBe(true);
    });
  });

  describe("toggleRow", () => {
    it("expands a collapsed row", () => {
      const { expandedRows, toggleRow } = setup();
      toggleRow(1);
      expect(expandedRows.value.has(1)).toBe(true);
    });

    it("collapses an expanded row", () => {
      const { expandedRows, toggleRow } = setup();
      toggleRow(1);
      toggleRow(1);
      expect(expandedRows.value.has(1)).toBe(false);
    });

    it("replaces the Set rather than mutating it, so computeds re-run", () => {
      const { expandedRows, toggleRow } = setup();
      const before = expandedRows.value;
      toggleRow(1);
      expect(expandedRows.value).not.toBe(before);
    });

    it("collapsing a parent hides descendants but keeps their own state", () => {
      const { flattenedData, expandedRows, toggleRow } = setup();
      toggleRow(1);
      toggleRow(11);
      toggleRow(1);

      expect(names(flattenedData.value)).toEqual(["Alpha", "Bravo", "Charlie"]);
      expect(expandedRows.value.has(11)).toBe(true);
    });

    it("accepts a string id", () => {
      const { flattenedData, toggleRow } = setup([
        { id: "a", name: "A", children: [{ id: "a1", name: "A1" }] },
      ]);
      toggleRow("a");
      expect(names(flattenedData.value)).toEqual(["A", "A1"]);
    });
  });

  describe("expandAll", () => {
    it("opens every level at once", () => {
      const { flattenedData, expandAll } = setup();
      expandAll();
      expect(names(flattenedData.value)).toEqual([
        "Alpha",
        "Alpha / One",
        "Alpha / One / Deep",
        "Alpha / Two",
        "Bravo",
        "Charlie",
      ]);
    });

    it("collects only rows that can expand", () => {
      const { expandedRows, expandAll } = setup();
      expandAll();
      expect([...expandedRows.value].sort()).toEqual([1, 11]);
    });

    it("includes rows marked expandable without children", () => {
      const { expandedRows, expandAll } = setup([
        { id: 1, name: "A", expandable: true },
        { id: 2, name: "B" },
      ]);
      expandAll();
      expect([...expandedRows.value]).toEqual([1]);
    });

    it("replaces any previous state rather than adding to it", () => {
      const { expandedRows, toggleRow, expandAll } = setup();
      toggleRow(999); // an id that is not in the tree
      expandAll();
      expect(expandedRows.value.has(999)).toBe(false);
    });

    it("is a no-op on a flat list", () => {
      const { expandedRows, expandAll } = setup([{ id: 1, name: "A" }]);
      expandAll();
      expect(expandedRows.value.size).toBe(0);
    });
  });

  describe("collapseAll", () => {
    it("closes everything", () => {
      const { flattenedData, expandAll, collapseAll } = setup();
      expandAll();
      collapseAll();
      expect(names(flattenedData.value)).toEqual(["Alpha", "Bravo", "Charlie"]);
    });

    it("hands back a fresh Set", () => {
      const { expandedRows, expandAll, collapseAll } = setup();
      expandAll();
      const before = expandedRows.value;
      collapseAll();
      expect(expandedRows.value).not.toBe(before);
      expect(expandedRows.value.size).toBe(0);
    });

    it("is safe to call when nothing is open", () => {
      const { expandedRows, collapseAll } = setup();
      collapseAll();
      expect(expandedRows.value.size).toBe(0);
    });
  });

  describe("isExpandable", () => {
    it.each([
      ["children present", { id: 1, children: [{ id: 2 }] }, true],
      ["children empty", { id: 1, children: [] }, false],
      ["expandable flag", { id: 1, expandable: true }, true],
      ["neither", { id: 1 }, false],
    ] as [string, ExpandableRow, boolean][])("%s → %s", (_name, row, expected) => {
      expect(setup().isExpandable(row)).toBe(expected);
    });
  });
});
