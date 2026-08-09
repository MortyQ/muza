import { nextTick } from "vue";

import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import VButton from "../../../../src/components/base/VButton.vue";
import VInput from "../../../../src/components/inputs/VInput.vue";
import TableColumnPicker from "../../../../src/components/table/components/TableColumnPicker.vue";
import type { Column } from "../../../../src/components/table/types";
import type { ColumnPickerGroup } from "../../../../src/components/table/types/toolbar";
import tableStorage from "../../../../src/components/table/utils/storage";
import { makeColumns } from "../../../setup/table";

/**
 * The two-panel picker: everything a table *could* show on the left, the chosen
 * set in order on the right. Unlike TableColumnSetup, the right panel is a
 * draft list rather than a visibility flag, so the same key can be searched for
 * on one side and dragged on the other, and a pinned entry has to resist both
 * removal and being dragged out of the first two slots.
 *
 * Storage is real (localStorage) — the restore path runs in `onMounted` and the
 * persisted shape here includes `labels`, which TableColumnSetup's does not.
 */

const stubs = { Icon: true };

const GROUPS: ColumnPickerGroup[] = [
  {
    key: "core",
    label: "Core",
    items: [
      { key: "id", label: "ID", icon: "number" },
      { key: "name", label: "Name", icon: "text" },
      { key: "status", label: "Status", icon: "select" },
    ],
  },
  {
    key: "metrics",
    label: "Metrics",
    items: [
      { key: "revenue", label: "Revenue", icon: "number", sortable: true },
      { key: "updatedAt", label: "Updated", icon: "date" },
      { key: "ratio", label: "Ratio", icon: "decimal" },
    ],
  },
];

beforeEach(() => {
  tableStorage.setStorageType("localStorage");
  localStorage.clear();
  sessionStorage.clear();
});

async function picker(props: Record<string, unknown> = {}) {
  const w = mount(TableColumnPicker, {
    props: { groups: GROUPS, columns: makeColumns(), ...props },
    global: { stubs },
  });
  await nextTick();
  await nextTick();
  return w;
}

const selected = (w: Awaited<ReturnType<typeof picker>>) =>
  w.findAll(".cp-selected-item-label").map(l => l.text());
const selectedRows = (w: Awaited<ReturnType<typeof picker>>) =>
  w.findAll(".cp-selected-item");
const available = (w: Awaited<ReturnType<typeof picker>>) =>
  w.findAll(".cp-available-item-label").map(l => l.text());

const groupHeader = (w: Awaited<ReturnType<typeof picker>>, index: number) =>
  w.findAll(".cp-group-header")[index];

const apply = (w: Awaited<ReturnType<typeof picker>>) =>
  w.findAllComponents(VButton).at(-1)!;

const emittedColumns = (w: Awaited<ReturnType<typeof picker>>): Column[] =>
  (w.emitted("update:visible-columns")!.at(-1)![0] as Column[]);

/**
 * The two panels do not share a search control: the left one is a bare `<input>`
 * inside the toolbar, the right one is the library's VInput.
 */
const searchLeft = async (w: Awaited<ReturnType<typeof picker>>, value: string) => {
  await w.find(".cp-search input").setValue(value);
  await nextTick();
};

const searchRight = async (w: Awaited<ReturnType<typeof picker>>, value: string) => {
  await w.findComponent(VInput).vm.$emit("update:modelValue", value);
  await nextTick();
};

async function dragRow(w: Awaited<ReturnType<typeof picker>>, from: number, to: number) {
  const dataTransfer = { effectAllowed: "", dropEffect: "", setData: vi.fn() };
  const rows = selectedRows(w);

  await rows[from].trigger("dragstart", { dataTransfer });
  await rows[to].trigger("dragover", { dataTransfer });
  await rows[to].trigger("drop", { dataTransfer });
}

describe("TableColumnPicker", () => {
  describe("the initial draft", () => {
    it("seeds the right panel from the current columns, in order", async () => {
      expect(selected(await picker()))
        .toEqual(["ID", "Name", "Status", "Revenue", "Updated"]);
    });

    it("carries a column's pin state in", async () => {
      const w = await picker({ columns: makeColumns({ id: { fixed: "left" } }) });
      expect(selectedRows(w)[0].find(".cp-selected-item-pin--active").exists()).toBe(true);
    });

    it("seeds an empty draft from no columns", async () => {
      expect(selected(await picker({ columns: [] }))).toEqual([]);
    });
  });

  describe("the available panel", () => {
    it("collapses every group to start", async () => {
      expect(available(await picker())).toEqual([]);
    });

    it("expands a group when its header is clicked", async () => {
      const w = await picker();
      await groupHeader(w, 0).trigger("click");

      expect(available(w)).toEqual(["ID", "Name", "Status"]);
    });

    it("collapses it again", async () => {
      const w = await picker();
      await groupHeader(w, 0).trigger("click");
      await groupHeader(w, 0).trigger("click");

      expect(available(w)).toEqual([]);
    });

    it("sorts alphabetically by default", async () => {
      const w = await picker();
      await groupHeader(w, 1).trigger("click");

      expect(available(w)).toEqual(["Ratio", "Revenue", "Updated"]);
    });

    it("groups by type when asked", async () => {
      const w = await picker();
      await w.findAll(".cp-sort-btn")[0].trigger("click");
      await groupHeader(w, 1).trigger("click");

      expect(w.findAll(".cp-type-group-label").length).toBeGreaterThan(0);
    });

    it("shows how many of a group are selected", async () => {
      const w = await picker();
      expect(w.findAll(".cp-group-badge")[0].text()).toContain("3");
    });

    it("adds an item on click", async () => {
      const w = await picker({ columns: [] });
      await groupHeader(w, 0).trigger("click");
      await w.findAll(".cp-available-item")[0].trigger("click");

      expect(selected(w)).toEqual(["ID"]);
    });

    it("removes it again on a second click", async () => {
      const w = await picker({ columns: [] });
      await groupHeader(w, 0).trigger("click");
      await w.findAll(".cp-available-item")[0].trigger("click");
      await w.findAll(".cp-available-item")[0].trigger("click");

      expect(selected(w)).toEqual([]);
    });
  });

  describe("search", () => {
    it("filters the available list and opens the matching groups", async () => {
      const w = await picker();
      await searchLeft(w, "rev");

      expect(available(w)).toEqual(["Revenue"]);
    });

    it("is case-insensitive", async () => {
      const w = await picker();
      await searchLeft(w, "REVENUE");

      expect(available(w)).toEqual(["Revenue"]);
    });

    it("drops a group with no matches", async () => {
      const w = await picker();
      await searchLeft(w, "rev");

      expect(w.findAll(".cp-group-header")).toHaveLength(1);
    });

    it("collapses everything again when cleared", async () => {
      const w = await picker();
      await searchLeft(w, "rev");
      await searchLeft(w, "");

      expect(available(w)).toEqual([]);
    });

    it("filters the selected list independently", async () => {
      const w = await picker();
      await searchRight(w, "name");

      expect(selected(w)).toEqual(["Name"]);
    });

    it("refuses a drag while the selected list is filtered", async () => {
      // Positions in a filtered view do not map onto positions in the draft, so
      // a drop would reorder the wrong rows.
      const w = await picker();
      await searchRight(w, "e");

      const before = selected(w);
      await dragRow(w, 0, 1);
      expect(selected(w)).toEqual(before);
    });
  });

  describe("group select-all", () => {
    it("adds every item in the group", async () => {
      const w = await picker({ columns: [] });
      await w.findAll(".cp-group-select-btn")[0].trigger("click");

      expect(selected(w)).toEqual(["ID", "Name", "Status"]);
    });

    it("clears the group when it is already complete", async () => {
      const w = await picker({ columns: [] });
      await w.findAll(".cp-group-select-btn")[0].trigger("click");
      await w.findAll(".cp-group-select-btn")[0].trigger("click");

      expect(selected(w)).toEqual([]);
    });

    it("leaves a pinned column behind when clearing", async () => {
      const w = await picker({ columns: makeColumns({ id: { fixed: "left" } }) });
      await w.findAll(".cp-group-select-btn")[0].trigger("click");

      expect(selected(w)).toContain("ID");
      expect(selected(w)).not.toContain("Name");
    });

    it("leaves other groups alone", async () => {
      const w = await picker({ columns: [] });
      await w.findAll(".cp-group-select-btn")[0].trigger("click");

      expect(selected(w)).not.toContain("Revenue");
    });
  });

  describe("removing", () => {
    it("drops the item from the draft", async () => {
      const w = await picker();
      await selectedRows(w)[0].find(".cp-selected-item-remove").trigger("click");

      expect(selected(w)).toEqual(["Name", "Status", "Revenue", "Updated"]);
    });

    it("offers no remove button on a pinned item", async () => {
      // The guard is in `removeItem` too, but the button is simply not rendered
      // — a pinned column is unremovable until it is unpinned.
      const w = await picker({ columns: makeColumns({ id: { fixed: "left" } }) });

      expect(selectedRows(w)[0].find(".cp-selected-item-remove").exists()).toBe(false);
      expect(selectedRows(w)[1].find(".cp-selected-item-remove").exists()).toBe(true);
    });
  });

  describe("pinning", () => {
    it("offers the pin only on the first two rows", async () => {
      expect((await picker()).findAll(".cp-selected-item-pin")).toHaveLength(2);
    });

    it("pins and unpins", async () => {
      const w = await picker();
      const pin = () => selectedRows(w)[0].find(".cp-selected-item-pin");

      await pin().trigger("click");
      expect(selectedRows(w)[0].find(".cp-selected-item-pin--active").exists()).toBe(true);

      await pin().trigger("click");
      expect(selectedRows(w)[0].find(".cp-selected-item-pin--active").exists()).toBe(false);
    });

    it("drops the pin when a reorder pushes the column past position two", async () => {
      const w = await picker();
      await selectedRows(w)[0].find(".cp-selected-item-pin").trigger("click");
      await dragRow(w, 0, 4);

      expect(w.find(".cp-selected-item-pin--active").exists()).toBe(false);
    });
  });

  describe("reorder", () => {
    it("moves a row to the drop position", async () => {
      const w = await picker();
      await dragRow(w, 0, 2);

      expect(selected(w)).toEqual(["Name", "Status", "ID", "Revenue", "Updated"]);
    });

    it("does nothing when dropped on itself", async () => {
      const w = await picker();
      await dragRow(w, 1, 1);

      expect(selected(w)).toEqual(["ID", "Name", "Status", "Revenue", "Updated"]);
    });

    it("clears the drag state on dragend", async () => {
      const w = await picker();
      const dataTransfer = { effectAllowed: "", dropEffect: "", setData: vi.fn() };
      await selectedRows(w)[0].trigger("dragstart", { dataTransfer });
      await selectedRows(w)[0].trigger("dragend");

      expect(w.find(".cp-selected-item--dragging").exists()).toBe(false);
    });
  });

  describe("apply", () => {
    it("emits the draft as columns, in order", async () => {
      const w = await picker();
      await dragRow(w, 0, 2);
      await apply(w).vm.$emit("click");

      expect(emittedColumns(w).map(c => c.key))
        .toEqual(["name", "status", "id", "revenue", "updatedAt"]);
    });

    it("keeps the existing column definition where there is one", async () => {
      const w = await picker();
      await apply(w).vm.$emit("click");

      expect(emittedColumns(w).find(c => c.key === "revenue"))
        .toMatchObject({ width: "120px", align: "right" });
    });

    it("builds a column from the picker item for a key the table did not have", async () => {
      const w = await picker({ columns: makeColumns() });
      await groupHeader(w, 1).trigger("click");
      const ratio = w.findAll(".cp-available-item")
        .find(el => el.text().includes("Ratio"))!;
      await ratio.trigger("click");
      await apply(w).vm.$emit("click");

      expect(emittedColumns(w).at(-1)).toMatchObject({ key: "ratio", label: "Ratio" });
    });

    it("carries sortable through from the picker item", async () => {
      const w = await picker({ columns: [] });
      await w.findAll(".cp-group-select-btn")[1].trigger("click");
      await apply(w).vm.$emit("click");

      expect(emittedColumns(w).find(c => c.key === "revenue")?.sortable).toBe(true);
    });

    it("carries the pin state onto the emitted column", async () => {
      const w = await picker();
      await selectedRows(w)[0].find(".cp-selected-item-pin").trigger("click");
      await apply(w).vm.$emit("click");

      expect(emittedColumns(w)[0].fixed).toBe("left");
    });

    it("closes", async () => {
      const w = await picker();
      await apply(w).vm.$emit("click");
      expect(w.emitted("close")).toHaveLength(1);
    });

    it("emits nothing before apply", async () => {
      const w = await picker();
      await selectedRows(w)[0].find(".cp-selected-item-remove").trigger("click");

      expect(w.emitted("update:visible-columns")).toBeUndefined();
    });
  });

  describe("cancel", () => {
    it("throws the draft away and closes", async () => {
      const w = await picker();
      await selectedRows(w)[0].find(".cp-selected-item-remove").trigger("click");
      await w.find(".column-picker-close-btn").trigger("click");
      await nextTick();

      expect(selected(w)).toEqual(["ID", "Name", "Status", "Revenue", "Updated"]);
      expect(w.emitted("close")).toHaveLength(1);
      expect(w.emitted("update:visible-columns")).toBeUndefined();
    });
  });

  describe("persistence", () => {
    it("writes order, visibility, pins and labels on apply", async () => {
      const w = await picker({ storageKey: "picker", storageType: "localStorage" });
      await selectedRows(w)[0].find(".cp-selected-item-pin").trigger("click");
      await apply(w).vm.$emit("click");
      await nextTick();

      const saved = JSON.parse(localStorage.getItem("picker")!);
      expect(saved.order).toEqual(["id", "name", "status", "revenue", "updatedAt"]);
      expect(saved.visible).toEqual(saved.order);
      expect(saved.fixed).toEqual({ id: "left" });
      expect(saved.labels.revenue).toBe("Revenue");
    });

    it("writes labels even with nothing pinned, unlike TableColumnSetup", async () => {
      const w = await picker({ storageKey: "picker", storageType: "localStorage" });
      await apply(w).vm.$emit("click");
      await nextTick();

      const saved = JSON.parse(localStorage.getItem("picker")!);
      expect(saved).not.toHaveProperty("fixed");
      expect(Object.keys(saved.labels)).toHaveLength(5);
    });

    it("restores the saved order on mount", async () => {
      localStorage.setItem("picker", JSON.stringify({
        visible: ["revenue", "id"],
        order: ["revenue", "id"],
      }));

      const w = await picker({ storageKey: "picker", storageType: "localStorage" });
      expect(selected(w)).toEqual(["Revenue", "ID"]);
    });

    it("keeps only keys the saved state marks visible", async () => {
      localStorage.setItem("picker", JSON.stringify({
        visible: ["id"],
        order: ["id", "name", "status"],
      }));

      const w = await picker({ storageKey: "picker", storageType: "localStorage" });
      expect(selected(w)).toEqual(["ID"]);
    });

    it("falls back to the saved label for a key the table no longer defines", async () => {
      localStorage.setItem("picker", JSON.stringify({
        visible: ["archived"],
        order: ["archived"],
        labels: { archived: "Archived At" },
      }));

      const w = await picker({ storageKey: "picker", storageType: "localStorage" });
      expect(selected(w)).toEqual(["Archived At"]);
    });

    it("falls back to the key itself when even the label is gone", async () => {
      localStorage.setItem("picker", JSON.stringify({ visible: ["ghost"], order: ["ghost"] }));

      const w = await picker({ storageKey: "picker", storageType: "localStorage" });
      expect(selected(w)).toEqual(["ghost"]);
    });

    it("survives a failed read", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(tableStorage, "getTableConfig").mockRejectedValueOnce(new Error("down"));

      const w = await picker({ storageKey: "picker", storageType: "localStorage" });

      expect(selected(w)).toHaveLength(5);
      expect(spy).toHaveBeenCalled();
      vi.restoreAllMocks();
    });

    it("survives a failed write", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const w = await picker({ storageKey: "picker", storageType: "localStorage" });
      vi.spyOn(tableStorage, "setTableConfig").mockRejectedValueOnce(new Error("full"));

      await apply(w).vm.$emit("click");
      // Three awaits deep: handleApply → saveToStorage → writeColumnState. A
      // single tick lands before the catch, and `close` has not been reached.
      await vi.waitFor(() => expect(w.emitted("close")).toBeTruthy());

      expect(w.emitted("close")).toHaveLength(1);
      expect(spy).toHaveBeenCalled();
      vi.restoreAllMocks();
    });
  });

  describe("reset", () => {
    it("restores the original column set, not the current one", async () => {
      // `columns` is what the table shows now; `originalColumns` is what it
      // shipped with. Reset means the latter.
      const w = await picker({
        columns: makeColumns().slice(0, 2),
        originalColumns: makeColumns(),
      });
      await w.find(".column-picker-text-btn").trigger("click");
      await nextTick();

      expect(emittedColumns(w).map(c => c.key))
        .toEqual(["id", "name", "status", "revenue", "updatedAt"]);
    });

    it("falls back to the current columns when there is no original set", async () => {
      const w = await picker({ columns: makeColumns().slice(0, 2) });
      await w.find(".column-picker-text-btn").trigger("click");
      await nextTick();

      expect(emittedColumns(w).map(c => c.key)).toEqual(["id", "name"]);
    });

    it("clears the stored state", async () => {
      localStorage.setItem("picker", JSON.stringify({ visible: ["id"], order: ["id"] }));

      const w = await picker({ storageKey: "picker", storageType: "localStorage" });
      await w.find(".column-picker-text-btn").trigger("click");
      await nextTick();

      expect(localStorage.getItem("picker")).toBeNull();
    });

    it("applies immediately and closes", async () => {
      const w = await picker();
      await w.find(".column-picker-text-btn").trigger("click");
      await nextTick();

      expect(w.emitted("update:visible-columns")).toHaveLength(1);
      expect(w.emitted("close")).toHaveLength(1);
    });

    it("survives a failed clear", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const w = await picker({ storageKey: "picker", storageType: "localStorage" });
      vi.spyOn(tableStorage, "deleteTableConfig").mockRejectedValueOnce(new Error("down"));

      await w.find(".column-picker-text-btn").trigger("click");
      await nextTick();

      expect(w.emitted("close")).toHaveLength(1);
      expect(spy).toHaveBeenCalled();
      vi.restoreAllMocks();
    });
  });

  describe("loading", () => {
    it("shows skeletons instead of the group list", async () => {
      const w = await picker({ loading: true });
      expect(w.findAll(".column-picker-skeleton").length).toBeGreaterThan(0);
      expect(w.findAll(".cp-group-header")).toHaveLength(0);
    });
  });
});
