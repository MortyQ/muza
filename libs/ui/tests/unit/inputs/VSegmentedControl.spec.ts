import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import VIcon from "../../../src/components/base/VIcon.vue";
import VSegmentedControl, { type SegmentOption } from "../../../src/components/inputs/VSegmentedControl.vue";
import VTooltip from "../../../src/components/overlay/VTooltip.vue";

const OPTIONS: SegmentOption[] = [
  { label: "Day", value: "day", icon: "lucide:sun" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month", disabled: true },
];

const stubs = { Icon: true };

function control(props: Record<string, unknown> = {}) {
  return mount(VSegmentedControl, {
    props: { options: OPTIONS, modelValue: "day", ...props },
    global: { stubs },
  });
}

const items = (w: ReturnType<typeof control>) => w.findAll(".v-sc__item");

describe("VSegmentedControl", () => {
  it("renders one button per option", () => {
    expect(items(control())).toHaveLength(3);
    expect(items(control()).map(b => b.text())).toEqual(["Day", "Week", "Month"]);
  });

  it("uses real buttons that will not submit a form", () => {
    for (const item of items(control())) {
      expect(item.element.tagName).toBe("BUTTON");
      expect(item.attributes("type")).toBe("button");
    }
  });

  it("marks the selected option active and pressed", () => {
    const w = control({ modelValue: "week" });
    expect(items(w).map(b => b.classes().includes("v-sc__item--active")))
      .toEqual([false, true, false]);
    expect(items(w).map(b => b.attributes("aria-pressed")))
      .toEqual(["false", "true", "false"]);
  });

  it("emits the clicked value", async () => {
    const w = control();
    await items(w)[1].trigger("click");
    expect(w.emitted("update:modelValue")?.[0]).toEqual(["week"]);
  });

  it("emits again for the already-selected option", async () => {
    // Deliberate: the control is a radio group, not a toggle, so re-selecting
    // is a no-op for the parent rather than something the child suppresses.
    const w = control({ modelValue: "day" });
    await items(w)[0].trigger("click");
    expect(w.emitted("update:modelValue")?.[0]).toEqual(["day"]);
  });

  describe("disabled", () => {
    it("disables a disabled option and emits nothing for it", async () => {
      const w = control();
      expect(items(w)[2].attributes("disabled")).toBeDefined();
      expect(items(w)[2].classes()).toContain("v-sc__item--disabled");

      await items(w)[2].trigger("click");
      expect(w.emitted("update:modelValue")).toBeUndefined();
    });

    it("a disabled control disables every option", async () => {
      const w = control({ disabled: true });
      for (const item of items(w)) {
        expect(item.attributes("disabled")).toBeDefined();
      }
      await items(w)[1].trigger("click");
      expect(w.emitted("update:modelValue")).toBeUndefined();
      expect(w.classes()).toContain("v-segmented-control--disabled");
    });
  });

  describe("appearance", () => {
    it.each(["sm", "md", "lg"] as const)("size %s", (size) => {
      expect(control({ size }).classes()).toContain(`v-segmented-control--${size}`);
    });

    it("full width is opt-in", () => {
      expect(control().classes()).not.toContain("v-segmented-control--full-width");
      expect(control({ fullWidth: true }).classes()).toContain("v-segmented-control--full-width");
    });

    it.each([
      ["sm", 14],
      ["md", 16],
      ["lg", 20],
    ] as const)("scales the icon for size %s", (size, expected) => {
      expect(control({ size }).findComponent(VIcon).props().size).toBe(expected);
    });

    it("carries no size modifier and a 15px icon when size is unset", () => {
      // Unset is the chrome's natural 30px — the height every other control in
      // a toolbar row stands at. `md` is an explicit 32px override, not the default.
      const w = control();
      expect(w.classes().some(c => /^v-segmented-control--(sm|md|lg)$/.test(c))).toBe(false);
      expect(w.findComponent(VIcon).props().size).toBe(15);
    });

    it("renders an icon only for options that declare one", () => {
      expect(control().findAllComponents(VIcon)).toHaveLength(1);
    });
  });

  describe("loading", () => {
    it("adds nothing when idle", () => {
      const w = control();
      expect(w.classes()).not.toContain("v-segmented-control--loading");
      expect(w.find(".v-sc__spinner").exists()).toBe(false);
    });

    it("marks the control and the selected option", () => {
      const w = control({ loading: true });
      expect(w.classes()).toContain("v-segmented-control--loading");
      expect(items(w)[0].classes()).toContain("v-sc__item--pending");
    });

    it("spins on the selected option only", () => {
      // The consumer moves `modelValue` on click and rolls it back on failure,
      // so the spinner sits on what was just clicked.
      const w = control({ loading: true, modelValue: "week" });
      expect(w.findAll(".v-sc__spinner")).toHaveLength(1);
      expect(items(w)[1].classes()).toContain("v-sc__item--pending");
      expect(items(w)[0].classes()).not.toContain("v-sc__item--pending");
    });

    it("shows no spinner when nothing matches the model", () => {
      expect(control({ loading: true, modelValue: "year" }).find(".v-sc__spinner").exists())
        .toBe(false);
    });

    it("announces the wait on the pending option", () => {
      const w = control({ loading: true });
      expect(items(w)[0].attributes("aria-busy")).toBe("true");
      expect(items(w)[1].attributes("aria-busy")).toBeUndefined();
    });

    it("keeps the label mounted so the segment does not change width", () => {
      // Pulling it out for the spinner would collapse the segment and drag the
      // pill with it.
      const w = control({ loading: true });
      expect(items(w)[0].find(".v-sc__label").text()).toBe("Day");
    });

    it("blocks every option, not just the pending one", () => {
      const w = control({ loading: true });
      for (const item of items(w)) {
        expect(item.attributes("disabled")).toBeDefined();
      }
    });

    it("emits nothing on click", async () => {
      const w = control({ loading: true });
      await items(w)[1].trigger("click");
      expect(w.emitted("update:modelValue")).toBeUndefined();
    });

    it("still emits once the write finishes", async () => {
      const w = control({ loading: true });
      await w.setProps({ loading: false });
      await items(w)[1].trigger("click");
      expect(w.emitted("update:modelValue")?.[0]).toEqual(["week"]);
    });
  });

  // Carried over from VToggleGroup, which this component absorbed: the tooltip
  // was the one thing the toggle group had that the segmented control did not.
  describe("tooltips", () => {
    const WITH_TOOLTIP: SegmentOption[] = [
      { label: "List", value: "list", tooltip: "List view" },
      { label: "Grid", value: "grid" },
    ];
    const withTips = () => control({ options: WITH_TOOLTIP, modelValue: "list" });

    it("wraps every option, but only enables the ones with text", () => {
      // Uniform children keep the track's geometry to one shape.
      const tooltips = withTips().findAllComponents(VTooltip);
      expect(tooltips).toHaveLength(2);
      expect(tooltips[0].props().disabled).toBe(false);
      expect(tooltips[1].props().disabled).toBe(true);
    });

    it("passes the tooltip text through", () => {
      expect(withTips().findAllComponents(VTooltip)[0].props().text).toBe("List view");
    });

    it("falls back to an empty string rather than undefined", () => {
      expect(withTips().findAllComponents(VTooltip)[1].props().text).toBe("");
    });

    it("still renders every segment inside its wrapper", () => {
      expect(items(withTips())).toHaveLength(2);
    });
  });

  it("handles numeric values", async () => {
    const w = mount(VSegmentedControl, {
      props: { options: [{ label: "One", value: 1 }, { label: "Two", value: 2 }], modelValue: 1 },
      global: { stubs },
    });
    await w.findAll(".v-sc__item")[1].trigger("click");
    expect(w.emitted("update:modelValue")?.[0]).toEqual([2]);
  });
});
