import { ref } from "vue";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useColumnResize } from "../../../../src/components/table/composables/useColumnResize";
import type { Column } from "../../../../src/components/table/types";
import { withScope } from "../../../setup/scope";
import { makeColumns } from "../../../setup/table";

/**
 * Resize is a drag with global listeners and a rAF throttle, which means three
 * separate ways to lose pixels: a move that never commits, a mouseup that drops
 * the pending frame, and a Map mutated in place so Vue never sees it. All three
 * are covered below.
 *
 * jsdom has no layout, so the DOM-measurement fallback inside `startResize` is
 * driven with an explicit stub rather than a real header cell — the fallback is
 * only reachable for a non-px width that is not "flex", which is a narrow but
 * real case (`width: "20%"`).
 */

const MIN_WIDTH = 100;
const DEFAULT_WIDTH = 150;

function setup(columns: Column[] = makeColumns()) {
  const cols = ref(columns);
  const { result } = withScope(() => useColumnResize(cols));
  return { ...result, cols };
}

/** A mousedown on the resize handle, with the bits `startResize` reads. */
function down(clientX = 0, target?: HTMLElement): MouseEvent {
  const event = new MouseEvent("mousedown", { clientX, bubbles: true });
  Object.defineProperty(event, "target", { value: target ?? document.createElement("div") });
  return event;
}

/** Drive a drag and flush the throttle. */
async function drag(toX: number) {
  document.dispatchEvent(new MouseEvent("mousemove", { clientX: toX }));
  await new Promise(resolve => requestAnimationFrame(() => resolve(null)));
}

describe("useColumnResize", () => {
  beforeEach(() => {
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  });

  afterEach(() => {
    // A test that ends mid-drag would otherwise leave listeners on `document`
    // for the next one to trip over.
    document.dispatchEvent(new MouseEvent("mouseup"));
    vi.restoreAllMocks();
  });

  describe("isColumnResizable", () => {
    it.each([
      ["explicit px", { key: "a", label: "A", width: "120px" }, true],
      ["no width", { key: "a", label: "A" }, true],
      ["flex", { key: "a", label: "A", width: "flex" }, false],
    ] as [string, Column, boolean][])("%s → %s", (_name, column, expected) => {
      expect(setup().isColumnResizable(column)).toBe(expected);
    });
  });

  describe("gridTemplateColumns", () => {
    it("uses each column's declared width", () => {
      expect(setup().gridTemplateColumns.value)
        .toBe("60px 150px 150px 120px 140px");
    });

    it("falls back to the default for a column with no width", () => {
      expect(setup([{ key: "a", label: "A" }]).gridTemplateColumns.value)
        .toBe(`${DEFAULT_WIDTH}px`);
    });

    it("gives a flex column a minmax track", () => {
      expect(setup([{ key: "a", label: "A", width: "flex" }]).gridTemplateColumns.value)
        .toBe(`minmax(${MIN_WIDTH}px, 1fr)`);
    });

    it("passes a non-px width straight through", () => {
      expect(setup([{ key: "a", label: "A", width: "20%" }]).gridTemplateColumns.value)
        .toBe("20%");
    });

    it("prefers a resized width over everything else", async () => {
      const { gridTemplateColumns, startResize } = setup([
        { key: "a", label: "A", width: "120px" },
      ]);
      startResize("a", down(0));
      await drag(80);

      expect(gridTemplateColumns.value).toBe("200px");
    });

    it("recomputes when the columns change", () => {
      const { gridTemplateColumns, cols } = setup();
      cols.value = [{ key: "z", label: "Z", width: "10px" }];
      expect(gridTemplateColumns.value).toBe("10px");
    });

    it("is an empty string for no columns", () => {
      expect(setup([]).gridTemplateColumns.value).toBe("");
    });
  });

  describe("getGridTemplateWithCheckbox", () => {
    it("prepends a 50px track by default", () => {
      expect(setup([{ key: "a", label: "A", width: "120px" }]).getGridTemplateWithCheckbox())
        .toBe("50px 120px");
    });

    it("takes a custom width", () => {
      expect(setup([{ key: "a", label: "A", width: "120px" }]).getGridTemplateWithCheckbox(32))
        .toBe("32px 120px");
    });
  });

  describe("startResize", () => {
    it("flips the resizing flag", () => {
      const { startResize, isResizing } = setup();
      expect(isResizing.value).toBe(false);

      startResize("id", down(0));
      expect(isResizing.value).toBe(true);
    });

    it("suppresses the browser's own drag handling", () => {
      const { startResize } = setup();
      const event = down(0);
      const prevent = vi.spyOn(event, "preventDefault");
      const stop = vi.spyOn(event, "stopPropagation");

      startResize("id", event);
      expect(prevent).toHaveBeenCalled();
      expect(stop).toHaveBeenCalled();
    });

    it("takes over the cursor and disables text selection", () => {
      const { startResize } = setup();
      startResize("id", down(0));

      expect(document.body.style.cursor).toBe("col-resize");
      expect(document.body.style.userSelect).toBe("none");
    });

    it("ignores a flex column", () => {
      const { startResize, isResizing } = setup([{ key: "a", label: "A", width: "flex" }]);
      startResize("a", down(0));
      expect(isResizing.value).toBe(false);
    });

    it("ignores a key that matches no column", () => {
      const { startResize, isResizing } = setup();
      startResize("nope", down(0));
      expect(isResizing.value).toBe(false);
    });

    it("starts from the declared px width", async () => {
      const { startResize, resizedWidths } = setup();
      startResize("id", down(0)); // 60px
      await drag(40);
      expect(resizedWidths.value.get("id")).toBe(100);
    });

    it("starts from the default width when the column declares none", async () => {
      const { startResize, resizedWidths } = setup([{ key: "a", label: "A" }]);
      startResize("a", down(0));
      await drag(50);
      expect(resizedWidths.value.get("a")).toBe(DEFAULT_WIDTH + 50);
    });

    it("starts from the stored width on a second drag", async () => {
      const { startResize, resizedWidths } = setup();
      startResize("id", down(0));
      await drag(140); // 60 → 200
      document.dispatchEvent(new MouseEvent("mouseup"));

      startResize("id", down(0));
      await drag(50);
      expect(resizedWidths.value.get("id")).toBe(250);
    });

    it("measures the header cell for a non-px width", async () => {
      const header = document.createElement("div");
      header.setAttribute("role", "columnheader");
      Object.defineProperty(header, "offsetWidth", { value: 333 });
      const handle = document.createElement("span");
      header.appendChild(handle);
      document.body.appendChild(header);

      const { startResize, resizedWidths } = setup([{ key: "a", label: "A", width: "20%" }]);
      startResize("a", down(0, handle));
      await drag(10);

      expect(resizedWidths.value.get("a")).toBe(343);
    });

    it("falls back to the default width when there is no header cell to measure", async () => {
      const { startResize, resizedWidths } = setup([{ key: "a", label: "A", width: "20%" }]);
      startResize("a", down(0));
      await drag(10);
      expect(resizedWidths.value.get("a")).toBe(DEFAULT_WIDTH + 10);
    });
  });

  describe("dragging", () => {
    it("widens as the pointer moves right", async () => {
      const { startResize, resizedWidths } = setup();
      startResize("revenue", down(100)); // 120px
      await drag(180);
      expect(resizedWidths.value.get("revenue")).toBe(200);
    });

    it("narrows as the pointer moves left", async () => {
      const { startResize, resizedWidths } = setup();
      startResize("revenue", down(100));
      await drag(90);
      expect(resizedWidths.value.get("revenue")).toBe(110);
    });

    it("clamps at the minimum width", async () => {
      const { startResize, resizedWidths } = setup();
      startResize("revenue", down(100));
      await drag(-500);
      expect(resizedWidths.value.get("revenue")).toBe(MIN_WIDTH);
    });

    it("collapses several moves in one frame into a single commit", async () => {
      const { startResize, resizedWidths } = setup();
      startResize("revenue", down(0));

      const seen: number[] = [];
      for (const x of [10, 20, 30]) {
        document.dispatchEvent(new MouseEvent("mousemove", { clientX: x }));
        seen.push(resizedWidths.value.get("revenue") ?? 0);
      }
      await new Promise(resolve => requestAnimationFrame(() => resolve(null)));

      // Nothing was written while the frame was pending…
      expect(seen).toEqual([0, 0, 0]);
      // …and the commit carries the last position, not the first.
      expect(resizedWidths.value.get("revenue")).toBe(150);
    });

    it("replaces the Map so Vue sees the change", async () => {
      const { startResize, resizedWidths } = setup();
      const before = resizedWidths.value;

      startResize("revenue", down(0));
      await drag(10);

      expect(resizedWidths.value).not.toBe(before);
    });

    it("keeps other columns' widths across a drag", async () => {
      const { startResize, resizedWidths } = setup();
      startResize("id", down(0));
      await drag(40);
      document.dispatchEvent(new MouseEvent("mouseup"));

      startResize("revenue", down(0));
      await drag(10);

      expect(resizedWidths.value.get("id")).toBe(100);
      expect(resizedWidths.value.get("revenue")).toBe(130);
    });

    it("ignores moves when no drag is in progress", async () => {
      const { resizedWidths } = setup();
      await drag(200);
      expect(resizedWidths.value.size).toBe(0);
    });
  });

  describe("stopResize", () => {
    it("clears the resizing flag", () => {
      const { startResize, isResizing } = setup();
      startResize("id", down(0));
      document.dispatchEvent(new MouseEvent("mouseup"));
      expect(isResizing.value).toBe(false);
    });

    it("restores the cursor and text selection", () => {
      const { startResize } = setup();
      startResize("id", down(0));
      document.dispatchEvent(new MouseEvent("mouseup"));

      expect(document.body.style.cursor).toBe("");
      expect(document.body.style.userSelect).toBe("");
    });

    it("flushes a frame that was still pending", () => {
      // The last few pixels of a fast drag land in a rAF that has not fired
      // when the button comes up. Without the flush they are simply lost.
      const { startResize, resizedWidths } = setup();
      startResize("revenue", down(0));
      document.dispatchEvent(new MouseEvent("mousemove", { clientX: 55 }));

      expect(resizedWidths.value.get("revenue")).toBeUndefined();
      document.dispatchEvent(new MouseEvent("mouseup"));
      expect(resizedWidths.value.get("revenue")).toBe(175);
    });

    it("stops listening, so a later move changes nothing", async () => {
      const { startResize, resizedWidths } = setup();
      startResize("revenue", down(0));
      await drag(10);
      document.dispatchEvent(new MouseEvent("mouseup"));

      await drag(400);
      expect(resizedWidths.value.get("revenue")).toBe(130);
    });
  });

  describe("autoFitColumn", () => {
    it("drops the stored width, restoring the declared one", async () => {
      const { startResize, autoFitColumn, resizedWidths, gridTemplateColumns } = setup();
      startResize("id", down(0));
      await drag(100);
      document.dispatchEvent(new MouseEvent("mouseup"));

      autoFitColumn("id");
      expect(resizedWidths.value.has("id")).toBe(false);
      expect(gridTemplateColumns.value.startsWith("60px")).toBe(true);
    });

    it("leaves other columns alone", async () => {
      const { startResize, autoFitColumn, resizedWidths } = setup();
      startResize("id", down(0));
      await drag(100);
      document.dispatchEvent(new MouseEvent("mouseup"));
      startResize("revenue", down(0));
      await drag(100);
      document.dispatchEvent(new MouseEvent("mouseup"));

      autoFitColumn("id");
      expect(resizedWidths.value.get("revenue")).toBe(220);
    });

    it("is safe on a column that was never resized", () => {
      const { autoFitColumn, resizedWidths } = setup();
      autoFitColumn("id");
      expect(resizedWidths.value.size).toBe(0);
    });

    it("replaces the Map", () => {
      const { resizedWidths, autoFitColumn } = setup();
      const before = resizedWidths.value;
      autoFitColumn("id");
      expect(resizedWidths.value).not.toBe(before);
    });
  });

  describe("resetWidths", () => {
    it("clears every stored width", async () => {
      const { startResize, resetWidths, resizedWidths } = setup();
      startResize("id", down(0));
      await drag(100);
      document.dispatchEvent(new MouseEvent("mouseup"));

      resetWidths();
      expect(resizedWidths.value.size).toBe(0);
    });

    it("puts the grid template back to the declared widths", async () => {
      const { startResize, resetWidths, gridTemplateColumns } = setup();
      const original = gridTemplateColumns.value;

      startResize("id", down(0));
      await drag(100);
      document.dispatchEvent(new MouseEvent("mouseup"));
      resetWidths();

      expect(gridTemplateColumns.value).toBe(original);
    });
  });

  describe("getColumnWidth", () => {
    it("returns a stored width as a number", async () => {
      const { startResize, getColumnWidth } = setup();
      startResize("id", down(0));
      await drag(40);
      expect(getColumnWidth("id")).toBe(100);
    });

    it("returns the declared width verbatim", () => {
      expect(setup().getColumnWidth("id")).toBe("60px");
    });

    it("returns the default for a column with no width", () => {
      expect(setup([{ key: "a", label: "A" }]).getColumnWidth("a")).toBe(DEFAULT_WIDTH);
    });

    it("returns a minmax track for a flex column", () => {
      expect(setup([{ key: "a", label: "A", width: "flex" }]).getColumnWidth("a"))
        .toBe(`minmax(${MIN_WIDTH}px, 1fr)`);
    });

    it("returns the default for an unknown key", () => {
      expect(setup().getColumnWidth("nope")).toBe(DEFAULT_WIDTH);
    });
  });
});
