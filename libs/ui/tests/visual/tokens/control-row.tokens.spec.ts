import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import VButton from "../../../src/components/base/VButton.vue";
import VThemeSwitcher from "../../../src/components/base/VThemeSwitcher.vue";
import VInput from "../../../src/components/inputs/VInput.vue";
import VSegmentedControl from "../../../src/components/inputs/VSegmentedControl.vue";
import VSelect from "../../../src/components/inputs/VSelect.vue";
import VToggleGroup from "../../../src/components/inputs/VToggleGroup.vue";
import VTab from "../../../src/components/layout/VTab.vue";
import { applyTheme, THEME_CASES } from "../../setup/theme";
import { tokenAsValue } from "../../setup/tokens";

/**
 * The one assertion the control scale exists for: everything that can stand
 * beside something else in a toolbar row stands at the same height, and that
 * height is `--ui-control-h` rather than eight copies of the same number.
 *
 * Deliberately not written as "is 30px". The number is allowed to change — that
 * is the whole point of putting it in a token — and a spec that pinned it would
 * have to be edited on every density pass, which is exactly the kind of edit
 * that gets made without reading. What must not change is that a component
 * takes its height from the scale at all.
 *
 * `size` is not exercised per component here; each component's own chrome spec
 * covers its scale. This file is about the row agreeing with itself.
 *
 * VDatepicker belongs in this row and is missing from it: `@vuepic/vue-datepicker`
 * throws `Cannot define property date-picker, object is not extensible` from its
 * own `useTemplateRef` call the moment it is rendered under vitest-browser-vue,
 * so there is nothing to measure. Its field is on `--ui-control-h` in
 * vdatepicker.scss; nothing here proves it stays there.
 */
const OPTIONS = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
];

const THEMES = [
  { value: "light", label: "Light", icon: "lucide:sun" },
  { value: "dark", label: "Dark", icon: "lucide:moon" },
];

const TABS = [{ id: "overview", label: "Overview" }];

/**
 * Each entry renders one control and points at the element that actually
 * carries the height — which is not always the root: a select's box is its
 * tags container, a datepicker's is the library's own input.
 */
const ROW = [
  {
    name: "VButton",
    render: () => render(VButton, { props: { text: "Export" } }),
    selector: null,
    property: "height",
  },
  {
    name: "VInput",
    render: () => render(VInput, { props: { placeholder: "Search" } }),
    selector: ".v-input-field",
    property: "height",
  },
  {
    name: "VSelect",
    render: () => render(VSelect, { props: { options: OPTIONS } }),
    selector: ".multiselect__tags",
    property: "min-height",
  },
  {
    name: "VSegmentedControl",
    render: () => render(VSegmentedControl, { props: { options: OPTIONS, modelValue: "day" } }),
    selector: null,
    property: "height",
  },
  {
    name: "VToggleGroup",
    render: () => render(VToggleGroup, { props: { options: OPTIONS, modelValue: "day" } }),
    selector: null,
    property: "height",
  },
  {
    name: "VThemeSwitcher (cycle)",
    render: () => render(VThemeSwitcher, { props: { themes: THEMES, modelValue: "light" } }),
    selector: null,
    property: "height",
  },
  {
    name: "VThemeSwitcher (segment)",
    render: () => render(VThemeSwitcher, {
      props: { themes: THEMES, modelValue: "light", variant: "segment" },
    }),
    selector: null,
    property: "height",
  },
  {
    name: "VTab",
    render: () => render(VTab, { props: { tabs: TABS, useHash: false } }),
    selector: ".v-tab-btn",
    property: "height",
  },
] as const;

describe.each(THEME_CASES)("the control row — %s theme", (theme) => {
  it.each(ROW.map(c => [c.name, c] as const))(
    "%s takes its height from --ui-control-h",
    async (_name, control) => {
      await applyTheme(theme);
      const root = control.render().container.firstElementChild as HTMLElement;
      const el = control.selector
        ? root.querySelector<HTMLElement>(control.selector)!
        : root;

      expect(el, `${control.selector} did not render`).not.toBeNull();
      expect(getComputedStyle(el).getPropertyValue(control.property))
        .toBe(tokenAsValue(control.property, "--ui-control-h"));
    },
  );

  it("puts every control in the row at one height", async () => {
    // The same fact from the other side: even if each of them drifted onto its
    // own token, a row of nine boxes at eight heights is the defect a reader
    // would actually notice.
    await applyTheme(theme);
    const heights = new Set<string>();

    for (const control of ROW) {
      const root = control.render().container.firstElementChild as HTMLElement;
      const el = control.selector
        ? root.querySelector<HTMLElement>(control.selector)!
        : root;
      heights.add(getComputedStyle(el).getPropertyValue(control.property));
    }

    expect([...heights]).toHaveLength(1);
  });
});
