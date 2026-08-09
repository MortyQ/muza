import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import VCheckbox from "../../../../src/components/inputs/VCheckbox.vue";
import TableCheckboxCell from "../../../../src/components/table/components/TableCheckboxCell.vue";
import TableHeaderCheckbox from "../../../../src/components/table/components/TableHeaderCheckbox.vue";

/**
 * Both cells wrap the library's own VCheckbox and add one thing each: a
 * `@click.stop` so ticking a box does not also fire the row's click handler,
 * and — for the header — a tri-state mapping from one string prop onto two
 * boolean checkbox props.
 *
 * The real VCheckbox is mounted rather than stubbed: the mapping is the whole
 * contract here, and a stub would let a swapped `checked`/`indeterminate` pass.
 */

const stubs = { Icon: true };

const cell = (props: Record<string, unknown>) =>
  mount(TableCheckboxCell, { props, global: { stubs } });

const header = (props: Record<string, unknown>) =>
  mount(TableHeaderCheckbox, { props, global: { stubs } });

describe("TableCheckboxCell", () => {
  it("reflects the checked prop", () => {
    expect(cell({ checked: true }).findComponent(VCheckbox).props("modelValue")).toBe(true);
    expect(cell({ checked: false }).findComponent(VCheckbox).props("modelValue")).toBe(false);
  });

  it("passes indeterminate through", () => {
    expect(cell({ checked: false, indeterminate: true })
      .findComponent(VCheckbox).props("indeterminate")).toBe(true);
  });

  it("passes disabled through", () => {
    expect(cell({ checked: false, disabled: true })
      .findComponent(VCheckbox).props("disabled")).toBe(true);
  });

  it("emits toggle when the box changes", async () => {
    const w = cell({ checked: false });
    await w.findComponent(VCheckbox).vm.$emit("update:modelValue", true);
    expect(w.emitted("toggle")).toHaveLength(1);
  });

  it("emits toggle with no payload — the parent owns the new state", async () => {
    const w = cell({ checked: false });
    await w.findComponent(VCheckbox).vm.$emit("update:modelValue", true);
    expect(w.emitted("toggle")![0]).toEqual([]);
  });

  it("still emits toggle when disabled", async () => {
    // Unlike the header cell, this one has no guard — VCheckbox is expected to
    // stop the interaction before it ever reaches here.
    const w = cell({ checked: false, disabled: true });
    await w.findComponent(VCheckbox).vm.$emit("update:modelValue", true);
    expect(w.emitted("toggle")).toHaveLength(1);
  });

  it("stops the click from reaching the row", async () => {
    // Without .stop, ticking a checkbox would also emit row-click.
    const onRowClick = vi.fn();
    const w = mount({
      components: { TableCheckboxCell },
      setup: () => ({ onRowClick }),
      template: "<div @click=\"onRowClick\"><TableCheckboxCell :checked=\"false\" /></div>",
    }, { global: { stubs } });

    await w.find(".v-table-checkbox-cell").trigger("click");
    expect(onRowClick).not.toHaveBeenCalled();
  });
});

describe("TableHeaderCheckbox", () => {
  it.each([
    ["unchecked", false, false],
    ["checked", true, false],
    ["indeterminate", false, true],
  ] as [string, boolean, boolean][])(
    "maps %s onto the checkbox",
    (state, modelValue, indeterminate) => {
      const box = header({ state }).findComponent(VCheckbox);
      expect(box.props("modelValue")).toBe(modelValue);
      expect(box.props("indeterminate")).toBe(indeterminate);
    },
  );

  it("emits toggle when the box changes", async () => {
    const w = header({ state: "unchecked" });
    await w.findComponent(VCheckbox).vm.$emit("update:modelValue", true);
    expect(w.emitted("toggle")).toHaveLength(1);
  });

  it("swallows the toggle when disabled", async () => {
    const w = header({ state: "unchecked", disabled: true });
    await w.findComponent(VCheckbox).vm.$emit("update:modelValue", true);
    expect(w.emitted("toggle")).toBeUndefined();
  });

  it("passes disabled down as well as guarding", () => {
    expect(header({ state: "unchecked", disabled: true })
      .findComponent(VCheckbox).props("disabled")).toBe(true);
  });

  it("stops the click from reaching the header cell", async () => {
    const onHeaderClick = vi.fn();
    const w = mount({
      components: { TableHeaderCheckbox },
      setup: () => ({ onHeaderClick }),
      template: "<div @click=\"onHeaderClick\">"
        + "<TableHeaderCheckbox state=\"unchecked\" /></div>",
    }, { global: { stubs } });

    await w.find(".v-table-header-checkbox-cell").trigger("click");
    expect(onHeaderClick).not.toHaveBeenCalled();
  });
});
