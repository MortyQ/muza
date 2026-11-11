import { nextTick } from "vue";

import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TableCell from "../../../../src/components/table/components/TableCell.vue";
import TableColumnPicker from "../../../../src/components/table/components/TableColumnPicker.vue";
import TableColumnSetup from "../../../../src/components/table/components/TableColumnSetup.vue";
import TableExpandAdditionalHeadersButton
  from "../../../../src/components/table/components/TableExpandAdditionalHeadersButton.vue";
import TableHeader from "../../../../src/components/table/components/TableHeader.vue";
import TableToolbar from "../../../../src/components/table/components/TableToolbar.vue";
import type { Column } from "../../../../src/components/table/types";
import type { ColumnPickerGroup } from "../../../../src/components/table/types/toolbar";
import tableStorage from "../../../../src/components/table/utils/storage";
import { makeColumns } from "../../../setup/table";

/**
 * Every control the table draws has to be reachable by keyboard and named for a screen reader.
 * These were found by the reviewer's full audit (R-A11Y-01..05): click-only divs, icon-only
 * buttons, and an unlabeled search input.
 */

const stubs = { Icon: true, VTooltip: true };

beforeEach(() => {
  tableStorage.setStorageType("localStorage");
  localStorage.clear();
  sessionStorage.clear();
});

const GROUPS: ColumnPickerGroup[] = [
  {
    key: "core",
    label: "Core",
    items: [
      { key: "id", label: "ID", icon: "number" },
      { key: "name", label: "Name", icon: "text" },
    ],
  },
];

async function picker() {
  const w = mount(TableColumnPicker, {
    props: { groups: GROUPS, columns: makeColumns() },
    global: { stubs },
    attachTo: document.body,
  });
  await nextTick();
  await nextTick();
  return w;
}

describe("TableColumnPicker", () => {
  it("labels the search input", async () => {
    const w = await picker();
    expect(w.find(".cp-search input").attributes("aria-label")).toBe("Search columns");
    w.unmount();
  });

  it("toggles a group from a real button that reports whether it is expanded", async () => {
    const w = await picker();
    const toggle = w.find(".cp-group-toggle");

    expect(toggle.element.tagName).toBe("BUTTON");
    const before = toggle.attributes("aria-expanded");
    await toggle.trigger("click");
    expect(w.find(".cp-group-toggle").attributes("aria-expanded"))
      .toBe(before === "true" ? "false" : "true");
    w.unmount();
  });

  it("exposes each available column as a checkbox operable with Space", async () => {
    const w = await picker();
    if (!w.find(".cp-available-item").exists()) await w.find(".cp-group-toggle").trigger("click");
    const item = w.find(".cp-available-item");

    expect(item.attributes("role")).toBe("checkbox");
    expect(item.attributes("tabindex")).toBe("0");
    const before = item.attributes("aria-checked");
    await item.trigger("keydown", { key: " " });
    expect(w.find(".cp-available-item").attributes("aria-checked"))
      .toBe(before === "true" ? "false" : "true");
    w.unmount();
  });
});

describe("TableColumnSetup", () => {
  const setup = () => mount(TableColumnSetup, {
    props: { columns: makeColumns() },
    global: { stubs },
    attachTo: document.body,
  });

  it("exposes show-all as a tri-state checkbox operable with Enter", async () => {
    const w = setup();
    const row = w.find(".column-setup-toggle-all");

    expect(row.attributes("role")).toBe("checkbox");
    expect(row.attributes("tabindex")).toBe("0");
    expect(row.attributes("aria-label")).toBe("Show all columns");
    expect(row.attributes("aria-checked")).toBe("true");

    await row.trigger("keydown", { key: "Enter" });
    expect(w.find(".column-setup-toggle-all").attributes("aria-checked")).toBe("false");
    w.unmount();
  });
});

describe("TableHeader", () => {
  const header = (column: Column) => mount(TableHeader, {
    props: { column, label: "Name", columnKey: "name" },
    global: { stubs },
    attachTo: document.body,
  });

  it("makes a clickable label a keyboard button", async () => {
    const onHeaderClick = vi.fn();
    const w = header({ key: "name", label: "Name", onHeaderClick });
    const label = w.find(".v-table-header-label-wrapper");

    expect(label.attributes("role")).toBe("button");
    expect(label.attributes("tabindex")).toBe("0");
    await label.trigger("keydown", { key: "Enter" });
    expect(onHeaderClick).toHaveBeenCalledTimes(1);
    w.unmount();
  });

  it("leaves a plain label without a role or tab stop", () => {
    const label = header({ key: "name", label: "Name" }).find(".v-table-header-label-wrapper");
    expect(label.attributes("role")).toBeUndefined();
    expect(label.attributes("tabindex")).toBeUndefined();
  });
});

describe("icon-only buttons", () => {
  it("names the row expand button and reports its state", () => {
    const w = mount(TableCell, {
      props: { row: { id: 1 }, column: { key: "name", label: "Name" }, colIndex: 0, rowIndex: 0, isExpanded: true },
      global: {
        provide: {
          tableCellMetadata: () => ({
            formattedValue: "x", titleText: "x", indentStyle: null, customStyle: undefined,
            isExpandable: true,
          }),
        },
        stubs,
      },
    });
    const button = w.find(".v-table-cell-expand-btn");

    expect(button.attributes("type")).toBe("button");
    expect(button.attributes("aria-label")).toBe("Collapse row");
    expect(button.attributes("aria-expanded")).toBe("true");
  });

  it("names the additional-headers button and reports its state", () => {
    const button = mount(TableExpandAdditionalHeadersButton, { props: { isExpanded: false } });
    expect(button.attributes("aria-label")).toBe("Show additional headers");
    expect(button.attributes("aria-expanded")).toBe("false");
  });

  it("names the toolbar's refresh button", () => {
    const w = mount(TableToolbar, {
      props: { config: { actions: { refresh: true } } },
      global: { stubs },
    });
    expect(w.find("button").attributes("aria-label")).toBe("Refresh");
  });
});
