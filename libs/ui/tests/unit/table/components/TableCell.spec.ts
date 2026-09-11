import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import VIcon from "../../../../src/components/base/VIcon.vue";
import TableCell from "../../../../src/components/table/components/TableCell.vue";
import TableRow from "../../../../src/components/table/components/TableRow.vue";
import type { CellMetadata } from "../../../../src/components/table/composables/useTableCellMetadata";
import type { Column } from "../../../../src/components/table/types/index";

/**
 * The cell owns two visual decisions: alignment, and the indent that makes a
 * tree read as a tree. The indent is arithmetic in a style binding, which is
 * exactly the kind of thing that silently becomes `NaNpx`.
 */

const cell = (props: Record<string, unknown> = {}, slot = "value") =>
  mount(TableCell, { props, slots: { default: slot } });

describe("TableCell", () => {
  it("renders its slot", () => {
    expect(cell({}, "1,250").text()).toBe("1,250");
  });

  it("carries the base class", () => {
    expect(cell().classes()).toContain("v-table-cell");
  });

  describe("alignment", () => {
    it("is left by default", () => {
      expect(cell().classes()).toContain("v-table-cell--left");
    });

    it.each(["left", "center", "right"])("applies %s", (align) => {
      const classes = cell({ align }).classes();
      expect(classes).toContain(`v-table-cell--${align}`);
      expect(classes.filter(c => c.startsWith("v-table-cell--"))).toHaveLength(1);
    });

    it("adds no alignment class for a value outside the three", () => {
      // `align` is typed as the union plus `string`, so a column may carry
      // anything; an unknown value must fall through rather than land on left.
      const classes = cell({ align: "justify" }).classes();
      expect(classes.some(c => c.startsWith("v-table-cell--"))).toBe(false);
    });
  });

  describe("indent", () => {
    it("does not indent a root row", () => {
      const w = cell({ isFirstColumn: true, depth: 0 });
      expect(w.classes()).not.toContain("v-table-cell--indented");
      expect(w.attributes("style")).toBeUndefined();
    });

    it("does not indent a column that is not the first", () => {
      const w = cell({ isFirstColumn: false, depth: 3 });
      expect(w.classes()).not.toContain("v-table-cell--indented");
      expect(w.attributes("style")).toBeUndefined();
    });

    it("indents the first column of a nested row", () => {
      const w = cell({ isFirstColumn: true, depth: 1 });
      expect(w.classes()).toContain("v-table-cell--indented");
      expect(w.attributes("style")).toBe("padding-left: 40px;");
    });

    it("adds 24px per level on top of the 16px base", () => {
      expect(cell({ isFirstColumn: true, depth: 2 }).attributes("style"))
        .toBe("padding-left: 64px;");
      expect(cell({ isFirstColumn: true, depth: 3 }).attributes("style"))
        .toBe("padding-left: 88px;");
    });
  });

  it("accepts a value prop it does not itself render", () => {
    // The slot is what shows; `value` exists for consumers that read it off the
    // component instance. Passing it must not change the markup.
    expect(cell({ value: 42 }, "rendered").text()).toBe("rendered");
  });
});

/**
 * Metadata mode. Handing the cell a row and a column switches it from a bare
 * passthrough into rendering itself off the injected resolver — which is what
 * replaced the four `getCellMetadata` calls VTable's template used to make per
 * cell. The total row still takes the passthrough path, so both must keep working
 * from the same component.
 */
describe("TableCell in metadata mode", () => {
  const COLUMN: Column = { key: "revenue", label: "Revenue" };
  const ROW = { id: "1", revenue: 1250 };

  const META: CellMetadata = {
    formattedValue: "$1,250",
    cssClass: undefined,
    titleText: "$1,250",
    indentStyle: null,
    customStyle: undefined,
    isExpandable: false,
  };

  function metadataCell(
    over: Partial<CellMetadata> = {},
    props: Record<string, unknown> = {},
    slots: Record<string, string> = {},
  ) {
    const getCellMetadata = vi.fn(() => ({ ...META, ...over }));
    const wrapper = mount(TableCell, {
      props: { row: ROW, column: COLUMN, colIndex: 0, rowIndex: 0, ...props },
      slots,
      global: { provide: { tableCellMetadata: getCellMetadata }, stubs: { Icon: true } },
    });
    return { wrapper, getCellMetadata };
  }

  it("renders the formatted value with its title", () => {
    const { wrapper } = metadataCell();
    const span = wrapper.find(".v-table-cell-text span");
    expect(span.text()).toBe("$1,250");
    expect(span.attributes("title")).toBe("$1,250");
  });

  it("resolves its metadata exactly once", () => {
    const { getCellMetadata } = metadataCell();
    expect(getCellMetadata).toHaveBeenCalledTimes(1);
  });

  it("passes the coordinates straight through to the resolver", () => {
    const { getCellMetadata } = metadataCell({}, { colIndex: 2, rowIndex: 7 });
    expect(getCellMetadata).toHaveBeenCalledWith(ROW, COLUMN, 2, 7);
  });

  it("keeps the content wrapper the stylesheet targets", () => {
    expect(metadataCell().wrapper.find(".v-table-cell-content").exists()).toBe(true);
  });

  it("puts the metadata class on the root, beside the alignment one", () => {
    const { wrapper } = metadataCell({ cssClass: "is-high" });
    expect(wrapper.classes()).toContain("is-high");
    expect(wrapper.classes()).toContain("v-table-cell--left");
  });

  it("applies the metadata style to the root", () => {
    const { wrapper } = metadataCell({ customStyle: { color: "red" } });
    expect(wrapper.attributes("style")).toContain("color: red");
  });

  it("indents the content, not the cell", () => {
    // The indent has to stack on top of the cell's own horizontal padding; on
    // the cell itself it would replace it.
    const { wrapper } = metadataCell({ indentStyle: { paddingLeft: "40px" } });
    expect(wrapper.find(".v-table-cell-content").attributes("style")).toBe("padding-left: 40px;");
    expect(wrapper.attributes("style")).toBeUndefined();
  });

  it("truncates by default and leaves an interactive column alone", () => {
    expect(metadataCell().wrapper.find(".v-table-cell-text").classes())
      .toContain("v-table-cell-text--truncate");

    const interactive = metadataCell({}, { column: { ...COLUMN, interactive: true } });
    expect(interactive.wrapper.find(".v-table-cell-text").classes())
      .not.toContain("v-table-cell-text--truncate");
  });

  it("withholds the title when the metadata says so", () => {
    const { wrapper } = metadataCell({ titleText: undefined });
    expect(wrapper.find(".v-table-cell-text span").attributes("title")).toBeUndefined();
  });

  describe("the expand button", () => {
    it("is absent unless the metadata says the row expands", () => {
      expect(metadataCell().wrapper.find(".v-table-cell-expand-btn").exists()).toBe(false);
    });

    it("appears for an expandable row and emits on click", async () => {
      const { wrapper } = metadataCell({ isExpandable: true });
      const button = wrapper.find(".v-table-cell-expand-btn");
      expect(button.exists()).toBe(true);

      await button.trigger("click");
      expect(wrapper.emitted("toggle-expand")).toHaveLength(1);
    });

    it("does not let the click reach the row", async () => {
      // The row's own click handler selects it; toggling a subtree must not.
      const rowClick = vi.fn();
      const { wrapper } = metadataCell({ isExpandable: true });
      wrapper.element.addEventListener("click", rowClick);
      await wrapper.find(".v-table-cell-expand-btn").trigger("click");
      expect(rowClick).not.toHaveBeenCalled();
    });

    it("turns the chevron down once expanded", () => {
      const collapsed = metadataCell({ isExpandable: true }, { isExpanded: false });
      expect(collapsed.wrapper.findComponent(VIcon).props("icon")).toBe("mdi:chevron-right");

      const expanded = metadataCell({ isExpandable: true }, { isExpanded: true });
      expect(expanded.wrapper.findComponent(VIcon).props("icon")).toBe("mdi:chevron-down");
    });
  });

  it("renders the pin slot ahead of everything else", () => {
    const { wrapper } = metadataCell({}, {}, { pin: "<i class='pin' />" });
    const content = wrapper.find(".v-table-cell-content");
    expect(content.element.firstElementChild?.classList.contains("pin")).toBe(true);
  });

  it("lets a default slot replace the value, and drops the title with it", () => {
    // Matching VTable's `#cell-<key>` override: a consumer rendering its own
    // markup does not want a native tooltip of the raw value over it.
    const { wrapper } = metadataCell({}, {}, { default: "<a href='#'>Open</a>" });
    expect(wrapper.find(".v-table-cell-text").text()).toBe("Open");
    expect(wrapper.find(".v-table-cell-text span").exists()).toBe(false);
  });

  it("falls back to the passthrough path without a row and column", () => {
    // The total row's branch: it supplies its own markup and must not be
    // double-wrapped.
    const bare = mount(TableCell, {
      props: { align: "right" },
      slots: { default: "<div class='total'>6,691.50</div>" },
      global: { provide: { tableCellMetadata: vi.fn() } },
    });
    expect(bare.find(".v-table-cell-content").exists()).toBe(false);
    expect(bare.find(".total").exists()).toBe(true);
  });

  it("stays in the passthrough path when nothing provided a resolver", () => {
    // A subcomponent mounted outside VTable has no `tableCellMetadata` to inject;
    // rendering the metadata branch against `null` would throw.
    const orphan = mount(TableCell, {
      props: { row: ROW, column: COLUMN, colIndex: 0, rowIndex: 0 },
      slots: { default: "plain" },
    });
    expect(orphan.text()).toBe("plain");
    expect(orphan.find(".v-table-cell-text span").exists()).toBe(false);
  });
});

describe("TableRow", () => {
  it("wraps its slot in the row wrapper", () => {
    const w = mount(TableRow, { slots: { default: "<span>cells</span>" } });
    expect(w.classes()).toContain("v-table-row-wrapper");
    expect(w.find("span").text()).toBe("cells");
  });

  it("renders nothing but the wrapper without a slot", () => {
    expect(mount(TableRow).element.children).toHaveLength(0);
  });
});
