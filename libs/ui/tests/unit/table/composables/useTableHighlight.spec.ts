import { ref } from "vue";

import { describe, expect, it, vi } from "vitest";

import {
  normalizeHighlight,
  useTableHighlight,
  type NormalizedHighlightConfig,
} from "../../../../src/components/table/composables/useTableHighlight";
import type { HighlightConfig } from "../../../../src/components/table/types";
import { withScope } from "../../../setup/scope";

/**
 * The pinned cross: at most one row and at most one column, each toggled
 * independently. Two things are easy to get wrong and both are asserted below —
 * the axis guards (a table with `{ column: false }` must ignore a column pin
 * arriving from a linked table, not apply it), and the fact that `applyRemote`
 * must never call back, or two linked tables ping-pong forever.
 */

const ALL: NormalizedHighlightConfig = { enabled: true, row: true, column: true };

function setup(
  config: NormalizedHighlightConfig = ALL,
  onChange = vi.fn(),
) {
  const cfg = ref(config);
  const { result } = withScope(() => useTableHighlight({ config: cfg, onChange }));
  return { ...result, cfg, onChange };
}

describe("normalizeHighlight", () => {
  it.each([
    ["undefined", undefined, { enabled: false, row: false, column: false }],
    ["false", false, { enabled: false, row: false, column: false }],
    ["true", true, { enabled: true, row: true, column: true }],
    ["{}", {}, { enabled: true, row: true, column: true }],
    ["{ row: false }", { row: false }, { enabled: true, row: false, column: true }],
    ["{ column: false }", { column: false }, { enabled: true, row: true, column: false }],
    ["both false", { row: false, column: false }, { enabled: true, row: false, column: false }],
  ] as [string, boolean | HighlightConfig | undefined, NormalizedHighlightConfig][])(
    "%s → %o",
    (_name, input, expected) => {
      expect(normalizeHighlight(input)).toEqual(expected);
    },
  );

  it("treats the object's presence as `enabled`, with no field for it", () => {
    // There is deliberately no `enabled` key on HighlightConfig — passing an
    // object is the opt-in. A config that could say `{ enabled: false }` would
    // give two ways to express "off" and they would eventually disagree.
    expect(normalizeHighlight({ row: false, column: false }).enabled).toBe(true);
  });
});

describe("useTableHighlight", () => {
  describe("initial state", () => {
    it("starts unpinned on both axes", () => {
      const { pinnedRowId, pinnedColumnKey, hasPin } = setup();
      expect(pinnedRowId.value).toBeNull();
      expect(pinnedColumnKey.value).toBeNull();
      expect(hasPin.value).toBe(false);
    });

    it("reports nothing as pinned", () => {
      const { isRowPinned, isColumnPinned } = setup();
      expect(isRowPinned(1)).toBe(false);
      expect(isColumnPinned("name")).toBe(false);
    });
  });

  describe("toggleRow", () => {
    it("pins a row", () => {
      const { toggleRow, pinnedRowId, isRowPinned, hasPin } = setup();
      toggleRow(3);
      expect(pinnedRowId.value).toBe(3);
      expect(isRowPinned(3)).toBe(true);
      expect(hasPin.value).toBe(true);
    });

    it("unpins when the same row is toggled again", () => {
      const { toggleRow, pinnedRowId } = setup();
      toggleRow(3);
      toggleRow(3);
      expect(pinnedRowId.value).toBeNull();
    });

    it("moves the pin when a different row is toggled", () => {
      const { toggleRow, pinnedRowId } = setup();
      toggleRow(3);
      toggleRow(4);
      expect(pinnedRowId.value).toBe(4);
    });

    it("accepts a string id", () => {
      const { toggleRow, isRowPinned } = setup();
      toggleRow("abc");
      expect(isRowPinned("abc")).toBe(true);
    });

    it("does not confuse 1 with \"1\"", () => {
      const { toggleRow, isRowPinned } = setup();
      toggleRow(1);
      expect(isRowPinned("1")).toBe(false);
    });

    it("reports an undefined id as unpinned even while a row is pinned", () => {
      // Rows without an `id` exist — they must never light up alongside a pin.
      const { toggleRow, isRowPinned } = setup();
      toggleRow(3);
      expect(isRowPinned(undefined)).toBe(false);
    });

    it("notifies with the full coordinate", () => {
      const { toggleRow, onChange } = setup();
      toggleRow(3);
      expect(onChange).toHaveBeenCalledWith({ rowId: 3, columnKey: null });
    });

    it("is a no-op when highlight is off", () => {
      const { toggleRow, pinnedRowId, onChange }
        = setup({ enabled: false, row: true, column: true });
      toggleRow(3);
      expect(pinnedRowId.value).toBeNull();
      expect(onChange).not.toHaveBeenCalled();
    });

    it("is a no-op when the row axis is off", () => {
      const { toggleRow, pinnedRowId, onChange }
        = setup({ enabled: true, row: false, column: true });
      toggleRow(3);
      expect(pinnedRowId.value).toBeNull();
      expect(onChange).not.toHaveBeenCalled();
    });

    it("reads the config at call time, not at setup time", () => {
      const { toggleRow, pinnedRowId, cfg } = setup({ enabled: true, row: false, column: true });
      toggleRow(3);
      expect(pinnedRowId.value).toBeNull();

      cfg.value = ALL;
      toggleRow(3);
      expect(pinnedRowId.value).toBe(3);
    });
  });

  describe("toggleColumn", () => {
    it("pins a column", () => {
      const { toggleColumn, pinnedColumnKey, isColumnPinned } = setup();
      toggleColumn("revenue");
      expect(pinnedColumnKey.value).toBe("revenue");
      expect(isColumnPinned("revenue")).toBe(true);
    });

    it("unpins on a second toggle of the same key", () => {
      const { toggleColumn, pinnedColumnKey } = setup();
      toggleColumn("revenue");
      toggleColumn("revenue");
      expect(pinnedColumnKey.value).toBeNull();
    });

    it("is a no-op when the column axis is off", () => {
      const { toggleColumn, pinnedColumnKey } = setup({ enabled: true, row: true, column: false });
      toggleColumn("revenue");
      expect(pinnedColumnKey.value).toBeNull();
    });

    it("notifies with the full coordinate", () => {
      const { toggleColumn, onChange } = setup();
      toggleColumn("revenue");
      expect(onChange).toHaveBeenCalledWith({ rowId: null, columnKey: "revenue" });
    });
  });

  describe("the two axes are independent", () => {
    it("holds a row and a column at once", () => {
      const { toggleRow, toggleColumn, pinnedRowId, pinnedColumnKey } = setup();
      toggleRow(3);
      toggleColumn("revenue");
      expect(pinnedRowId.value).toBe(3);
      expect(pinnedColumnKey.value).toBe("revenue");
    });

    it("unpinning one leaves the other", () => {
      const { toggleRow, toggleColumn, pinnedRowId, pinnedColumnKey, hasPin } = setup();
      toggleRow(3);
      toggleColumn("revenue");
      toggleRow(3);

      expect(pinnedRowId.value).toBeNull();
      expect(pinnedColumnKey.value).toBe("revenue");
      expect(hasPin.value).toBe(true);
    });
  });

  describe("unpinRow / unpinColumn", () => {
    it("clears the row and notifies", () => {
      const { toggleRow, unpinRow, pinnedRowId, onChange } = setup();
      toggleRow(3);
      onChange.mockClear();

      unpinRow();
      expect(pinnedRowId.value).toBeNull();
      expect(onChange).toHaveBeenCalledWith({ rowId: null, columnKey: null });
    });

    it("does not notify when there was no row pin", () => {
      const { unpinRow, onChange } = setup();
      unpinRow();
      expect(onChange).not.toHaveBeenCalled();
    });

    it("clears the column and notifies", () => {
      const { toggleColumn, unpinColumn, pinnedColumnKey, onChange } = setup();
      toggleColumn("revenue");
      onChange.mockClear();

      unpinColumn();
      expect(pinnedColumnKey.value).toBeNull();
      expect(onChange).toHaveBeenCalled();
    });

    it("does not notify when there was no column pin", () => {
      const { unpinColumn, onChange } = setup();
      unpinColumn();
      expect(onChange).not.toHaveBeenCalled();
    });

    it("ignores the axis guards — an unpin is always allowed", () => {
      // Turning an axis off must not strand a pin that was set while it was on.
      const { toggleRow, cfg, unpinRow, pinnedRowId } = setup();
      toggleRow(3);
      cfg.value = { enabled: true, row: false, column: true };

      unpinRow();
      expect(pinnedRowId.value).toBeNull();
    });
  });

  describe("clear", () => {
    it("drops both axes at once", () => {
      const { toggleRow, toggleColumn, clear, hasPin } = setup();
      toggleRow(3);
      toggleColumn("revenue");

      clear();
      expect(hasPin.value).toBe(false);
    });

    it("notifies once", () => {
      const { toggleRow, clear, onChange } = setup();
      toggleRow(3);
      onChange.mockClear();

      clear();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith({ rowId: null, columnKey: null });
    });

    it("is free to call when nothing is pinned", () => {
      const { clear, onChange } = setup();
      clear();
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("applyRemote", () => {
    it("applies both axes", () => {
      const { applyRemote, pinnedRowId, pinnedColumnKey } = setup();
      applyRemote({ rowId: 5, columnKey: "status" });
      expect(pinnedRowId.value).toBe(5);
      expect(pinnedColumnKey.value).toBe("status");
    });

    it("never notifies, so linked tables cannot bounce", () => {
      const { applyRemote, onChange } = setup();
      applyRemote({ rowId: 5, columnKey: "status" });
      expect(onChange).not.toHaveBeenCalled();
    });

    it("drops an axis this table does not support", () => {
      const { applyRemote, pinnedRowId, pinnedColumnKey }
        = setup({ enabled: true, row: true, column: false });

      applyRemote({ rowId: 5, columnKey: "status" });
      expect(pinnedRowId.value).toBe(5);
      expect(pinnedColumnKey.value).toBeNull();
    });

    it("does nothing at all when highlight is off", () => {
      const { applyRemote, pinnedRowId, pinnedColumnKey }
        = setup({ enabled: false, row: true, column: true });

      applyRemote({ rowId: 5, columnKey: "status" });
      expect(pinnedRowId.value).toBeNull();
      expect(pinnedColumnKey.value).toBeNull();
    });

    it("overwrites rather than merges", () => {
      const { toggleRow, toggleColumn, applyRemote, pinnedRowId, pinnedColumnKey } = setup();
      toggleRow(3);
      toggleColumn("revenue");

      applyRemote({ rowId: 9, columnKey: null });
      expect(pinnedRowId.value).toBe(9);
      expect(pinnedColumnKey.value).toBeNull();
    });
  });

  describe("setPin", () => {
    it("applies both axes and notifies, like a click would", () => {
      const { setPin, pinnedRowId, pinnedColumnKey, onChange } = setup();
      setPin({ rowId: 5, columnKey: "status" });

      expect(pinnedRowId.value).toBe(5);
      expect(pinnedColumnKey.value).toBe("status");
      expect(onChange).toHaveBeenCalledWith({ rowId: 5, columnKey: "status" });
    });

    it("honours the axis guards", () => {
      const { setPin, pinnedColumnKey, onChange }
        = setup({ enabled: true, row: true, column: false });

      setPin({ rowId: 5, columnKey: "status" });
      expect(pinnedColumnKey.value).toBeNull();
      expect(onChange).toHaveBeenCalledWith({ rowId: 5, columnKey: null });
    });

    it("does nothing when highlight is off", () => {
      const { setPin, pinnedRowId, onChange }
        = setup({ enabled: false, row: true, column: true });

      setPin({ rowId: 5, columnKey: "status" });
      expect(pinnedRowId.value).toBeNull();
      expect(onChange).not.toHaveBeenCalled();
    });

    it("clears by pinning nothing", () => {
      const { toggleRow, setPin, hasPin } = setup();
      toggleRow(3);

      setPin({ rowId: null, columnKey: null });
      expect(hasPin.value).toBe(false);
    });
  });

  it("works without an onChange callback", () => {
    const cfg = ref(ALL);
    const { result } = withScope(() => useTableHighlight({ config: cfg }));

    expect(() => result.toggleRow(1)).not.toThrow();
    expect(result.pinnedRowId.value).toBe(1);
  });

  it("accepts a getter for the config", () => {
    const enabled = ref(false);
    const { result } = withScope(() => useTableHighlight({
      config: () => ({ enabled: enabled.value, row: true, column: true }),
    }));

    result.toggleRow(1);
    expect(result.pinnedRowId.value).toBeNull();

    enabled.value = true;
    result.toggleRow(1);
    expect(result.pinnedRowId.value).toBe(1);
  });
});
