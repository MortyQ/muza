import { nextTick } from "vue";

import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import VTable from "../../../../src/components/table/VTable.vue";
import { makeColumns, makeFixedColumns, makeRows } from "../../../setup/table";
import { applyTheme } from "../../../setup/theme";

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
async function table(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  await applyTheme("light");

  const screen = render(VTable, {
    props: { columns: makeColumns(), data: makeRows(200), height: "400px", ...props },
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
