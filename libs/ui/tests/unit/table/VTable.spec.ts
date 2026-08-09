import { defineComponent, h, nextTick, ref } from "vue";

import { mount, type VueWrapper } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";

import TablePagination from "../../../src/components/table/components/TablePagination.vue";
import TableToolbar from "../../../src/components/table/components/TableToolbar.vue";
import { TABLE_PAGE_KEY } from "../../../src/components/table/composables/useTablePage";
import type { Column } from "../../../src/components/table/types";
import tableStorage from "../../../src/components/table/utils/storage";
import VTable from "../../../src/components/table/VTable.vue";
import { useModalRegisterer } from "../../../src/composables/useModalRegister";
import {
  makeColumns,
  makeRows,
  makeTotalRow,
  makeTreeRows,
  type TableRow,
} from "../../setup/table";

/**
 * VTable's own job is orchestration: take a prop, hand it to the right
 * composable, and route that composable's output to the right subcomponent.
 * The logic behind each of those composables is covered against the composable
 * itself, so what is asserted here is the wiring — one or two tests per seam,
 * not the cross-product of every option.
 *
 * Virtualization is off throughout, and must stay off. `rowsToRender` returns
 * nothing until the scroll container reports a size, and jsdom reports zero for
 * everything — so a virtualized table renders no rows at all here, and the
 * virtualizer re-measures itself into "Maximum recursive updates exceeded"
 * while doing it. Neither is a defect; both are the absence of layout. The
 * windowing belongs to the browser project.
 */

const stubs = { VTooltip: true };

beforeEach(() => {
  useModalRegisterer().modals.value.clear();
  tableStorage.setStorageType("localStorage");
  localStorage.clear();
});

function table(props: Record<string, unknown> = {}, options: Record<string, unknown> = {}) {
  return mount(VTable, {
    props: {
      columns: makeColumns(),
      data: makeRows(),
      virtualized: false,
      ...props,
    },
    global: { stubs },
    ...options,
  }) as VueWrapper;
}

const rows = (w: VueWrapper) => w.findAll(".v-table-row-wrapper");
const headerLabels = (w: VueWrapper) =>
  w.findAll(".v-table-header-label").map(l => l.text());
const cellTexts = (w: VueWrapper, rowIndex: number) =>
  rows(w)[rowIndex].findAll(".v-table-cell-text").map(c => c.text());

describe("VTable", () => {
  describe("columns → header", () => {
    it("renders one header cell per column", () => {
      expect(headerLabels(table())).toEqual(["ID", "Name", "Status", "Revenue", "Updated"]);
    });

    it("renders a flat header row when there are no groups", () => {
      expect(table().findAll(".v-table-header-row")).toHaveLength(1);
    });

    it("renders a level per depth when there are groups", () => {
      const columns: Column<TableRow>[] = [
        { key: "id", label: "ID" },
        {
          key: "perf",
          label: "Performance",
          children: [{ key: "revenue", label: "Revenue" }, { key: "ratio", label: "Ratio" }],
        },
      ];
      const w = table({ columns });

      expect(w.findAll(".v-table-header-row")).toHaveLength(2);
      expect(w.find(".v-table-header-group-label").text()).toBe("Performance");
    });

    it("renders data cells for the leaves only when grouped", () => {
      const columns: Column<TableRow>[] = [
        { key: "id", label: "ID" },
        {
          key: "perf",
          label: "Performance",
          children: [{ key: "revenue", label: "Revenue" }],
        },
      ];
      expect(cellTexts(table({ columns }), 0)).toHaveLength(2);
    });

    it("follows a change of columns", async () => {
      const w = table();
      await w.setProps({ columns: makeColumns().slice(0, 2) });
      expect(headerLabels(w)).toEqual(["ID", "Name"]);
    });
  });

  describe("data → rows", () => {
    it("renders one row per record", () => {
      expect(rows(table())).toHaveLength(5);
    });

    it("renders a cell per column, formatted", () => {
      expect(cellTexts(table(), 0)).toEqual(["1", "Alpha", "active", "$1,251", "03/01/2024"]);
    });

    it("follows a change of data", async () => {
      const w = table();
      await w.setProps({ data: makeRows(2) });
      expect(rows(w)).toHaveLength(2);
    });

    it("renders no rows and an empty state for no data", () => {
      const w = table({ data: [] });
      expect(rows(w)).toHaveLength(0);
      expect(w.find(".v-table-empty-state").exists()).toBe(true);
    });

    it("lets a slot replace the empty state", () => {
      const w = table({ data: [] }, { slots: { "empty-state": "<b class=\"own\">None</b>" } });
      expect(w.find(".own").exists()).toBe(true);
    });

    it("emits row-click with the row", async () => {
      const w = table();
      await rows(w)[1].trigger("click");

      expect((w.emitted("row-click")![0][0] as TableRow).name).toBe("Bravo");
    });

    it("applies a rowClassName string to every row", () => {
      const w = table({ rowClassName: "flagged" });
      expect(w.findAll(".flagged").length).toBeGreaterThan(0);
    });

    it("applies a rowClassName function per row", () => {
      const w = table({
        rowClassName: (row: TableRow) => (row.status === "archived" ? "archived" : ""),
      });
      expect(w.findAll("[data-custom-row=\"true\"]").length).toBeGreaterThan(0);
      expect(w.findAll(".archived").length).toBeGreaterThan(0);
    });
  });

  describe("cell rendering", () => {
    it("lets a per-column slot replace the cell body", () => {
      const w = table({}, { slots: { "cell-name": "<b class=\"own\">custom</b>" } });
      expect(w.findAll(".own")).toHaveLength(5);
    });

    it("applies a column's cellClass", () => {
      const columns = makeColumns({ status: { cellClass: () => "tone" } });
      expect(table({ columns }).findAll(".tone").length).toBeGreaterThan(0);
    });

    it("applies a column's cellStyle", () => {
      const columns = makeColumns({ status: { cellStyle: () => ({ opacity: "0.5" }) } });
      expect(table({ columns }).html()).toContain("opacity: 0.5");
    });
  });

  describe("totalRow", () => {
    it("renders nothing without one", () => {
      expect(table().find(".v-table-total-cell").exists()).toBe(false);
    });

    it("renders a sticky summary row", () => {
      const w = table({ totalRow: makeTotalRow() });
      expect(w.findAll(".v-table-total-cell")).toHaveLength(5);
      expect(w.find(".v-table-total-text").text()).toBe("");
    });

    it("formats the summary through the column's format", () => {
      const w = table({ totalRow: makeTotalRow() });
      const texts = w.findAll(".v-table-total-text").map(t => t.text());
      expect(texts).toContain("$6,692");
    });
  });

  describe("loading", () => {
    it("renders no overlay by default", () => {
      expect(table().find(".v-table-loading-overlay").exists()).toBe(false);
    });

    it("renders one while loading", () => {
      expect(table({ loading: true }).find(".v-table-loading-overlay").exists()).toBe(true);
    });

    it("marks the scroll container as inert", () => {
      expect(table({ loading: true }).find(".v-table-scroll-container").classes())
        .toContain("v-table-scroll-container--loading");
    });
  });

  describe("sorting", () => {
    const sortable = () => makeColumns({ name: { sortable: true } });

    it("emits update:sort-state on a header click", async () => {
      const w = table({ columns: sortable() });
      await w.findAll(".v-table-header-sort")[0].trigger("click");

      expect(w.emitted("update:sort-state")![0])
        .toEqual([[{ field: "name", order: "asc" }]]);
    });

    it("asks for a refetch in server mode", async () => {
      const w = table({ columns: sortable(), pagination: { page: 1, pageSize: 10, total: 50 } });
      await w.findAll(".v-table-header-sort")[0].trigger("click");

      expect(w.emitted("request")![0][0])
        .toMatchObject({ page: 1, sort: [{ field: "name", order: "asc" }] });
    });

    it("reorders the rows in front mode", async () => {
      const w = table({ columns: sortable(), sort: { type: "front" } });
      await w.findAll(".v-table-header-sort")[0].trigger("click");
      await nextTick();

      expect(cellTexts(w, 0)[1]).toBe("Alpha");
      await w.findAll(".v-table-header-sort")[0].trigger("click");
      await nextTick();
      expect(cellTexts(w, 0)[1]).toBe("Echo");
    });

    it("emits sort rather than request in front mode", async () => {
      const w = table({ columns: sortable(), sort: { type: "front" } });
      await w.findAll(".v-table-header-sort")[0].trigger("click");

      expect(w.emitted("sort")).toHaveLength(1);
      expect(w.emitted("request")).toBeUndefined();
    });

    it("shows the sort state a caller passes in", () => {
      const w = table({
        columns: sortable(),
        sortState: [{ field: "name", order: "desc" }],
      });
      expect(w.find(".v-sort-icon--active").exists()).toBe(true);
    });

    it("renders no sort control for an unsortable column", () => {
      const columns = makeColumns({ name: { sortable: false }, revenue: { sortable: false } });
      expect(table({ columns }).findAll(".v-table-header-sort")).toHaveLength(0);
    });
  });

  describe("pagination", () => {
    const config = { page: 2, pageSize: 10, total: 50 };

    it("renders none by default", () => {
      expect(table().findComponent(TablePagination).exists()).toBe(false);
    });

    it("renders the bar when configured", () => {
      const bar = table({ pagination: config }).findComponent(TablePagination);
      expect(bar.props()).toMatchObject({ page: 2, pageSize: 10, total: 50 });
    });

    it("emits a request on navigation", async () => {
      const w = table({ pagination: config });
      await w.findComponent(TablePagination).vm.$emit("page-change", { page: 3, pageSize: 10 });

      expect(w.emitted("request")![0][0]).toMatchObject({ page: 3, pageSize: 10 });
    });

    it("emits update:page when the page is bound", async () => {
      const w = table({ pagination: config, page: 2 });
      await w.findComponent(TablePagination).vm.$emit("page-change", { page: 3, pageSize: 10 });

      expect(w.emitted("update:page")![0]).toEqual([3]);
    });

    it("prefers the bound page over the config's", () => {
      const w = table({ pagination: config, page: 5 });
      expect(w.findComponent(TablePagination).props("page")).toBe(5);
    });

    it("writes back to an injected page ref instead of emitting", async () => {
      // The third of the three page modes: a parent using `useTablePage`
      // provides the ref and never wires v-model.
      const injected = ref(2);
      const w = mount(VTable, {
        props: { columns: makeColumns(), data: makeRows(), virtualized: false, pagination: config },
        global: { stubs, provide: { [TABLE_PAGE_KEY as symbol]: injected } },
      });

      await w.findComponent(TablePagination).vm.$emit("page-change", { page: 4, pageSize: 10 });

      expect(injected.value).toBe(4);
      expect(w.emitted("update:page")).toBeUndefined();
    });

    it("ignores navigation while loading", async () => {
      const w = table({ pagination: config, loading: true });
      await w.findComponent(TablePagination).vm.$emit("page-change", { page: 3, pageSize: 10 });

      expect(w.emitted("request")).toBeUndefined();
    });
  });

  describe("selection", () => {
    const multiSelect = { enabled: true };

    it("renders no checkbox column by default", () => {
      expect(table().find(".v-table-checkbox-cell").exists()).toBe(false);
    });

    it("renders one per row plus the header when enabled", () => {
      const w = table({ multiSelect });
      expect(w.findAll(".v-table-checkbox-cell")).toHaveLength(5);
      expect(w.find(".v-table-header-checkbox-cell").exists()).toBe(true);
    });

    it("can hide the header checkbox", () => {
      const w = table({ multiSelect: { enabled: true, showHeaderCheckbox: false } });
      expect(w.find(".v-table-header-checkbox-cell--empty").exists()).toBe(true);
    });

    it("emits update:selected-rows on a row checkbox", async () => {
      const w = table({ multiSelect });
      await w.findAll(".v-table-checkbox-cell input")[0].setValue(true);

      const selected = w.emitted("update:selected-rows")!.at(-1)![0] as TableRow[];
      expect(selected.map(r => r.id)).toEqual([1]);
    });

    it("selects everything from the header checkbox", async () => {
      const w = table({ multiSelect });
      await w.find(".v-table-header-checkbox-cell input").setValue(true);

      const selected = w.emitted("update:selected-rows")!.at(-1)![0] as TableRow[];
      expect(selected).toHaveLength(5);
    });

    it("shows rows a caller pre-selected", () => {
      const w = table({ multiSelect, selectedRows: [makeRows()[0]] });
      const boxes = w.findAll(".v-table-checkbox-cell input");
      expect((boxes[0].element as HTMLInputElement).checked).toBe(true);
      expect((boxes[1].element as HTMLInputElement).checked).toBe(false);
    });

    it("honours isRowSelectable", () => {
      const w = table({
        multiSelect: { enabled: true, isRowSelectable: (r: TableRow) => r.id !== 2 },
      });
      const boxes = w.findAll(".v-table-checkbox-cell input");
      expect((boxes[1].element as HTMLInputElement).disabled).toBe(true);
    });
  });

  describe("expandable rows", () => {
    it("renders only the roots to start", () => {
      expect(rows(table({ data: makeTreeRows() }))).toHaveLength(3);
    });

    it("expands on the chevron", async () => {
      const w = table({ data: makeTreeRows() });
      await w.find(".v-table-cell-expand-btn").trigger("click");

      expect(rows(w)).toHaveLength(5);
    });

    it("emits expand-click with the row, the column and the new state", async () => {
      const w = table({ data: makeTreeRows() });
      await w.find(".v-table-cell-expand-btn").trigger("click");

      const payload = w.emitted("expand-click")![0][0] as {
        row: TableRow
        column: Column
        expanded: boolean
      };
      expect(payload.row.id).toBe(1);
      expect(payload.column.key).toBe("id");
      expect(payload.expanded).toBe(true);
    });

    it("leaves the row collapsed in controlled mode until the callback runs", async () => {
      const w = table({ data: makeTreeRows(), expandMode: "controlled" });
      await w.find(".v-table-cell-expand-btn").trigger("click");

      expect(rows(w)).toHaveLength(3);

      const { callback } = w.emitted("expand-click")![0][0] as { callback: () => void };
      callback();
      await nextTick();
      expect(rows(w)).toHaveLength(5);
    });

    it("renders no chevron for a flat dataset", () => {
      expect(table().find(".v-table-cell-expand-btn").exists()).toBe(false);
    });
  });

  describe("toolbar", () => {
    it("renders none by default", () => {
      expect(table().findComponent(TableToolbar).exists()).toBe(false);
    });

    it("renders one when enabled", () => {
      expect(table({ toolbar: { enabled: true, title: "Orders" } })
        .find(".v-toolbar-title").text()).toBe("Orders");
    });

    it("renders one for a toolbar slot alone", () => {
      const w = table({}, { slots: { toolbar: "<div class=\"own\" />" } });
      expect(w.find(".own").exists()).toBe(true);
    });

    it("forwards refresh", async () => {
      const w = table({ toolbar: { enabled: true, actions: { refresh: true } } });
      await w.findComponent(TableToolbar).vm.$emit("refresh");

      expect(w.emitted("toolbar:refresh")).toHaveLength(1);
    });

    it("forwards reset-sort", async () => {
      const w = table({ toolbar: { enabled: true, actions: { resetSort: true } } });
      await w.findComponent(TableToolbar).vm.$emit("reset-sort");

      expect(w.emitted("toolbar:reset-sort")).toHaveLength(1);
    });

    it("forwards export with its format and scope", async () => {
      const w = table({ toolbar: { enabled: true, actions: { export: "single" } } });
      await w.findComponent(TableToolbar).vm.$emit("export", "csv", true);

      expect(w.emitted("toolbar:export")![0]).toEqual(["csv", true]);
    });

    it("carries the search model in both directions", async () => {
      const w = table({ toolbar: { enabled: true, search: true }, search: "wid" });
      expect(w.findComponent(TableToolbar).props("search")).toBe("wid");

      await w.findComponent(TableToolbar).vm.$emit("update:search", "widget");
      expect(w.emitted("update:search")![0]).toEqual(["widget"]);
    });

    it("injects its slots rather than drilling them", () => {
      // VTable provides `tableSlots`; the toolbar renders whatever it finds
      // there in preference to its own named slots.
      const w = table(
        { toolbar: { enabled: true, title: "Orders" } },
        { slots: { "toolbar-title": "<b class=\"injected\">Mine</b>" } },
      );
      expect(w.find(".injected").exists()).toBe(true);
    });

    it("injects the header-cell action slot down to every header", () => {
      const w = table(
        {},
        { slots: { "header-cell-custom-action": "<i class=\"action\" />" } },
      );
      expect(w.findAll(".action")).toHaveLength(5);
    });
  });

  describe("highlight", () => {
    it("renders no pin buttons by default", () => {
      expect(table().find(".v-table-pin-button").exists()).toBe(false);
    });

    it("renders a row pin per row when enabled", () => {
      expect(table({ highlight: true }).findAll(".v-table-pin-button").length)
        .toBeGreaterThanOrEqual(5);
    });

    it("emits update:highlight-state on a row pin", async () => {
      // Scoped to a row: with both axes on, the header's column pins come
      // first in DOM order, so an unscoped [0] picks a column instead.
      const w = table({ highlight: true });
      await w.find(".v-table-row-wrapper .v-table-pin-button").trigger("click");

      const state = w.emitted("update:highlight-state")!.at(-1)![0] as {
        row: { rowId: number, rowIndex: number } | null
        column: unknown
      } | null;

      expect(state?.row).toMatchObject({ rowId: 1, rowIndex: 0 });
      expect(state?.column).toBeNull();
    });

    it("marks the pinned row", async () => {
      const w = table({ highlight: true });
      await w.find(".v-table-row-wrapper .v-table-pin-button").trigger("click");

      expect(w.find(".v-table-row-wrapper--pinned").exists()).toBe(true);
    });

    it("renders only the row axis for `{ column: false }`", () => {
      const w = table({ highlight: { column: false } });
      expect(w.findAll(".v-table-pin-button").length).toBe(5);
    });

    it("renders nothing for `highlight: false`", () => {
      expect(table({ highlight: false }).find(".v-table-pin-button").exists()).toBe(false);
    });
  });

  describe("fullscreen", () => {
    it("renders no toggle by default", () => {
      expect(table().find(".v-table-fullscreen-toggle").exists()).toBe(false);
    });

    it("renders one when the toolbar action is on", () => {
      const w = table({ toolbar: { enabled: true, actions: { fullscreen: true } } });
      expect(w.find(".v-table-fullscreen-toggle").exists()).toBe(true);
    });

    it("enters fullscreen on click", async () => {
      const w = table({ toolbar: { enabled: true, actions: { fullscreen: true } } });
      await w.find(".v-table-fullscreen-toggle").trigger("click");

      expect(w.find(".v-table-fullscreen-placeholder").exists()).toBe(true);
    });
  });

  describe("fixed columns", () => {
    it("sticks a pinned column and marks the shadow edge", () => {
      const w = table({ columns: makeColumns({ id: { fixed: "left" } }) });
      const cell = w.findAll(".v-table-header-cell")[0];

      expect(cell.classes()).toContain("v-table-fixed-left");
      expect(cell.classes()).toContain("v-table-fixed-left-last");
    });

    it("offsets the second pinned column by the first one's width", () => {
      const w = table({ columns: makeColumns({ id: { fixed: "left" }, name: { fixed: "left" } }) });
      expect(w.findAll(".v-table-header-cell")[1].attributes("style")).toContain("left: 60px");
    });
  });

  it("renders inside a host that binds every model at once", async () => {
    // The shape a real page uses: v-model:page, v-model:search and
    // v-model:sort-state together, with the table driving all three.
    const Host = defineComponent({
      setup() {
        const page = ref(1);
        const search = ref("");
        const sortState = ref<{ field: string, order: "asc" | "desc" }[]>([]);

        return () => h(VTable, {
          columns: makeColumns({ name: { sortable: true } }),
          data: makeRows(),
          virtualized: false,
          pagination: { page: page.value, pageSize: 10, total: 50 },
          toolbar: { enabled: true, search: true },
          page: page.value,
          "onUpdate:page": (v: number) => { page.value = v; },
          search: search.value,
          "onUpdate:search": (v: string) => { search.value = v; },
          sortState: sortState.value,
          "onUpdate:sortState": (v: typeof sortState.value) => { sortState.value = v; },
        });
      },
    });

    const w = mount(Host, { global: { stubs } });
    await w.findAll(".v-table-header-sort")[0].trigger("click");
    await nextTick();

    expect(w.find(".v-sort-icon--active").exists()).toBe(true);
  });
});
