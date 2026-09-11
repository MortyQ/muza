import { ref } from "vue";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  useTableColumnConfig,
  type UseTableColumnConfigOptions,
} from "../../../../src/components/table/composables/useTableColumnConfig";
import type { Column } from "../../../../src/components/table/types/index";
import type { ToolbarConfig } from "../../../../src/components/table/types/toolbar";
import { writeColumnState } from "../../../../src/components/table/utils/columnState";
import tableStorage from "../../../../src/components/table/utils/storage";
import { withScope } from "../../../setup/scope";

type Row = Record<string, unknown>;
type Actions = NonNullable<ToolbarConfig["actions"]>;

const COLUMNS: Column<Row>[] = [
  { key: "id", label: "ID", width: "80px" },
  { key: "name", label: "Name", sortable: true },
  { key: "revenue", label: "Revenue", format: { currency: "USD" } },
];

function setup(options: Partial<UseTableColumnConfigOptions<Row>> = {}) {
  const { result, scope } = withScope(() => useTableColumnConfig<Row>({
    columns: options.columns ?? COLUMNS,
    columnSetup: options.columnSetup ?? false,
    columnPicker: options.columnPicker ?? false,
  }));
  return { ...result, scope };
}

const keys = (cols: Column<Row>[]) => cols.map(c => c.key);

/**
 * The restore is a deliberate top-level side effect — deferring it to
 * `onMounted` costs a visible flash of the unfiltered column set — so every test
 * that asserts on it has to let the promise chain drain first.
 */
const settled = () => new Promise(resolve => setTimeout(resolve, 0));

describe("useTableColumnConfig", () => {
  beforeEach(() => {
    tableStorage.setStorageType("localStorage");
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("columnSetup config", () => {
    it("is disabled by false and by absence", () => {
      expect(setup({ columnSetup: false }).columnSetupEnabledBasic.value).toBe(false);
      expect(setup({ columnSetup: undefined }).columnSetupEnabledBasic.value).toBe(false);
    });

    it("reads a string as the storage key, with IndexedDB and reorder on", () => {
      const { columnSetupEnabledBasic, columnSetupConfig } = setup({ columnSetup: "orders" });
      expect(columnSetupEnabledBasic.value).toBe(true);
      expect(columnSetupConfig.value)
        .toEqual({ key: "orders", type: "indexedDB", allowReorder: true });
    });

    it("takes an object as given, defaulting only the storage type", () => {
      const { columnSetupConfig } = setup({
        columnSetup: { key: "orders", allowReorder: false },
      });
      expect(columnSetupConfig.value)
        .toEqual({ key: "orders", allowReorder: false, type: "indexedDB" });
    });

    it("leaves an explicit storage type alone", () => {
      const { columnSetupConfig } = setup({
        columnSetup: { key: "orders", type: "sessionStorage" },
      });
      expect(columnSetupConfig.value.type).toBe("sessionStorage");
    });

    it("is an empty config when disabled", () => {
      expect(setup({ columnSetup: false }).columnSetupConfig.value).toEqual({});
    });
  });

  describe("columnPicker config", () => {
    const picker: Extract<Actions["columnPicker"], object> = {
      groups: [{ key: "sys", label: "System", items: [{ key: "sku", label: "SKU" }] }],
    };

    it("is disabled by false", () => {
      const { columnPickerEnabled, columnPickerConfig } = setup({ columnPicker: false });
      expect(columnPickerEnabled.value).toBe(false);
      expect(columnPickerConfig.value).toBeNull();
    });

    it("hands the object straight back when enabled", () => {
      const { columnPickerEnabled, columnPickerConfig } = setup({ columnPicker: picker });
      expect(columnPickerEnabled.value).toBe(true);
      expect(columnPickerConfig.value).toBe(picker);
    });
  });

  describe("effectiveColumns", () => {
    it("is the declared list when neither feature is on", () => {
      expect(setup().effectiveColumns.value).toEqual(COLUMNS);
    });

    it("stands in with the declared list until a restore lands", () => {
      // Enabled but not yet initialised: the table renders something on the
      // first frame rather than nothing.
      expect(keys(setup({ columnSetup: "orders" }).effectiveColumns.value))
        .toEqual(["id", "name", "revenue"]);
    });

    it("follows an update from the setup panel", () => {
      const { effectiveColumns, handleVisibleColumnsUpdate } = setup({ columnSetup: "orders" });
      handleVisibleColumnsUpdate([COLUMNS[2], COLUMNS[0]]);
      expect(keys(effectiveColumns.value)).toEqual(["revenue", "id"]);
    });

    it("copies the array it is handed, rather than holding the caller's", () => {
      const { effectiveColumns, handleVisibleColumnsUpdate } = setup({ columnSetup: "orders" });
      const passed = [COLUMNS[0]];
      handleVisibleColumnsUpdate(passed);
      passed.push(COLUMNS[1]);
      expect(keys(effectiveColumns.value)).toEqual(["id"]);
    });

    it("tracks a reactive columns source", () => {
      const columns = ref<Column<Row>[]>([COLUMNS[0]]);
      const { effectiveColumns } = setup({ columns });
      expect(keys(effectiveColumns.value)).toEqual(["id"]);
      columns.value = [COLUMNS[1]];
      expect(keys(effectiveColumns.value)).toEqual(["name"]);
    });
  });

  describe("fixed columns are sorted to the edges", () => {
    // Sticky offsets accumulate in declaration order, so a fixed column declared
    // in the middle used to compute its offset against the wrong neighbours.
    const MIXED: Column<Row>[] = [
      { key: "a", label: "A" },
      { key: "b", label: "B", fixed: "right" },
      { key: "c", label: "C", fixed: "left" },
      { key: "d", label: "D" },
    ];

    it("pulls left ones to the front and right ones to the back", () => {
      expect(keys(setup({ columns: MIXED }).effectiveColumns.value))
        .toEqual(["c", "a", "d", "b"]);
    });

    it("keeps relative order within each band", () => {
      const columns: Column<Row>[] = [
        { key: "a", label: "A", fixed: "left" },
        { key: "b", label: "B", fixed: "right" },
        { key: "c", label: "C", fixed: "left" },
        { key: "d", label: "D", fixed: "right" },
      ];
      expect(keys(setup({ columns }).effectiveColumns.value)).toEqual(["a", "c", "b", "d"]);
    });

    it("returns the original array untouched when nothing is fixed", () => {
      // Identity matters: anything downstream comparing references would see a
      // change on every read otherwise.
      const { effectiveColumns } = setup({ columns: COLUMNS });
      expect(effectiveColumns.value).toBe(COLUMNS);
    });

    it("applies to a restored selection too", () => {
      const { effectiveColumns, handleVisibleColumnsUpdate } = setup({
        columns: MIXED,
        columnSetup: "orders",
      });
      handleVisibleColumnsUpdate([MIXED[1], MIXED[0], MIXED[2]]);
      expect(keys(effectiveColumns.value)).toEqual(["c", "a", "b"]);
    });
  });

  describe("restoring from storage", () => {
    it("does nothing when neither feature is enabled", async () => {
      await writeColumnState("orders", { visible: ["id"], order: ["id"] });
      const { effectiveColumns } = setup({ columnSetup: false });
      await settled();
      expect(keys(effectiveColumns.value)).toEqual(["id", "name", "revenue"]);
    });

    it("restores visibility and order, keyed off columnSetup", async () => {
      await writeColumnState("orders", {
        visible: ["revenue", "id"],
        order: ["revenue", "name", "id"],
      });
      const { effectiveColumns } = setup({ columnSetup: { key: "orders", type: "localStorage" } });
      await settled();
      // `name` is in the order but not visible, so it is dropped.
      expect(keys(effectiveColumns.value)).toEqual(["revenue", "id"]);
    });

    it("keeps the full column definition, not just its key", async () => {
      await writeColumnState("orders", { visible: ["revenue"], order: ["revenue"] });
      const { effectiveColumns } = setup({ columnSetup: { key: "orders", type: "localStorage" } });
      await settled();
      expect(effectiveColumns.value[0].format).toEqual({ currency: "USD" });
    });

    it("applies a persisted pin over the column's declared one", async () => {
      await writeColumnState("orders", {
        visible: ["id", "name"],
        order: ["id", "name"],
        fixed: { name: "right" },
      });
      const { effectiveColumns } = setup({ columnSetup: { key: "orders", type: "localStorage" } });
      await settled();
      expect(effectiveColumns.value.find(c => c.key === "name")?.fixed).toBe("right");
    });

    it("falls back to the visible list when the order is empty", async () => {
      await writeColumnState("orders", { visible: ["name", "id"], order: [] });
      const { effectiveColumns } = setup({ columnSetup: { key: "orders", type: "localStorage" } });
      await settled();
      expect(keys(effectiveColumns.value)).toEqual(["name", "id"]);
    });

    it("leaves the declared columns alone when the stored state resolves to nothing", async () => {
      await writeColumnState("orders", { visible: ["gone"], order: ["gone"] });
      const { effectiveColumns } = setup({ columnSetup: { key: "orders", type: "localStorage" } });
      await settled();
      expect(keys(effectiveColumns.value)).toEqual(["id", "name", "revenue"]);
    });

    it("flattens grouped columns before matching keys", async () => {
      const grouped: Column<Row>[] = [
        { key: "grp", label: "Group", children: [COLUMNS[0], COLUMNS[1]] },
        COLUMNS[2],
      ];
      await writeColumnState("orders", { visible: ["name"], order: ["name"] });
      const { effectiveColumns } = setup({
        columns: grouped,
        columnSetup: { key: "orders", type: "localStorage" },
      });
      await settled();
      expect(keys(effectiveColumns.value)).toEqual(["name"]);
    });

    it("survives a storage read that throws", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const boom = vi.spyOn(tableStorage, "getTableConfig")
        .mockRejectedValue(new Error("quota"));

      const { effectiveColumns } = setup({ columnSetup: { key: "orders", type: "localStorage" } });
      await settled();

      expect(keys(effectiveColumns.value)).toEqual(["id", "name", "revenue"]);
      expect(warn).toHaveBeenCalled();
      boom.mockRestore();
      warn.mockRestore();
    });
  });

  describe("initialVisible", () => {
    it("opens on the named subset when there is no storage key", async () => {
      const { effectiveColumns } = setup({ columnSetup: { initialVisible: ["revenue", "id"] } });
      await settled();
      // Declared order wins over the order of `initialVisible` — the list says
      // which columns, not where they go.
      expect(keys(effectiveColumns.value)).toEqual(["id", "revenue"]);
    });

    it("takes an empty list as `hide everything`, not as `no preference`", async () => {
      const { effectiveColumns } = setup({ columnSetup: { initialVisible: [] } });
      await settled();
      expect(effectiveColumns.value).toEqual([]);
    });

    it("ignores keys that match no column", async () => {
      const { effectiveColumns } = setup({ columnSetup: { initialVisible: ["nope"] } });
      await settled();
      expect(keys(effectiveColumns.value)).toEqual(["id", "name", "revenue"]);
    });

    it("gives way to a stored state", async () => {
      await writeColumnState("orders", { visible: ["name"], order: ["name"] });
      const { effectiveColumns } = setup({
        columnSetup: { key: "orders", type: "localStorage", initialVisible: ["revenue"] },
      });
      await settled();
      expect(keys(effectiveColumns.value)).toEqual(["name"]);
    });
  });

  describe("restoring from the column picker's own key", () => {
    const groups = [{
      key: "sys",
      label: "System",
      items: [{ key: "sku", label: "SKU", sortable: true }, { key: "asin", label: "ASIN" }],
    }];

    it("is read when no columnSetup is configured at all", async () => {
      // The inline version only ever looked at columnSetup's key, so a
      // picker-only table wrote its state faithfully and then ignored it.
      await writeColumnState("picked", { visible: ["sku"], order: ["sku"] });
      const { effectiveColumns } = setup({
        columnPicker: { groups, key: "picked", type: "localStorage" },
      });
      await settled();
      expect(keys(effectiveColumns.value)).toEqual(["sku"]);
    });

    it("builds a column from the picker item, label and sortable included", async () => {
      await writeColumnState("picked", { visible: ["sku"], order: ["sku"] });
      const { effectiveColumns } = setup({
        columnPicker: { groups, key: "picked", type: "localStorage" },
      });
      await settled();
      expect(effectiveColumns.value[0]).toMatchObject({ key: "sku", label: "SKU", sortable: true });
    });

    it("falls back to defaultSortable for an item that does not say", async () => {
      await writeColumnState("picked", { visible: ["asin"], order: ["asin"] });
      const { effectiveColumns } = setup({
        columnPicker: { groups, key: "picked", type: "localStorage", defaultSortable: true },
      });
      await settled();
      expect(effectiveColumns.value[0].sortable).toBe(true);
    });

    it("uses the label stored alongside the state when the groups have not arrived", async () => {
      // Which is what makes a picker whose groups are fetched restore on the
      // first frame instead of after the request.
      await writeColumnState("picked", {
        visible: ["units"],
        order: ["units"],
        labels: { units: "Units sold" },
      });
      const { effectiveColumns } = setup({
        columnPicker: { groups: [], key: "picked", type: "localStorage" },
      });
      await settled();
      expect(effectiveColumns.value).toEqual([
        { key: "units", label: "Units sold", fixed: undefined, sortable: undefined },
      ]);
    });

    it("prefers a declared column over the picker item of the same key", async () => {
      await writeColumnState("picked", { visible: ["name"], order: ["name"] });
      const { effectiveColumns } = setup({
        columnPicker: {
          groups: [{ key: "g", label: "G", items: [{ key: "name", label: "Wrong" }] }],
          key: "picked",
          type: "localStorage",
        },
      });
      await settled();
      expect(effectiveColumns.value[0].label).toBe("Name");
    });

    it("gives way to columnSetup's key when both are configured", async () => {
      await writeColumnState("orders", { visible: ["id"], order: ["id"] });
      await writeColumnState("picked", { visible: ["name"], order: ["name"] });
      const { effectiveColumns } = setup({
        columnSetup: { key: "orders", type: "localStorage" },
        columnPicker: { groups, key: "picked", type: "localStorage" },
      });
      await settled();
      expect(keys(effectiveColumns.value)).toEqual(["id"]);
    });
  });

  describe("popover handles", () => {
    it("start empty", () => {
      const { columnSetupPopoverRef, columnPickerPopoverRef } = setup();
      expect(columnSetupPopoverRef.value).toBeNull();
      expect(columnPickerPopoverRef.value).toBeNull();
    });

    it("close the popover they are bound to", () => {
      const {
        columnSetupPopoverRef, columnPickerPopoverRef,
        handleColumnSetupClose, handleColumnPickerClose,
      } = setup();

      const setupClose = vi.fn();
      const pickerClose = vi.fn();
      columnSetupPopoverRef.value = { close: setupClose };
      columnPickerPopoverRef.value = { close: pickerClose };

      handleColumnSetupClose();
      handleColumnPickerClose();

      expect(setupClose).toHaveBeenCalledTimes(1);
      expect(pickerClose).toHaveBeenCalledTimes(1);
    });

    it("are safe to call before the popover exists", () => {
      const { handleColumnSetupClose, handleColumnPickerClose } = setup();
      expect(() => {
        handleColumnSetupClose();
        handleColumnPickerClose();
      }).not.toThrow();
    });
  });
});
