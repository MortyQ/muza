import { h } from "vue";

import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import VIcon from "../../../../src/components/base/VIcon.vue";
import TableHeader from "../../../../src/components/table/components/TableHeader.vue";
import TableHeaderGroup from "../../../../src/components/table/components/TableHeaderGroup.vue";
import type { Column, HeaderCell } from "../../../../src/components/table/types";

/**
 * A header cell carries three independent interactive regions that must not
 * bleed into each other: the label (a caller's `onHeaderClick`), the sort
 * control, and the resize handle. Each stops propagation, and getting one wrong
 * means clicking "resize" also sorts, or sorting also fires the caller's
 * callback. That separation is most of what is asserted here.
 */

const stubs = { VTooltip: true };

const col = (extra: Partial<Column> = {}): Column =>
  ({ key: "name", label: "Name", ...extra });

function header(props: Partial<Record<string, unknown>> = {}, options = {}) {
  return mount(TableHeader, {
    props: { column: col(), label: "Name", columnKey: "name", ...props },
    global: { stubs },
    ...options,
  });
}

const sortIcon = (w: ReturnType<typeof header>) =>
  w.findAllComponents(VIcon).find(i => String(i.props("icon")).startsWith("lucide:arrow"));

describe("TableHeader", () => {
  describe("label", () => {
    it("renders the label text", () => {
      expect(header().find(".v-table-header-label").text()).toBe("Name");
    });

    it("titles the label so a truncated header is still readable", () => {
      expect(header().find(".v-table-header-label").attributes("title")).toBe("Name");
    });

    it("lets a slot replace the label entirely", () => {
      const w = header({}, { slots: { default: "<b class=\"custom\">Custom</b>" } });
      expect(w.find(".custom").exists()).toBe(true);
      expect(w.find(".v-table-header-label").exists()).toBe(false);
    });

    it("hands the slot the column and its sort state", () => {
      const seen: Record<string, unknown>[] = [];
      header(
        { isSorted: true, sortOrder: "desc", column: col({ sortable: true }) },
        { slots: { default: (p: Record<string, unknown>) => { seen.push(p); return "x"; } } },
      );

      expect(seen[0]).toMatchObject({ isSorted: true, sortOrder: "desc" });
      expect((seen[0].column as Column).key).toBe("name");
    });

    it("renders an icon slot alongside the label", () => {
      const w = header({}, { slots: { icon: "<i class=\"lead\" />" } });
      expect(w.find(".lead").exists()).toBe(true);
      expect(w.find(".v-table-header-label").exists()).toBe(true);
    });
  });

  describe("alignment", () => {
    it("is left by default", () => {
      expect(header().classes()).toContain("v-table-header-cell--left");
    });

    it.each(["left", "center", "right"])("applies %s", (align) => {
      expect(header({ align }).classes()).toContain(`v-table-header-cell--${align}`);
    });
  });

  describe("sorting", () => {
    it("renders no sort control for an unsortable column", () => {
      expect(header().find(".v-table-header-sort").exists()).toBe(false);
    });

    it("renders a sort control for a sortable column", () => {
      const w = header({ column: col({ sortable: true }) });
      expect(w.find(".v-table-header-sort").exists()).toBe(true);
      expect(w.classes()).toContain("v-table-header-cell--sortable");
    });

    it("exposes the control as a button with a descriptive name", () => {
      const sort = header({ column: col({ sortable: true }) }).find(".v-table-header-sort");
      expect(sort.attributes("role")).toBe("button");
      expect(sort.attributes("aria-label")).toBe("Sort by Name");
      expect(sort.attributes("tabindex")).toBe("0");
    });

    it("shows a neutral icon while unsorted", () => {
      const w = header({ column: col({ sortable: true }) });
      expect(sortIcon(w)!.props("icon")).toBe("lucide:arrow-up-down");
    });

    it.each([
      ["asc", "lucide:arrow-up"],
      ["desc", "lucide:arrow-down"],
    ])("shows the %s icon", (sortOrder, icon) => {
      const w = header({ column: col({ sortable: true }), isSorted: true, sortOrder });
      expect(sortIcon(w)!.props("icon")).toBe(icon);
    });

    it("falls back to neutral when marked sorted with no direction", () => {
      const w = header({ column: col({ sortable: true }), isSorted: true, sortOrder: null });
      expect(sortIcon(w)!.props("icon")).toBe("lucide:arrow-up-down");
    });

    it("highlights the icon only while sorted", () => {
      const active = header({ column: col({ sortable: true }), isSorted: true, sortOrder: "asc" });
      const idle = header({ column: col({ sortable: true }) });

      expect(sortIcon(active)!.classes()).toContain("v-sort-icon--active");
      expect(sortIcon(idle)!.classes()).not.toContain("v-sort-icon--active");
    });

    it("emits sort-click on click", async () => {
      const w = header({ column: col({ sortable: true }) });
      await w.find(".v-table-header-sort").trigger("click");
      expect(w.emitted("sort-click")).toHaveLength(1);
    });

    it.each(["Enter", " "])("emits sort-click on %s", async (key) => {
      const w = header({ column: col({ sortable: true }) });
      await w.find(".v-table-header-sort").trigger("keydown", { key });
      expect(w.emitted("sort-click")).toHaveLength(1);
    });

    it("ignores other keys", async () => {
      const w = header({ column: col({ sortable: true }) });
      await w.find(".v-table-header-sort").trigger("keydown", { key: "a" });
      expect(w.emitted("sort-click")).toBeUndefined();
    });

    it("stops the sort click from reaching the header cell", async () => {
      const onCell = vi.fn();
      const w = mount({
        components: { TableHeader },
        setup: () => ({ onCell, column: col({ sortable: true }) }),
        template: "<div @click=\"onCell\">"
          + "<TableHeader :column label=\"Name\" column-key=\"name\" /></div>",
      }, { global: { stubs } });

      await w.find(".v-table-header-sort").trigger("click");
      expect(onCell).not.toHaveBeenCalled();
    });
  });

  describe("onHeaderClick", () => {
    it("marks the cell and the label as clickable", () => {
      const w = header({ column: col({ onHeaderClick: vi.fn() }) });
      expect(w.classes()).toContain("v-table-header-cell--clickable");
      expect(w.find(".v-table-header-label-wrapper--clickable").exists()).toBe(true);
    });

    it("shows an affordance icon", () => {
      const w = header({ column: col({ onHeaderClick: vi.fn() }) });
      const indicator = w.find(".v-table-header-click-indicator");

      expect(indicator.exists()).toBe(true);
      expect(indicator.attributes("title")).toBe("Click to interact with Name");
    });

    it("shows no affordance without the callback", () => {
      expect(header().find(".v-table-header-click-indicator").exists()).toBe(false);
    });

    it("calls back with the column, its key and the event", async () => {
      const onHeaderClick = vi.fn();
      const column = col({ onHeaderClick });
      const w = header({ column });

      await w.find(".v-table-header-label-wrapper").trigger("click");

      expect(onHeaderClick).toHaveBeenCalledTimes(1);
      expect(onHeaderClick.mock.calls[0][0]).toMatchObject({ column, columnKey: "name" });
      expect(onHeaderClick.mock.calls[0][0].event).toBeInstanceOf(Event);
    });

    it("does not fire when the column has no callback", async () => {
      const w = header();
      await w.find(".v-table-header-label-wrapper").trigger("click");
      expect(w.emitted("sort-click")).toBeUndefined();
    });

    it("does not fire when the sort control is used instead", async () => {
      const onHeaderClick = vi.fn();
      const w = header({ column: col({ sortable: true, onHeaderClick }) });

      await w.find(".v-table-header-sort").trigger("click");
      expect(onHeaderClick).not.toHaveBeenCalled();
    });
  });

  describe("tooltip", () => {
    it("renders one only when the column asks for it", () => {
      expect(header().findComponent({ name: "VTooltip" }).exists()).toBe(false);
      expect(header({ column: col({ tooltip: "Gross of returns" }) })
        .findComponent({ name: "VTooltip" }).exists()).toBe(true);
    });

    it("passes the text through", () => {
      const w = header({ column: col({ tooltip: "Gross of returns" }) });
      expect(w.findComponent({ name: "VTooltip" }).props("text")).toBe("Gross of returns");
    });
  });

  describe("resize handle", () => {
    it("is present by default", () => {
      expect(header().find(".v-table-resize-handle").exists()).toBe(true);
    });

    it("is absent for a non-resizable column", () => {
      expect(header({ resizable: false }).find(".v-table-resize-handle").exists()).toBe(false);
    });

    it("emits resize-start with the key and the event", async () => {
      const w = header();
      await w.find(".v-table-resize-handle").trigger("mousedown");

      const [key, event] = w.emitted("resize-start")![0] as [string, MouseEvent];
      expect(key).toBe("name");
      expect(event).toBeInstanceOf(Event);
    });

    it("emits resize-dblclick with the key", async () => {
      const w = header();
      await w.find(".v-table-resize-handle").trigger("dblclick");
      expect(w.emitted("resize-dblclick")![0]).toEqual(["name"]);
    });

    it("keeps its mousedown away from the header cell", async () => {
      const onCell = vi.fn();
      const w = mount({
        components: { TableHeader },
        setup: () => ({ onCell, column: col() }),
        template: "<div @mousedown=\"onCell\">"
          + "<TableHeader :column label=\"Name\" column-key=\"name\" /></div>",
      }, { global: { stubs } });

      await w.find(".v-table-resize-handle").trigger("mousedown");
      expect(onCell).not.toHaveBeenCalled();
    });
  });

  describe("the injected custom-action slot", () => {
    it("renders nothing when the table provides none", () => {
      expect(header().find(".custom-action").exists()).toBe(false);
    });

    it("renders what the table injected, with the column", () => {
      const received: Column[] = [];
      const w = header({}, {
        global: {
          stubs,
          provide: {
            tableSlots: {
              headerCellCustomAction: (p: { column: Column }) => {
                received.push(p.column);
                return h("button", { class: "custom-action" }, "…");
              },
            },
          },
        },
      });

      expect(w.find(".custom-action").exists()).toBe(true);
      expect(received[0].key).toBe("name");
    });
  });
});

describe("TableHeaderGroup", () => {
  const cell = (align?: string): HeaderCell => ({
    key: "performance",
    label: "Performance",
    column: { key: "performance", label: "Performance", align },
    colspan: 2,
    rowspan: 1,
    isGroup: true,
    level: 0,
  });

  it("renders the group label", () => {
    const w = mount(TableHeaderGroup, { props: { cell: cell() } });
    expect(w.find(".v-table-header-group-label").text()).toBe("Performance");
  });

  it.each(["left", "center", "right"])("applies %s alignment", (align) => {
    expect(mount(TableHeaderGroup, { props: { cell: cell(align) } }).classes())
      .toContain(`v-table-header-group--${align}`);
  });

  it("adds no alignment class when the column declares none", () => {
    const classes = mount(TableHeaderGroup, { props: { cell: cell() } }).classes();
    expect(classes.some(c => c.startsWith("v-table-header-group--"))).toBe(false);
  });

  it("is not interactive — a group label sorts nothing", () => {
    const w = mount(TableHeaderGroup, { props: { cell: cell() } });
    expect(w.find("button").exists()).toBe(false);
    expect(w.find("[role=\"button\"]").exists()).toBe(false);
  });
});
