import { ref } from "vue";

import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import TableHeader from "../../../../src/components/table/components/TableHeader.vue";
import TableHeaderGroup from "../../../../src/components/table/components/TableHeaderGroup.vue";
import TableHeaderGrouped from "../../../../src/components/table/components/TableHeaderGrouped.vue";
import TableHeaderSimple from "../../../../src/components/table/components/TableHeaderSimple.vue";
import { useGroupedHeaders } from "../../../../src/components/table/composables/useGroupedHeaders";
import type { Column, HeaderCell } from "../../../../src/components/table/types";
import { withScope } from "../../../setup/scope";
import { makeColumns, makeGroupedColumns } from "../../../setup/table";

/**
 * Both header rows are pure fan-out: they take the geometry the composables
 * computed and turn it into cells, forwarding three events back up and two
 * per-column slots down. The interesting failures are misrouted — a sort click
 * that reports the wrong column, or a slot forwarded to every cell instead of
 * the one whose key it names.
 *
 * `headerLevels` comes from the real `useGroupedHeaders` rather than a
 * hand-built array: the two are used together, and a hand-built structure would
 * hide a disagreement between them.
 */

const stubs = { VTooltip: true };

const sortState = () => ({ isSorted: false, order: null, index: -1 });

const wiring = {
  getColumnClasses: (c: Column) => [`col-${c.key}`],
  getFixedStyles: () => ({}),
  getSortState: sortState,
  isColumnResizable: (c: Column) => c.width !== "flex",
};

function simple(columns: Column[] = makeColumns(), options = {}) {
  return mount(TableHeaderSimple, {
    props: { columns, ...wiring },
    global: { stubs },
    ...options,
  });
}

function levelsOf(columns: Column[]): HeaderCell[][] {
  const { result } = withScope(() =>
    useGroupedHeaders(ref(columns), ref(new Map<string, number>())));
  return result.headerLevels.value;
}

function grouped(columns: Column[] = makeGroupedColumns(), options = {}) {
  return mount(TableHeaderGrouped, {
    props: {
      columns: levelsOf(columns),
      ...wiring,
      getGroupWidth: () => 200,
      getGroupFixedStyles: () => ({}),
    },
    global: { stubs },
    ...options,
  });
}

const keys = (w: ReturnType<typeof simple>) =>
  w.findAllComponents(TableHeader).map(h => h.props("columnKey"));

describe("TableHeaderSimple", () => {
  it("renders one cell per column, in order", () => {
    expect(keys(simple())).toEqual(["id", "name", "status", "revenue", "updatedAt"]);
  });

  it("renders a single header row", () => {
    expect(simple().findAll(".v-table-header-row")).toHaveLength(1);
  });

  it("passes each column's label and alignment down", () => {
    const first = simple().findAllComponents(TableHeader)[0];
    expect(first.props("label")).toBe("ID");
    expect(first.props("align")).toBe("right");
  });

  it("applies the classes the wiring computed", () => {
    expect(simple().findAllComponents(TableHeader)[0].classes()).toContain("col-id");
  });

  it("applies the fixed styles the wiring computed", () => {
    const w = mount(TableHeaderSimple, {
      props: { columns: makeColumns(), ...wiring, getFixedStyles: () => ({ left: "60px" }) },
      global: { stubs },
    });
    expect(w.findAllComponents(TableHeader)[0].attributes("style")).toContain("left: 60px");
  });

  it("asks the wiring whether each column may be resized", () => {
    const columns = makeColumns({ name: { width: "flex" } });
    const cells = simple(columns).findAllComponents(TableHeader);

    expect(cells[0].props("resizable")).toBe(true);
    expect(cells[1].props("resizable")).toBe(false);
  });

  it("passes the sort state per column", () => {
    const w = mount(TableHeaderSimple, {
      props: {
        columns: makeColumns(),
        ...wiring,
        getSortState: (key: string) =>
          (key === "revenue" ? { isSorted: true, order: "desc", index: 1 } : sortState()),
      },
      global: { stubs },
    });

    const revenue = w.findAllComponents(TableHeader)[3];
    expect(revenue.props("isSorted")).toBe(true);
    expect(revenue.props("sortOrder")).toBe("desc");
    expect(revenue.props("sortIndex")).toBe(1);
  });

  it("forwards sort-click naming the column that was clicked", async () => {
    const w = simple();
    await w.findAllComponents(TableHeader)[3].vm.$emit("sort-click");

    const [column] = w.emitted("sort-click")![0] as [Column];
    expect(column.key).toBe("revenue");
  });

  it("forwards resize-start with the key and event untouched", async () => {
    const w = simple();
    const event = new MouseEvent("mousedown");
    await w.findAllComponents(TableHeader)[0].vm.$emit("resize-start", "id", event);

    expect(w.emitted("resize-start")![0]).toEqual(["id", event]);
  });

  it("forwards resize-dblclick", async () => {
    const w = simple();
    await w.findAllComponents(TableHeader)[0].vm.$emit("resize-dblclick", "id");
    expect(w.emitted("resize-dblclick")![0]).toEqual(["id"]);
  });

  it("renders the checkbox-header slot ahead of the columns", () => {
    const w = simple(makeColumns(), {
      slots: { "checkbox-header": "<div class=\"cbx\" />" },
    });
    const row = w.find(".v-table-header-row");

    expect(row.element.firstElementChild?.className).toBe("cbx");
  });

  it("renders no checkbox cell without the slot", () => {
    expect(simple().find(".cbx").exists()).toBe(false);
  });

  it("forwards a per-column header slot to that column only", () => {
    const w = simple(makeColumns(), {
      slots: { "header-revenue": "<b class=\"custom\">Net</b>" },
    });

    expect(w.findAll(".custom")).toHaveLength(1);
    expect(w.findAllComponents(TableHeader)[3].find(".custom").exists()).toBe(true);
  });

  it("forwards a per-column icon slot to that column only", () => {
    const w = simple(makeColumns(), {
      slots: { "header-icon-name": "<i class=\"lead\" />" },
    });

    expect(w.findAll(".lead")).toHaveLength(1);
    expect(w.findAllComponents(TableHeader)[1].find(".lead").exists()).toBe(true);
  });

  it("ignores a slot named after a column that is not there", () => {
    const w = simple(makeColumns(), { slots: { "header-missing": "<b class=\"ghost\" />" } });
    expect(w.find(".ghost").exists()).toBe(false);
  });

  it("renders an empty row for no columns", () => {
    const w = simple([]);
    expect(w.findAllComponents(TableHeader)).toHaveLength(0);
    expect(w.find(".v-table-header-row").exists()).toBe(true);
  });
});

describe("TableHeaderGrouped", () => {
  it("renders one row per header level", () => {
    expect(grouped().findAll(".v-table-header-row")).toHaveLength(2);
  });

  it("numbers the rows so the sticky offsets can differ per level", () => {
    const rows = grouped().findAll(".v-table-header-row");
    expect(rows[0].classes()).toContain("v-table-header-row-level-0");
    expect(rows[1].classes()).toContain("v-table-header-row-level-1");
  });

  it("renders a group cell for a group and leaf cells for the rest", () => {
    const w = grouped();
    expect(w.findAllComponents(TableHeaderGroup)).toHaveLength(1);
    expect(keys(w)).toEqual(["id", "name", "revenue", "ratio"]);
  });

  it("spans the group across its leaves", () => {
    const style = grouped().findComponent(TableHeaderGroup).attributes("style");
    expect(style).toContain("grid-column: span 2");
  });

  it("spans a root-level leaf down through the header rows", () => {
    const idCell = grouped().findAllComponents(TableHeader)[0];
    expect(idCell.attributes("style")).toContain("grid-row: span 2");
    expect(idCell.classes()).toContain("v-table-header-cell--rowspan");
  });

  it("sets no grid-row on a cell that spans one row", () => {
    const revenue = grouped().findAllComponents(TableHeader)[2];
    expect(revenue.attributes("style") ?? "").not.toContain("grid-row");
  });

  it("marks the deeper leaves as grouped", () => {
    const cells = grouped().findAllComponents(TableHeader);
    expect(cells[0].classes()).not.toContain("v-table-header-cell--grouped");
    expect(cells[2].classes()).toContain("v-table-header-cell--grouped");
  });

  it("puts the checkbox slot on the first level only", () => {
    const w = grouped(makeGroupedColumns(), {
      slots: { "checkbox-header": "<div class=\"cbx\" />" },
    });
    expect(w.findAll(".cbx")).toHaveLength(1);
    expect(w.findAll(".v-table-header-row")[0].find(".cbx").exists()).toBe(true);
  });

  it("forwards sort-click naming the leaf column", async () => {
    const w = grouped();
    await w.findAllComponents(TableHeader)[2].vm.$emit("sort-click");

    const [column] = w.emitted("sort-click")![0] as [Column];
    expect(column.key).toBe("revenue");
  });

  it("forwards the resize events", async () => {
    const w = grouped();
    const event = new MouseEvent("mousedown");
    await w.findAllComponents(TableHeader)[2].vm.$emit("resize-start", "revenue", event);
    await w.findAllComponents(TableHeader)[2].vm.$emit("resize-dblclick", "revenue");

    expect(w.emitted("resize-start")![0]).toEqual(["revenue", event]);
    expect(w.emitted("resize-dblclick")![0]).toEqual(["revenue"]);
  });

  it("forwards a per-column slot to the leaf that names it", () => {
    const w = grouped(makeGroupedColumns(), {
      slots: { "header-ratio": "<b class=\"custom\">%</b>" },
    });

    expect(w.findAll(".custom")).toHaveLength(1);
    expect(w.findAllComponents(TableHeader)[3].find(".custom").exists()).toBe(true);
  });

  it("gives the group cell no sort control", () => {
    const group = grouped().findComponent(TableHeaderGroup);
    expect(group.find(".v-table-header-sort").exists()).toBe(false);
  });

  it("asks the wiring for the group's width", () => {
    const getGroupWidth = vi.fn(() => 200);
    mount(TableHeaderGrouped, {
      props: {
        columns: levelsOf(makeGroupedColumns()),
        ...wiring,
        getGroupWidth,
        getGroupFixedStyles: () => ({}),
      },
      global: { stubs },
    });

    expect(getGroupWidth).toHaveBeenCalledWith(
      expect.objectContaining({ key: "performance" }),
    );
  });

  it("renders three rows for a three-level header", () => {
    const deep: Column[] = [
      { key: "flat", label: "Flat" },
      {
        key: "g1",
        label: "G1",
        children: [{ key: "g2", label: "G2", children: [{ key: "leaf", label: "Leaf" }] }],
      },
    ];
    const w = grouped(deep);

    expect(w.findAll(".v-table-header-row")).toHaveLength(3);
    expect(w.findAllComponents(TableHeaderGroup)).toHaveLength(2);
  });
});
