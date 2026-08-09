import { nextTick } from "vue";

import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import VButton from "../../../../src/components/base/VButton.vue";
import TableColumnSetup from "../../../../src/components/table/components/TableColumnSetup.vue";
import type { Column } from "../../../../src/components/table/types";
import tableStorage from "../../../../src/components/table/utils/storage";
import { makeColumns, makeGroupedColumns } from "../../../setup/table";

/**
 * The column dialog is deliberately uncommitted: everything a user does stays
 * local until Apply, which is what makes "cancel by closing" work. Two things
 * therefore matter most here — that nothing escapes before Apply, and that the
 * pin constraint (only the first two positions) survives a reorder that pushes
 * a pinned column out of them.
 *
 * Storage is real, pointed at localStorage, because the restore path runs at
 * setup time and a mocked round-trip would not exercise the ordering the
 * columnState helpers exist to preserve.
 */

const stubs = { Icon: true };

beforeEach(() => {
  tableStorage.setStorageType("localStorage");
  localStorage.clear();
  sessionStorage.clear();
});

function setup(props: Record<string, unknown> = {}) {
  return mount(TableColumnSetup, {
    props: { columns: makeColumns(), ...props },
    global: { stubs },
  });
}

const rows = (w: ReturnType<typeof setup>) => w.findAll(".column-setup-item");
const labels = (w: ReturnType<typeof setup>) =>
  w.findAll(".column-setup-item-label").map(l => l.text());
const eye = (w: ReturnType<typeof setup>, index: number) =>
  rows(w)[index].find(".column-setup-item-eye");
const apply = (w: ReturnType<typeof setup>) => w.findAllComponents(VButton).at(-1)!;

const emittedColumns = (w: ReturnType<typeof setup>): Column[] =>
  (w.emitted("update:visible-columns")!.at(-1)![0] as Column[]);

/** A drag from `from` onto `to`, with the DataTransfer the handlers read. */
async function dragRow(w: ReturnType<typeof setup>, from: number, to: number) {
  const dataTransfer = { effectAllowed: "", dropEffect: "", setData: vi.fn() };

  await rows(w)[from].trigger("dragstart", { dataTransfer });
  await rows(w)[to].trigger("dragover", { dataTransfer, clientY: 0 });
  await rows(w)[to].trigger("drop", { dataTransfer });
}

describe("TableColumnSetup", () => {
  describe("the initial list", () => {
    it("lists every column", () => {
      expect(labels(setup())).toEqual(["ID", "Name", "Status", "Revenue", "Updated"]);
    });

    it("shows everything by default", () => {
      expect(setup().find(".column-setup-toggle-count").text()).toBe("5 / 5");
    });

    it("flattens a grouped header down to its leaves", () => {
      expect(labels(setup({ columns: makeGroupedColumns() })))
        .toEqual(["ID", "Name", "Revenue", "Ratio"]);
    });

    it("honours initialVisible", () => {
      expect(setup({ config: { initialVisible: ["id", "name"] } })
        .find(".column-setup-toggle-count").text()).toBe("2 / 5");
    });

    it("carries a column's own fixed state in", () => {
      const w = setup({ columns: makeColumns({ id: { fixed: "left" } }) });
      expect(rows(w)[0].find(".column-setup-item-fixed-btn--active").exists()).toBe(true);
    });

    it("renders an empty list for no columns", () => {
      expect(rows(setup({ columns: [] }))).toHaveLength(0);
    });
  });

  describe("visibility", () => {
    it("hides a column when its eye is clicked", async () => {
      const w = setup();
      await eye(w, 0).trigger("click");

      expect(w.find(".column-setup-toggle-count").text()).toBe("4 / 5");
      expect(rows(w)[0].find(".column-setup-item-label--hidden").exists()).toBe(true);
    });

    it("shows it again on a second click", async () => {
      const w = setup();
      await eye(w, 0).trigger("click");
      await eye(w, 0).trigger("click");

      expect(w.find(".column-setup-toggle-count").text()).toBe("5 / 5");
    });

    it("hides everything from the header toggle", async () => {
      const w = setup();
      await w.find(".column-setup-toggle-all").trigger("click");
      expect(w.find(".column-setup-toggle-count").text()).toBe("0 / 5");
    });

    it("shows everything again from the header toggle", async () => {
      const w = setup();
      await w.find(".column-setup-toggle-all").trigger("click");
      await w.find(".column-setup-toggle-all").trigger("click");

      expect(w.find(".column-setup-toggle-count").text()).toBe("5 / 5");
    });

    it("completes a partial selection rather than clearing it", async () => {
      const w = setup();
      await eye(w, 0).trigger("click");
      await w.find(".column-setup-toggle-all").trigger("click");

      expect(w.find(".column-setup-toggle-count").text()).toBe("5 / 5");
    });

    it("emits nothing before Apply", async () => {
      const w = setup();
      await eye(w, 0).trigger("click");
      await w.find(".column-setup-toggle-all").trigger("click");

      expect(w.emitted("update:visible-columns")).toBeUndefined();
    });
  });

  describe("apply", () => {
    it("emits the visible columns", async () => {
      const w = setup();
      await eye(w, 2).trigger("click");
      await apply(w).vm.$emit("click");

      expect(emittedColumns(w).map(c => c.key))
        .toEqual(["id", "name", "revenue", "updatedAt"]);
    });

    it("emits them in the list's order", async () => {
      const w = setup();
      await dragRow(w, 0, 2);
      await apply(w).vm.$emit("click");

      expect(emittedColumns(w).map(c => c.key))
        .toEqual(["name", "status", "id", "revenue", "updatedAt"]);
    });

    it("carries the pin state onto the emitted column", async () => {
      const w = setup();
      await rows(w)[0].find(".column-setup-item-fixed-btn").trigger("click");
      await apply(w).vm.$emit("click");

      expect(emittedColumns(w)[0].fixed).toBe("left");
    });

    it("closes the dialog", async () => {
      const w = setup();
      await apply(w).vm.$emit("click");
      expect(w.emitted("close")).toHaveLength(1);
    });

    it("emits an empty list when everything is hidden", async () => {
      const w = setup();
      await w.find(".column-setup-toggle-all").trigger("click");
      await apply(w).vm.$emit("click");

      expect(emittedColumns(w)).toEqual([]);
    });
  });

  describe("persistence", () => {
    it("writes nothing without a storage key", async () => {
      const w = setup();
      await eye(w, 0).trigger("click");
      await apply(w).vm.$emit("click");

      expect(localStorage.length).toBe(0);
    });

    it("writes visibility and order on Apply", async () => {
      const w = setup({ config: { key: "orders", type: "localStorage" } });
      await eye(w, 0).trigger("click");
      await apply(w).vm.$emit("click");

      expect(JSON.parse(localStorage.getItem("orders")!)).toEqual({
        visible: ["name", "status", "revenue", "updatedAt"],
        order: ["id", "name", "status", "revenue", "updatedAt"],
      });
    });

    it("omits the fixed map when nothing is pinned", async () => {
      const w = setup({ config: { key: "orders", type: "localStorage" } });
      await apply(w).vm.$emit("click");

      expect(JSON.parse(localStorage.getItem("orders")!)).not.toHaveProperty("fixed");
    });

    it("writes the fixed map when something is pinned", async () => {
      const w = setup({ config: { key: "orders", type: "localStorage" } });
      await rows(w)[0].find(".column-setup-item-fixed-btn").trigger("click");
      await apply(w).vm.$emit("click");

      expect(JSON.parse(localStorage.getItem("orders")!).fixed).toEqual({ id: "left" });
    });

    it("restores visibility and order on mount", async () => {
      localStorage.setItem("orders", JSON.stringify({
        visible: ["revenue"],
        order: ["revenue", "id", "name", "status", "updatedAt"],
      }));

      const w = setup({ config: { key: "orders", type: "localStorage" } });
      await nextTick();
      await nextTick();

      expect(labels(w)).toEqual(["Revenue", "ID", "Name", "Status", "Updated"]);
      expect(w.find(".column-setup-toggle-count").text()).toBe("1 / 5");
    });

    it("restores the pin state", async () => {
      localStorage.setItem("orders", JSON.stringify({
        visible: ["id", "name", "status", "revenue", "updatedAt"],
        order: ["id", "name", "status", "revenue", "updatedAt"],
        fixed: { id: "left" },
      }));

      const w = setup({ config: { key: "orders", type: "localStorage" } });
      await nextTick();
      await nextTick();

      expect(rows(w)[0].find(".column-setup-item-fixed-btn--active").exists()).toBe(true);
    });

    it("appends a column that is not in the saved order, visible", async () => {
      // A column added to the table since the state was written must not
      // silently disappear for everyone holding an old saved state.
      localStorage.setItem("orders", JSON.stringify({ visible: ["id"], order: ["id"] }));

      const w = setup({ config: { key: "orders", type: "localStorage" } });
      await nextTick();
      await nextTick();

      expect(labels(w)).toEqual(["ID", "Name", "Status", "Revenue", "Updated"]);
      expect(w.find(".column-setup-toggle-count").text()).toBe("5 / 5");
    });

    it("drops a saved key that no longer matches a column", async () => {
      localStorage.setItem("orders", JSON.stringify({
        visible: ["id", "gone"],
        order: ["gone", "id"],
      }));

      const w = setup({ config: { key: "orders", type: "localStorage" } });
      await nextTick();
      await nextTick();

      expect(labels(w)).not.toContain("gone");
    });

    it("survives a failed read", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(tableStorage, "getTableConfig").mockRejectedValueOnce(new Error("down"));

      const w = setup({ config: { key: "orders", type: "localStorage" } });
      await nextTick();
      await nextTick();

      expect(labels(w)).toHaveLength(5);
      expect(spy).toHaveBeenCalled();
      vi.restoreAllMocks();
    });

    it("survives a failed write", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(tableStorage, "setTableConfig").mockRejectedValueOnce(new Error("full"));

      const w = setup({ config: { key: "orders", type: "localStorage" } });
      await apply(w).vm.$emit("click");
      await nextTick();

      expect(w.emitted("close")).toHaveLength(1);
      expect(spy).toHaveBeenCalled();
      vi.restoreAllMocks();
    });

    it("uses whichever backend the config names", async () => {
      const w = setup({ config: { key: "orders", type: "sessionStorage" } });
      await apply(w).vm.$emit("click");

      expect(sessionStorage.getItem("orders")).not.toBeNull();
      expect(localStorage.getItem("orders")).toBeNull();
    });
  });

  describe("reorder", () => {
    it("moves a row to the drop position", async () => {
      const w = setup();
      await dragRow(w, 0, 2);
      expect(labels(w)).toEqual(["Name", "Status", "ID", "Revenue", "Updated"]);
    });

    it("moves a row backwards", async () => {
      const w = setup();
      await dragRow(w, 3, 0);
      expect(labels(w)).toEqual(["Revenue", "ID", "Name", "Status", "Updated"]);
    });

    it("does nothing when dropped on itself", async () => {
      const w = setup();
      await dragRow(w, 1, 1);
      expect(labels(w)).toEqual(["ID", "Name", "Status", "Revenue", "Updated"]);
    });

    it("marks the row being dragged over", async () => {
      const w = setup();
      const dataTransfer = { effectAllowed: "", dropEffect: "", setData: vi.fn() };
      await rows(w)[0].trigger("dragstart", { dataTransfer });
      await rows(w)[2].trigger("dragover", { dataTransfer, clientY: 0 });

      expect(rows(w)[2].classes()).toContain("column-setup-item--drag-over");
    });

    it("clears the marker on leave", async () => {
      const w = setup();
      const dataTransfer = { effectAllowed: "", dropEffect: "", setData: vi.fn() };
      await rows(w)[0].trigger("dragstart", { dataTransfer });
      await rows(w)[2].trigger("dragover", { dataTransfer, clientY: 0 });
      await rows(w)[2].trigger("dragleave");

      expect(rows(w)[2].classes()).not.toContain("column-setup-item--drag-over");
    });

    it("clears the drag state on dragend", async () => {
      const w = setup();
      const dataTransfer = { effectAllowed: "", dropEffect: "", setData: vi.fn() };
      await rows(w)[0].trigger("dragstart", { dataTransfer });
      await rows(w)[0].trigger("dragend");

      expect(w.find(".column-setup-item--dragging").exists()).toBe(false);
    });

    it("is refused when reordering is off", async () => {
      const w = setup({ config: { allowReorder: false } });
      await dragRow(w, 0, 2);

      expect(labels(w)).toEqual(["ID", "Name", "Status", "Revenue", "Updated"]);
    });

    it("hides the drag handle when reordering is off", () => {
      expect(setup({ config: { allowReorder: false } })
        .find(".column-setup-item-drag").exists()).toBe(false);
    });
  });

  describe("pinning", () => {
    it("offers the pin only on the first two rows", () => {
      expect(setup().findAll(".column-setup-item-fixed-btn")).toHaveLength(2);
    });

    it("pins and unpins", async () => {
      const w = setup();
      const button = rows(w)[0].find(".column-setup-item-fixed-btn");

      await button.trigger("click");
      expect(rows(w)[0].find(".column-setup-item-fixed-btn--active").exists()).toBe(true);

      await button.trigger("click");
      expect(rows(w)[0].find(".column-setup-item-fixed-btn--active").exists()).toBe(false);
    });

    it("drops the pin when a reorder pushes the column past position two", async () => {
      // A pinned column stranded mid-list would render sticky at a nonsensical
      // offset, overlapping its neighbours.
      const w = setup();
      await rows(w)[0].find(".column-setup-item-fixed-btn").trigger("click");
      await dragRow(w, 0, 4);

      expect(w.find(".column-setup-item-fixed-btn--active").exists()).toBe(false);
    });

    it("keeps the pin when the column stays inside the first two", async () => {
      const w = setup();
      await rows(w)[0].find(".column-setup-item-fixed-btn").trigger("click");
      await dragRow(w, 0, 1);

      expect(rows(w)[1].find(".column-setup-item-fixed-btn--active").exists()).toBe(true);
    });

    it("warns about a pinned column that arrived out of position", async () => {
      localStorage.setItem("orders", JSON.stringify({
        visible: ["id", "name", "status", "revenue", "updatedAt"],
        order: ["id", "name", "status", "revenue", "updatedAt"],
        fixed: { revenue: "left" },
      }));

      const w = setup({ config: { key: "orders", type: "localStorage" } });
      await nextTick();
      await nextTick();

      expect(rows(w)[3].find(".column-setup-item-badge--warning").exists()).toBe(true);
    });
  });

  describe("reset", () => {
    it("puts the list back to the column definitions", async () => {
      const w = setup();
      await eye(w, 0).trigger("click");
      await dragRow(w, 0, 3);
      await w.find(".column-setup-reset-btn").trigger("click");

      expect(labels(w)).toEqual(["ID", "Name", "Status", "Revenue", "Updated"]);
      expect(w.find(".column-setup-toggle-count").text()).toBe("5 / 5");
    });

    it("clears the stored state", async () => {
      localStorage.setItem("orders", JSON.stringify({ visible: ["id"], order: ["id"] }));

      const w = setup({ config: { key: "orders", type: "localStorage" } });
      await nextTick();
      await w.find(".column-setup-reset-btn").trigger("click");
      await nextTick();

      expect(localStorage.getItem("orders")).toBeNull();
    });

    it("applies immediately, unlike every other change", async () => {
      const w = setup();
      await w.find(".column-setup-reset-btn").trigger("click");
      await nextTick();

      expect(emittedColumns(w).map(c => c.key))
        .toEqual(["id", "name", "status", "revenue", "updatedAt"]);
      expect(w.emitted("close")).toHaveLength(1);
    });

    it("survives a failed clear", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(tableStorage, "deleteTableConfig").mockRejectedValueOnce(new Error("down"));

      const w = setup({ config: { key: "orders", type: "localStorage" } });
      await w.find(".column-setup-reset-btn").trigger("click");
      await nextTick();

      expect(w.emitted("close")).toHaveLength(1);
      expect(spy).toHaveBeenCalled();
      vi.restoreAllMocks();
    });
  });
});
