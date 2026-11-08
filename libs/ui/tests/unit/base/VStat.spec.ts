import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import VStat from "../../../src/components/base/VStat.vue";

function stat(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(VStat, { props: { label: "Revenue", ...props }, slots });
}

describe("VStat", () => {
  it("renders the label and the formatted value as given", () => {
    const w = stat({ value: "$12,400.00" });
    expect(w.find(".v-stat__label").text()).toBe("Revenue");
    expect(w.find(".v-stat__figure").text()).toBe("$12,400.00");
  });

  it("lets the default slot replace the value", () => {
    const w = stat({ value: "1" }, { default: "<span class='count'>2</span>" });
    expect(w.find(".v-stat__figure .count").text()).toBe("2");
  });

  it("is medium and untoned by default", () => {
    const classes = stat().classes();
    expect(classes).toContain("v-stat--md");
    expect(classes).toContain("v-stat--tone-default");
  });

  it.each([["size", "lg", "v-stat--lg"], ["tone", "danger", "v-stat--tone-danger"]] as const)(
    "%s=%s gives %s",
    (prop, value, expected) => {
      expect(stat({ [prop]: value }).classes()).toContain(expected);
    },
  );

  it("renders a chip only when one is given", () => {
    expect(stat().find(".v-stat__chip").exists()).toBe(false);
    expect(stat({}, { chip: "<b class='delta' />" }).find(".v-stat__chip .delta").exists()).toBe(true);
  });

  it("renders a hint from the prop or the slot, and nothing without either", () => {
    expect(stat().find(".v-stat__hint").exists()).toBe(false);
    expect(stat({ hint: "vs. last month" }).find(".v-stat__hint").text()).toBe("vs. last month");
    expect(stat({}, { hint: "<i>custom</i>" }).find(".v-stat__hint i").text()).toBe("custom");
  });
});
