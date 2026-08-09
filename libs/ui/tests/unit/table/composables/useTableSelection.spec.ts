import { nextTick, ref } from "vue";

import { describe, expect, it, vi } from "vitest";

import { useExpandableTable } from "../../../../src/components/table/composables/useExpandableTable";
import { useTableSelection } from "../../../../src/components/table/composables/useTableSelection";
import type {
  ExpandableRow,
  FlattenedRow,
  MultiSelectConfig,
} from "../../../../src/components/table/types";
import { withScope } from "../../../setup/scope";
import { makeRows, makeTreeRows } from "../../../setup/table";

/**
 * Selection is where the tree structure bites hardest. Independent mode is a
 * Set of ids; dependent mode has to decide what a parent's checkbox means when
 * only some of its children are ticked, and whether "all children" counts the
 * collapsed ones. Both answers are configurable, which is why every combination
 * below is exercised rather than the happy path.
 *
 * `flattenedData` is produced by the real `useExpandableTable` rather than hand-
 * written: the two composables are used together in VTable, and a hand-built
 * flatten would let a mismatch between them pass unnoticed.
 */

function setup(
  config: MultiSelectConfig | undefined = { enabled: true },
  rows: ExpandableRow[] = makeTreeRows(),
  expand: (string | number)[] = [],
) {
  const onSelectionChange = vi.fn();
  const data = ref(rows);
  const cfg = ref(config);
  const selectedRows = ref<ExpandableRow[]>([]);

  const { result } = withScope(() => {
    const tree = useExpandableTable(data);
    expand.forEach(id => tree.toggleRow(id));

    const selection = useTableSelection({
      config: cfg,
      flattenedData: tree.flattenedData as unknown as typeof tree.flattenedData,
      selectedRows,
      onSelectionChange,
    });

    return { tree, selection };
  });

  const row = (id: string | number): FlattenedRow =>
    result.tree.flattenedData.value.find(r => r.id === id)!;

  return { ...result.selection, tree: result.tree, row, cfg, selectedRows, onSelectionChange };
}

const dependent = (extra: Partial<MultiSelectConfig> = {}): MultiSelectConfig => ({
  enabled: true,
  selectionMode: "dependent",
  selectChildren: true,
  selectParent: true,
  selectOnlyVisible: false,
  ...extra,
});

const ids = (set: Set<string | number>) => [...set].sort((a, b) => Number(a) - Number(b));

describe("useTableSelection", () => {
  describe("enablement", () => {
    it("is off when there is no config", () => {
      // Built inline rather than through `setup`: passing `undefined` to a
      // parameter with a default gets the default, which is the opposite case.
      const { result } = withScope(() => useTableSelection({
        config: ref(undefined),
        flattenedData: ref([]),
        selectedRows: ref([]),
        onSelectionChange: vi.fn(),
      }));
      expect(result.isEnabled.value).toBe(false);
    });

    it("is off when enabled is false", () => {
      expect(setup({ enabled: false }).isEnabled.value).toBe(false);
    });

    it("is on when enabled is true", () => {
      expect(setup().isEnabled.value).toBe(true);
    });

    it("reports independent mode by default", () => {
      expect(setup().isDependentMode.value).toBe(false);
    });

    it("reports dependent mode when configured", () => {
      expect(setup(dependent()).isDependentMode.value).toBe(true);
    });

    it("reacts to the config changing", () => {
      const { isEnabled, cfg } = setup({ enabled: false });
      cfg.value = { enabled: true };
      expect(isEnabled.value).toBe(true);
    });
  });

  describe("selectedRows prop", () => {
    it("seeds the internal id set", async () => {
      const { selectedIds, selectedRows } = setup();
      selectedRows.value = [{ id: 2 }, { id: 3 }];
      await nextTick();
      expect(ids(selectedIds.value)).toEqual([2, 3]);
    });

    it("replaces rather than merges", async () => {
      const { selectedIds, selectedRows } = setup();
      selectedRows.value = [{ id: 2 }];
      await nextTick();
      selectedRows.value = [{ id: 3 }];
      await nextTick();
      expect(ids(selectedIds.value)).toEqual([3]);
    });
  });

  describe("isRowSelectable", () => {
    it("allows everything when no predicate is given", () => {
      expect(setup().isRowSelectable({ id: 1 })).toBe(true);
    });

    it("defers to the predicate", () => {
      const { isRowSelectable } = setup({
        enabled: true,
        isRowSelectable: row => row.id !== 2,
      });
      expect(isRowSelectable({ id: 1 })).toBe(true);
      expect(isRowSelectable({ id: 2 })).toBe(false);
    });
  });

  describe("toggleRow — independent mode", () => {
    it("selects a row", () => {
      const { toggleRow, row, isRowSelected } = setup();
      toggleRow(row(2));
      expect(isRowSelected(2)).toBe(true);
    });

    it("deselects on a second toggle", () => {
      const { toggleRow, row, isRowSelected } = setup();
      toggleRow(row(2));
      toggleRow(row(2));
      expect(isRowSelected(2)).toBe(false);
    });

    it("leaves children alone when a parent is selected", () => {
      const { toggleRow, row, selectedIds } = setup({ enabled: true }, makeTreeRows(), [1]);
      toggleRow(row(1));
      expect(ids(selectedIds.value)).toEqual([1]);
    });

    it("does nothing when selection is disabled", () => {
      const { toggleRow, row, selectedIds, onSelectionChange } = setup({ enabled: false });
      toggleRow(row(2));
      expect(selectedIds.value.size).toBe(0);
      expect(onSelectionChange).not.toHaveBeenCalled();
    });

    it("does nothing for a row the predicate rejects", () => {
      const { toggleRow, row, selectedIds } = setup({
        enabled: true,
        isRowSelectable: r => r.id !== 2,
      });
      toggleRow(row(2));
      expect(selectedIds.value.size).toBe(0);
    });

    it("replaces the Set so computeds re-run", () => {
      const { toggleRow, row, selectedIds } = setup();
      const before = selectedIds.value;
      toggleRow(row(2));
      expect(selectedIds.value).not.toBe(before);
    });

    it("reports the selected rows, stripped of flatten metadata", () => {
      const { toggleRow, row, onSelectionChange } = setup();
      toggleRow(row(2));

      const [selected] = onSelectionChange.mock.calls[0];
      expect(selected).toHaveLength(1);
      expect(selected[0].id).toBe(2);
      for (const key of ["depth", "parentId", "hasChildren", "isExpanded"]) {
        expect(selected[0]).not.toHaveProperty(key);
      }
    });

    it("reports rows that are no longer visible", () => {
      // A collapsed child stays selected, and the payload still contains it:
      // the lookup walks the `children` of the rows it does have, so a row that
      // scrolled out of the flatten is still reachable. Without that, collapsing
      // a branch would silently drop part of the caller's selection.
      const { toggleRow, row, tree, onSelectionChange } = setup(
        { enabled: true }, makeTreeRows(), [1],
      );
      toggleRow(row(11));
      onSelectionChange.mockClear();

      tree.collapseAll();
      toggleRow(row(2));

      expect(onSelectionChange.mock.calls[0][0].map((r: ExpandableRow) => r.id).sort())
        .toEqual([11, 2]);
    });
  });

  describe("toggleRow — dependent mode", () => {
    it("selects every descendant with the parent", () => {
      const { toggleRow, row, selectedIds } = setup(dependent());
      toggleRow(row(1));
      expect(ids(selectedIds.value)).toEqual([1, 11, 12, 111]);
    });

    it("deselects every descendant with the parent", () => {
      const { toggleRow, row, selectedIds } = setup(dependent());
      toggleRow(row(1));
      toggleRow(row(1));
      expect(selectedIds.value.size).toBe(0);
    });

    it("does not cascade when selectChildren is off", () => {
      const { toggleRow, row, selectedIds } = setup(dependent({ selectChildren: false }));
      toggleRow(row(1));
      expect(ids(selectedIds.value)).toEqual([1]);
    });

    it("treats an absent selectChildren as off, despite the documented default", () => {
      // MultiSelectConfig documents `@default true`, but the guard is a plain
      // truthiness check on the raw field — undefined behaves like false. Pinned
      // as-is; the fix is a `?? true` in the composable, not here.
      const { toggleRow, row, selectedIds } = setup({
        enabled: true,
        selectionMode: "dependent",
        selectOnlyVisible: false,
      });
      toggleRow(row(1));
      expect(ids(selectedIds.value)).toEqual([1]);
    });

    it("promotes the parent once every sibling is selected", () => {
      const { toggleRow, row, selectedIds } = setup(
        dependent({ selectChildren: false }), makeTreeRows(), [1],
      );
      toggleRow(row(11));
      expect(selectedIds.value.has(1)).toBe(false);

      toggleRow(row(12));
      expect(selectedIds.value.has(1)).toBe(true);
    });

    it("demotes the parent when a sibling is unselected", () => {
      const { toggleRow, row, selectedIds } = setup(
        dependent({ selectChildren: false }), makeTreeRows(), [1],
      );
      toggleRow(row(11));
      toggleRow(row(12));
      toggleRow(row(12));
      expect(selectedIds.value.has(1)).toBe(false);
    });

    it("does not promote when selectParent is off", () => {
      const { toggleRow, row, selectedIds } = setup(
        dependent({ selectChildren: false, selectParent: false }), makeTreeRows(), [1],
      );
      toggleRow(row(11));
      toggleRow(row(12));
      expect(selectedIds.value.has(1)).toBe(false);
    });

    it("only counts visible children when selectOnlyVisible is on", () => {
      // Row 11's own child (111) is hidden while 11 is collapsed, so selecting
      // the branch must not reach it.
      const { toggleRow, row, selectedIds } = setup(
        dependent({ selectOnlyVisible: true }), makeTreeRows(), [1],
      );
      toggleRow(row(1));
      expect(ids(selectedIds.value)).toEqual([1, 11, 12]);
    });

    it("reaches a deep child once its branch is expanded", () => {
      const { toggleRow, row, selectedIds } = setup(
        dependent({ selectOnlyVisible: true }), makeTreeRows(), [1, 11],
      );
      toggleRow(row(1));
      expect(ids(selectedIds.value)).toEqual([1, 11, 12, 111]);
    });

    it("still reaches direct children of a collapsed row — known quirk", () => {
      // `getVisibleChildrenIds` starts its walk with `parentExpanded = true`
      // hardcoded, so the first level below the clicked row always counts as
      // visible even when that row is collapsed. Only the second level down
      // respects the expanded set. Pinned as-is: changing it changes what a
      // click on a collapsed parent selects, which is a product decision.
      const { toggleRow, row, selectedIds } = setup(dependent({ selectOnlyVisible: true }));
      toggleRow(row(1));
      expect(ids(selectedIds.value)).toEqual([1, 11, 12]);
    });
  });

  describe("getParentCheckboxState", () => {
    it("mirrors selection for a leaf", () => {
      const { toggleRow, row, getParentCheckboxState } = setup();
      expect(getParentCheckboxState(row(2))).toBe("unchecked");

      toggleRow(row(2));
      expect(getParentCheckboxState(row(2))).toBe("checked");
    });

    it("is unchecked when neither the parent nor any child is selected", () => {
      expect(setup(dependent()).getParentCheckboxState(setup(dependent()).row(1)))
        .toBe("unchecked");
    });

    it("is checked when the parent and every descendant are selected", () => {
      const { toggleRow, row, getParentCheckboxState } = setup(dependent());
      toggleRow(row(1));
      expect(getParentCheckboxState(row(1))).toBe("checked");
    });

    it("is indeterminate when only some descendants are selected", () => {
      const { toggleRow, row, getParentCheckboxState } = setup(
        dependent({ selectChildren: false, selectParent: false }), makeTreeRows(), [1],
      );
      toggleRow(row(11));
      expect(getParentCheckboxState(row(1))).toBe("indeterminate");
    });

    it("is indeterminate when every child is selected but the parent is not", () => {
      const { toggleRow, row, getParentCheckboxState } = setup(
        dependent({ selectChildren: false, selectParent: false, selectOnlyVisible: true }),
        makeTreeRows(),
        [1],
      );
      toggleRow(row(11));
      toggleRow(row(12));
      expect(getParentCheckboxState(row(1))).toBe("indeterminate");
    });

    it("counts only visible children when configured to", () => {
      const { toggleRow, row, getParentCheckboxState } = setup(
        dependent({ selectOnlyVisible: true }), makeTreeRows(), [1],
      );
      toggleRow(row(1));
      expect(getParentCheckboxState(row(1))).toBe("checked");
    });
  });

  describe("getHeaderCheckboxState", () => {
    it("is unchecked with nothing selected", () => {
      expect(setup().getHeaderCheckboxState()).toBe("unchecked");
    });

    it("is indeterminate with a partial selection", () => {
      const { toggleRow, row, getHeaderCheckboxState } = setup();
      toggleRow(row(2));
      expect(getHeaderCheckboxState()).toBe("indeterminate");
    });

    it("is checked once every visible row is selected", () => {
      const { toggleRow, row, getHeaderCheckboxState } = setup();
      toggleRow(row(1));
      toggleRow(row(2));
      toggleRow(row(3));
      expect(getHeaderCheckboxState()).toBe("checked");
    });

    it("counts only visible rows, so expanding can undo `checked`", () => {
      const { toggleRow, row, tree, getHeaderCheckboxState } = setup();
      [1, 2, 3].forEach(id => toggleRow(row(id)));
      expect(getHeaderCheckboxState()).toBe("checked");

      tree.toggleRow(1);
      expect(getHeaderCheckboxState()).toBe("indeterminate");
    });

    it("ignores rows the predicate rejects", () => {
      const { toggleRow, row, getHeaderCheckboxState } = setup({
        enabled: true,
        isRowSelectable: r => r.id !== 3,
      });
      toggleRow(row(1));
      toggleRow(row(2));
      expect(getHeaderCheckboxState()).toBe("checked");
    });

    it("is unchecked when no row is selectable at all", () => {
      const { getHeaderCheckboxState } = setup({ enabled: true, isRowSelectable: () => false });
      expect(getHeaderCheckboxState()).toBe("unchecked");
    });

    it("is unchecked for an empty table", () => {
      expect(setup({ enabled: true }, []).getHeaderCheckboxState()).toBe("unchecked");
    });
  });

  describe("toggleAllRows", () => {
    it("selects every visible row", () => {
      const { toggleAllRows, selectedIds } = setup();
      toggleAllRows();
      expect(ids(selectedIds.value)).toEqual([1, 2, 3]);
    });

    it("deselects when everything is already selected", () => {
      const { toggleAllRows, selectedIds } = setup();
      toggleAllRows();
      toggleAllRows();
      expect(selectedIds.value.size).toBe(0);
    });

    it("completes a partial selection rather than clearing it", () => {
      const { toggleRow, row, toggleAllRows, selectedIds } = setup();
      toggleRow(row(2));
      toggleAllRows();
      expect(ids(selectedIds.value)).toEqual([1, 2, 3]);
    });

    it("reaches expanded children", () => {
      const { toggleAllRows, selectedIds } = setup({ enabled: true }, makeTreeRows(), [1]);
      toggleAllRows();
      expect(ids(selectedIds.value)).toEqual([1, 2, 3, 11, 12]);
    });

    it("leaves collapsed rows selected when deselecting the visible ones", () => {
      const { toggleAllRows, tree, selectedIds } = setup({ enabled: true }, makeTreeRows(), [1]);
      toggleAllRows();
      tree.collapseAll();
      toggleAllRows();

      expect(ids(selectedIds.value)).toEqual([11, 12]);
    });

    it("skips rows the predicate rejects", () => {
      const { toggleAllRows, selectedIds } = setup({
        enabled: true,
        isRowSelectable: r => r.id !== 2,
      });
      toggleAllRows();
      expect(ids(selectedIds.value)).toEqual([1, 3]);
    });

    it("does nothing when selection is disabled", () => {
      const { toggleAllRows, selectedIds } = setup({ enabled: false });
      toggleAllRows();
      expect(selectedIds.value.size).toBe(0);
    });

    it("reports the change", () => {
      const { toggleAllRows, onSelectionChange } = setup();
      toggleAllRows();
      expect(onSelectionChange).toHaveBeenCalledTimes(1);
      expect(onSelectionChange.mock.calls[0][0]).toHaveLength(3);
    });
  });

  describe("clearSelection", () => {
    it("empties the set and reports it", () => {
      const { toggleAllRows, clearSelection, selectedIds, onSelectionChange } = setup();
      toggleAllRows();
      onSelectionChange.mockClear();

      clearSelection();
      expect(selectedIds.value.size).toBe(0);
      expect(onSelectionChange).toHaveBeenCalledWith([]);
    });

    it("reports even when nothing was selected", () => {
      const { clearSelection, onSelectionChange } = setup();
      clearSelection();
      expect(onSelectionChange).toHaveBeenCalledWith([]);
    });

    it("ignores the enabled flag", () => {
      const { toggleAllRows, cfg, clearSelection, selectedIds } = setup();
      toggleAllRows();
      cfg.value = { enabled: false };

      clearSelection();
      expect(selectedIds.value.size).toBe(0);
    });
  });

  describe("selectRows", () => {
    it("sets the selection from a list of ids", () => {
      const { selectRows, selectedIds } = setup();
      selectRows([1, 3]);
      expect(ids(selectedIds.value)).toEqual([1, 3]);
    });

    it("replaces rather than adds", () => {
      const { selectRows, selectedIds } = setup();
      selectRows([1]);
      selectRows([3]);
      expect(ids(selectedIds.value)).toEqual([3]);
    });

    it("reports only ids that resolve to a visible row", () => {
      const { selectRows, onSelectionChange } = setup();
      selectRows([1, 999]);

      expect(onSelectionChange.mock.calls[0][0].map((r: ExpandableRow) => r.id)).toEqual([1]);
    });

    it("keeps an unresolvable id in the internal set", () => {
      // The set is the source of truth for the checkboxes; the payload is
      // filtered to what actually exists. The two intentionally differ.
      const { selectRows, isRowSelected } = setup();
      selectRows([999]);
      expect(isRowSelected(999)).toBe(true);
    });

    it("resolves a nested id through the tree", () => {
      const { selectRows, onSelectionChange } = setup({ enabled: true }, makeTreeRows(), [1]);
      selectRows([111]);
      expect(onSelectionChange.mock.calls[0][0].map((r: ExpandableRow) => r.id)).toEqual([111]);
    });
  });

  it("handles a flat table with no children at all", () => {
    const { toggleAllRows, selectedIds, getHeaderCheckboxState } = setup(
      { enabled: true }, makeRows(3),
    );
    toggleAllRows();
    expect(ids(selectedIds.value)).toEqual([1, 2, 3]);
    expect(getHeaderCheckboxState()).toBe("checked");
  });
});
