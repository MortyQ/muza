import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Multiselect from "vue-multiselect";

import VSelect from "../../../src/components/inputs/VSelect.vue";
import type { SelectOption } from "../../../src/types/select";

const OPTIONS: SelectOption[] = [
  { label: "Amazon", value: "amazon" },
  { label: "Walmart", value: "walmart" },
  { label: "Target", value: "target" },
];

const stubs = { Icon: true };

/**
 * VSelect wraps vue-multiselect. What belongs here is the wrapper's own
 * contract — the props it hands down, the events it re-emits, and the floating
 * label behaviour it adds on top. vue-multiselect's own list rendering and
 * keyboard handling are its suite's problem, not this one's.
 */
function select(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(VSelect, { props: { options: OPTIONS, ...props }, slots, global: { stubs } });
}

const inner = (w: ReturnType<typeof select>) => w.findComponent(Multiselect);

describe("VSelect", () => {
  describe("props handed to vue-multiselect", () => {
    it("passes the options through", () => {
      expect(inner(select()).props().options).toEqual(OPTIONS);
    });

    it("defaults to a searchable, single-value, non-empty-able select", () => {
      const props = inner(select()).props();
      expect(props.multiple).toBe(false);
      expect(props.searchable).toBe(true);
      expect(props.allowEmpty).toBe(false);
      expect(props.closeOnSelect).toBe(true);
    });

    it("maps label and trackBy", () => {
      const props = inner(select({ label: "name", trackBy: "id" })).props();
      expect(props.label).toBe("name");
      expect(props.trackBy).toBe("id");
    });

    it("forwards multiple, disabled, loading and taggable", () => {
      const props = inner(select({
        multiple: true, disabled: true, loading: true, taggable: true,
      })).props();
      expect(props.multiple).toBe(true);
      expect(props.disabled).toBe(true);
      expect(props.loading).toBe(true);
      expect(props.taggable).toBe(true);
    });

    it("forwards the list limits", () => {
      const props = inner(select({ maxHeight: 180, optionsLimit: 25 })).props();
      expect(props.maxHeight).toBe(180);
      expect(props.optionsLimit).toBe(25);
    });
  });

  describe("model", () => {
    it("passes a single selection down", () => {
      expect(inner(select({ modelValue: OPTIONS[1] })).props().modelValue).toEqual(OPTIONS[1]);
    });

    it("passes an array down in multiple mode", () => {
      const value = [OPTIONS[0], OPTIONS[2]];
      expect(inner(select({ multiple: true, modelValue: value })).props().modelValue)
        .toEqual(value);
    });

    it("re-emits the new value", async () => {
      const w = select();
      inner(w).vm.$emit("update:modelValue", OPTIONS[0]);
      await w.vm.$nextTick();
      expect(w.emitted("update:modelValue")?.[0]).toEqual([OPTIONS[0]]);
    });
  });

  describe("re-emitted events", () => {
    it.each([
      ["select", OPTIONS[0]],
      ["remove", OPTIONS[1]],
      ["search-change", "ama"],
    ] as const)("re-emits %s", async (event, payload) => {
      const w = select();
      inner(w).vm.$emit(event, payload);
      await w.vm.$nextTick();
      expect(w.emitted(event)?.[0]).toEqual([payload]);
    });
  });

  describe("floating label", () => {
    it("hides the placeholder while a label is showing and the field is unfocused", () => {
      // Otherwise the label and the placeholder say the same thing twice.
      const w = select({ name: "Marketplace", placeholder: "Pick one" });
      expect(inner(w).props().placeholder).toBe("");
    });

    it("shows the placeholder when there is no label to clash with", () => {
      const w = select({ placeholder: "Pick one" });
      expect(inner(w).props().placeholder).toBe("Pick one");
    });

    it("restores the placeholder on focus", async () => {
      const w = select({ name: "Marketplace", placeholder: "Pick one" });
      inner(w).vm.$emit("open");
      await w.vm.$nextTick();
      expect(inner(w).props().placeholder).toBe("Pick one");
    });

    it("re-emits open and close", async () => {
      const w = select();
      inner(w).vm.$emit("open");
      inner(w).vm.$emit("close");
      await w.vm.$nextTick();
      expect(w.emitted("open")).toHaveLength(1);
      expect(w.emitted("close")).toHaveLength(1);
    });
  });

  describe("empty state", () => {
    // vue-multiselect renders the noResult block only while the dropdown is
    // open and the filtered list is empty, so each case has to open it first.
    async function opened(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
      // Teleport is stubbed in the unit setup, so the dropdown has to stay inline
      // for its content to be reachable from the wrapper.
      const w = select({ options: [], teleportToBody: false, ...props }, slots);
      (inner(w).vm as unknown as { activate: () => void }).activate();
      await w.vm.$nextTick();
      return w;
    }

    it("uses the default copy", async () => {
      expect((await opened()).text()).toContain("No results found");
    });

    it("takes an override", async () => {
      expect((await opened({ noResultsText: "Nothing matches" })).text())
        .toContain("Nothing matches");
    });

    it("lets the noResult slot win", async () => {
      const w = await opened({}, { noResult: "<b class='custom-empty'>Try another word</b>" });
      expect(w.find(".custom-empty").exists()).toBe(true);
      expect(w.text()).not.toContain("No results found");
    });
  });
});
