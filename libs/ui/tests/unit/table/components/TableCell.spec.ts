import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import TableCell from "../../../../src/components/table/components/TableCell.vue";
import TableRow from "../../../../src/components/table/components/TableRow.vue";

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
