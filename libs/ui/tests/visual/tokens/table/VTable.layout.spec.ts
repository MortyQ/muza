import { h, nextTick, type Slot } from "vue";

import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import TablePagination from "../../../../src/components/table/components/TablePagination.vue";
import { DEFAULT_ROW_HEIGHT } from "../../../../src/components/table/constants";
import VTable from "../../../../src/components/table/VTable.vue";
import { makeColumns, makeFixedColumns, makeRows, makeTreeRows } from "../../../setup/table";
import { applyTheme } from "../../../setup/theme";
import { tokenAsValue } from "../../../setup/tokens";

/**
 * Everything jsdom cannot answer because it has no layout: the virtualizer's
 * render window, the sticky offsets that keep pinned columns from overlapping,
 * and a resize drag that starts from a measured width.
 *
 * The unit project covers the same composables' arithmetic in isolation. What
 * is new here is that the numbers land on real elements in a real engine —
 * `rowsToRender` returns nothing at all until a scroll container reports a
 * size, so none of this is reachable anywhere else.
 */

const frame = () => new Promise(resolve => requestAnimationFrame(() => resolve(null)));

/**
 * Rendered in place, not moved into a sized host: re-parenting the wrapper
 * after mount invalidates the rect TanStack Virtual measured on its first
 * frame, and the window silently collapses to zero rows.
 */
async function table(
  props: Record<string, unknown> = {},
  slots: Record<string, Slot> = {},
): Promise<HTMLElement> {
  await applyTheme("light");

  const screen = render(VTable, {
    props: { columns: makeColumns(), data: makeRows(200), height: "400px", ...props },
    slots,
  });

  await nextTick();
  await frame();
  await frame();
  return screen.container as HTMLElement;
}

const rows = (el: HTMLElement) => el.querySelectorAll(".v-table-row-wrapper");
const scroller = (el: HTMLElement) =>
  el.querySelector(".v-table-scroll-container") as HTMLElement;

describe("VTable — virtualization", () => {
  it("renders a window, not the whole dataset", async () => {
    const el = await table();
    const rendered = rows(el).length;

    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(200);
  });

  it("sizes the spacer for the rows it did not render", async () => {
    const el = await table({ rowHeight: 50 });
    const spacers = el.querySelectorAll(".v-table-virtual-spacer");

    expect(spacers.length).toBeGreaterThan(0);
    const trailing = spacers[spacers.length - 1] as HTMLElement;
    expect(Number.parseFloat(trailing.style.height)).toBeGreaterThan(0);
  });

  it("swaps the window as the container scrolls", async () => {
    const el = await table();
    const first = rows(el)[0].textContent;

    scroller(el).scrollTop = 2000;
    scroller(el).dispatchEvent(new Event("scroll"));
    await frame();
    await frame();

    expect(rows(el)[0].textContent).not.toBe(first);
  });

  it("renders every row when virtualization is off", async () => {
    const el = await table({ virtualized: false, data: makeRows(30) });
    expect(rows(el)).toHaveLength(30);
  });

  it("renders no spacers when virtualization is off", async () => {
    const el = await table({ virtualized: false, data: makeRows(30) });
    expect(el.querySelectorAll(".v-table-virtual-spacer")).toHaveLength(0);
  });

  it("keeps the header visible while the body scrolls", async () => {
    const el = await table();
    const header = el.querySelector(".v-table-header-cell") as HTMLElement;
    const topBefore = header.getBoundingClientRect().top;

    scroller(el).scrollTop = 1500;
    scroller(el).dispatchEvent(new Event("scroll"));
    await frame();

    expect(header.getBoundingClientRect().top).toBeCloseTo(topBefore, 0);
  });
});

describe("VTable — row height", () => {
  // The virtualizer is told a height and never measures, so a row the browser
  // draws any taller or shorter than that number shifts every row below it.
  const cellHeights = (el: HTMLElement) =>
    Array.from(el.querySelectorAll(".v-table-row-wrapper > *"))
      .map(cell => cell.getBoundingClientRect().height);

  it("stands every virtual row at the default height", async () => {
    const heights = cellHeights(await table());

    expect(heights.length).toBeGreaterThan(0);
    for (const height of heights) expect(height).toBeCloseTo(DEFAULT_ROW_HEIGHT, 0);
  });

  it("stands every virtual row at the rowHeight it is given", async () => {
    const heights = cellHeights(await table({ rowHeight: 36 }));

    expect(heights.length).toBeGreaterThan(0);
    for (const height of heights) expect(height).toBeCloseTo(36, 0);
  });

  it("does not let a tall cell grow a virtual row", async () => {
    const tall = () => h("div", { style: { height: "72px" } }, "tall");
    const heights = cellHeights(await table({}, { "cell-name": tall }));

    for (const height of heights) expect(height).toBeCloseTo(DEFAULT_ROW_HEIGHT, 0);
  });

  it("scrolls exactly as far as the virtualizer counted", async () => {
    const el = await table({ rowHeight: 36 });
    const header = (el.querySelector(".v-table-header-cell") as HTMLElement)
      .getBoundingClientRect().height;

    expect(scroller(el).scrollHeight).toBeCloseTo(header + 200 * 36, 0);
  });
});

describe("VTable — compact scale", () => {
  // Every size below is derived from the row, and the row from the control it
  // has to hold — so a change to the control scale moves the whole table.
  const px = (token: string) => Number.parseFloat(tokenAsValue("height", token));
  const heightOf = (node: Element | null) => (node as HTMLElement).getBoundingClientRect().height;
  const cellHeights = (el: HTMLElement) =>
    Array.from(el.querySelectorAll(".v-table-row-wrapper > *")).map(heightOf);

  it("stands the default row at the large control height", () => {
    expect(DEFAULT_ROW_HEIGHT).toBe(px("--ui-control-h-lg"));
  });

  it("stands the header one step below the row", async () => {
    const el = await table();
    expect(heightOf(el.querySelector(".v-table-header-cell")))
      .toBeCloseTo(DEFAULT_ROW_HEIGHT - px("--ui-space-xs"), 0);
  });

  it("follows a denser rowHeight with the header", async () => {
    const el = await table({ rowHeight: 32 });
    expect(heightOf(el.querySelector(".v-table-header-cell")))
      .toBeCloseTo(32 - px("--ui-space-xs"), 0);
  });

  it("sets body and header text on the type scale", async () => {
    const el = await table();
    const size = (selector: string) =>
      getComputedStyle(el.querySelector(selector) as HTMLElement).fontSize;

    expect(size(".v-table-row-wrapper > .v-table-cell"))
      .toBe(tokenAsValue("font-size", "--ui-text-base"));
    expect(size(".v-table-header-cell")).toBe(tokenAsValue("font-size", "--ui-text-xs"));
  });

  it("stands a plain row at the row height without virtualization", async () => {
    const heights = cellHeights(await table({ virtualized: false, data: makeRows(5) }));
    for (const height of heights) expect(height).toBeCloseTo(DEFAULT_ROW_HEIGHT, 0);
  });

  it("fits a control in an interactive cell without growing the row", async () => {
    const control = () => h("div", { style: { height: "var(--ui-control-h)" } }, "control");
    const el = await table(
      {
        virtualized: false,
        data: makeRows(5),
        columns: makeColumns({ name: { interactive: true } }),
      },
      { "cell-name": control },
    );
    for (const height of cellHeights(el)) expect(height).toBeCloseTo(DEFAULT_ROW_HEIGHT, 0);
  });

  it("makes the checkbox column as wide as the row is tall", async () => {
    const el = await table({
      virtualized: false,
      data: makeRows(3),
      multiSelect: { enabled: true },
    });
    const grid = el.querySelector(".v-table-grid") as HTMLElement;
    const first = Number.parseFloat(getComputedStyle(grid).gridTemplateColumns.split(" ")[0]);

    expect(first).toBeCloseTo(DEFAULT_ROW_HEIGHT, 0);
  });

  it("stands every pagination control at the control height", async () => {
    const screen = render(TablePagination, {
      props: { page: 2, pageSize: 10, total: 100, showSizeChanger: true },
    });
    await nextTick();
    const el = screen.container as HTMLElement;
    const controls = [
      ...el.querySelectorAll(".v-table-pagination-btn"),
      el.querySelector(".v-table-pagination-size .multiselect__tags"),
    ];

    expect(controls.length).toBeGreaterThan(2);
    for (const control of controls) expect(heightOf(control)).toBeCloseTo(px("--ui-control-h"), 0);
  });

  it("starts a nested leaf's text under its parent's text", async () => {
    // The tree indents the first column only, so `name` goes first.
    const el = await table({
      virtualized: false,
      data: makeTreeRows(),
      columns: makeColumns().slice(1),
    });
    (el.querySelector(".v-table-cell-expand-btn") as HTMLElement).click();
    await nextTick();
    await frame();

    const textLeft = (label: string) => {
      const node = Array.from(el.querySelectorAll(".v-table-cell-text"))
        .find(n => n.textContent?.trim() === label) as HTMLElement;
      return node.getBoundingClientRect().left;
    };
    expect(textLeft("Alpha / Two")).toBeCloseTo(textLeft("Alpha"), 0);
  });
});

describe("VTable — sticky columns", () => {
  it("holds a pinned column in place while the body scrolls sideways", async () => {
    const el = await table({ columns: makeFixedColumns(), virtualized: false, data: makeRows(5) });
    const pinned = el.querySelector(".v-table-fixed-left") as HTMLElement;
    const leftBefore = pinned.getBoundingClientRect().left;

    scroller(el).scrollLeft = 200;
    await frame();

    expect(pinned.getBoundingClientRect().left).toBeCloseTo(leftBefore, 0);
  });

  it("offsets the second pinned column so the two do not overlap", async () => {
    const el = await table({ columns: makeFixedColumns(), virtualized: false, data: makeRows(5) });
    const [first, second] = Array.from(el.querySelectorAll(".v-table-header-cell.v-table-fixed-left"));

    const a = first.getBoundingClientRect();
    const b = second.getBoundingClientRect();
    expect(b.left).toBeGreaterThanOrEqual(a.right - 1);
  });

  it("pins the right-hand column to the right edge", async () => {
    const el = await table({ columns: makeFixedColumns(), virtualized: false, data: makeRows(5) });
    const right = el.querySelector(".v-table-header-cell.v-table-fixed-right") as HTMLElement;
    const rightBefore = right.getBoundingClientRect().right;

    scroller(el).scrollLeft = 200;
    await frame();

    expect(right.getBoundingClientRect().right).toBeCloseTo(rightBefore, 0);
  });

  it("lifts pinned cells above their neighbours", async () => {
    const el = await table({ columns: makeFixedColumns(), virtualized: false, data: makeRows(5) });
    const pinned = el.querySelector(".v-table-header-cell.v-table-fixed-left") as HTMLElement;
    const normal = el.querySelectorAll(".v-table-header-cell")[2] as HTMLElement;

    const z = (node: HTMLElement) => Number.parseInt(getComputedStyle(node).zIndex, 10) || 0;
    expect(z(pinned)).toBeGreaterThan(z(normal));
  });
});

describe("VTable — column resize", () => {
  async function dragHandle(el: HTMLElement, index: number, byX: number) {
    const handle = el.querySelectorAll(".v-table-resize-handle")[index] as HTMLElement;
    const start = handle.getBoundingClientRect().left;

    handle.dispatchEvent(new MouseEvent("mousedown", { clientX: start, bubbles: true }));
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: start + byX }));
    await frame();
    document.dispatchEvent(new MouseEvent("mouseup"));
    await nextTick();
  }

  it("widens the column the handle belongs to", async () => {
    const el = await table({ virtualized: false, data: makeRows(3) });
    const cell = () => el.querySelectorAll(".v-table-header-cell")[0] as HTMLElement;
    const before = cell().getBoundingClientRect().width;

    await dragHandle(el, 0, 80);

    expect(cell().getBoundingClientRect().width).toBeGreaterThan(before);
  });

  it("leaves the other columns' widths alone", async () => {
    const el = await table({ virtualized: false, data: makeRows(3) });
    const other = () => el.querySelectorAll(".v-table-header-cell")[3] as HTMLElement;
    const before = other().getBoundingClientRect().width;

    await dragHandle(el, 0, 80);

    expect(other().getBoundingClientRect().width).toBeCloseTo(before, 0);
  });

  it("clamps at the minimum width rather than collapsing", async () => {
    const el = await table({ virtualized: false, data: makeRows(3) });
    const cell = () => el.querySelectorAll(".v-table-header-cell")[0] as HTMLElement;

    await dragHandle(el, 0, -400);

    expect(cell().getBoundingClientRect().width).toBeGreaterThanOrEqual(99);
  });

  it("restores the declared width on a double-click", async () => {
    const el = await table({ virtualized: false, data: makeRows(3) });
    const cell = () => el.querySelectorAll(".v-table-header-cell")[0] as HTMLElement;
    const original = cell().getBoundingClientRect().width;

    await dragHandle(el, 0, 80);
    expect(cell().getBoundingClientRect().width).toBeGreaterThan(original);

    const handle = el.querySelectorAll(".v-table-resize-handle")[0] as HTMLElement;
    handle.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    await nextTick();

    expect(cell().getBoundingClientRect().width).toBeCloseTo(original, 0);
  });

  it("takes over the cursor for the duration of the drag", async () => {
    const el = await table({ virtualized: false, data: makeRows(3) });
    const handle = el.querySelectorAll(".v-table-resize-handle")[0] as HTMLElement;

    handle.dispatchEvent(new MouseEvent("mousedown", { clientX: 100, bubbles: true }));
    expect(document.body.style.cursor).toBe("col-resize");

    document.dispatchEvent(new MouseEvent("mouseup"));
    expect(document.body.style.cursor).toBe("");
  });
});

describe("VTable — grid geometry", () => {
  it("gives every column its declared track width", async () => {
    const el = await table({ virtualized: false, data: makeRows(3) });
    const grid = el.querySelector(".v-table-grid") as HTMLElement;
    const tracks = getComputedStyle(grid).gridTemplateColumns.split(" ").map(Number.parseFloat);

    expect(tracks).toHaveLength(5);
    expect(tracks[0]).toBeCloseTo(60, 0);
    expect(tracks[3]).toBeCloseTo(120, 0);
  });

  it("prepends a track for the checkbox column", async () => {
    const el = await table({
      virtualized: false,
      data: makeRows(3),
      multiSelect: { enabled: true },
    });
    const grid = el.querySelector(".v-table-grid") as HTMLElement;

    expect(getComputedStyle(grid).gridTemplateColumns.split(" ")).toHaveLength(6);
  });

  it("keeps the total row on the bottom edge while scrolling", async () => {
    const el = await table({ totalRow: { id: "", name: "Total", revenue: 1 } });
    const total = el.querySelector(".v-table-total-cell") as HTMLElement;
    const bottomBefore = total.getBoundingClientRect().bottom;

    scroller(el).scrollTop = 1500;
    scroller(el).dispatchEvent(new Event("scroll"));
    await frame();

    expect(total.getBoundingClientRect().bottom).toBeCloseTo(bottomBefore, 0);
  });
});
