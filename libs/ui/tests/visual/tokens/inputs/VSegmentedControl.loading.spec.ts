import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import VSegmentedControl, {
  type SegmentOption,
} from "../../../../src/components/inputs/VSegmentedControl.vue";
import { applyTheme, THEME_CASES } from "../../../setup/theme";
import { tokenAsColor } from "../../../setup/tokens";

const OPTIONS: SegmentOption[] = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
];

describe.each(THEME_CASES)("VSegmentedControl loading — %s theme", (theme) => {
  async function renderControl(props: Record<string, unknown> = {}): Promise<HTMLElement> {
    await applyTheme(theme);
    const screen = render(VSegmentedControl, {
      props: { options: OPTIONS, modelValue: "day", ...props },
    });
    return screen.container.firstElementChild as HTMLElement;
  }

  const items = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>(".v-sc__item")];

  it("does not move the control when the write starts", async () => {
    // The pill has nothing to slide to, because nothing changes width.
    const idle = await renderControl();
    const idleWidths = items(idle).map(i => i.getBoundingClientRect().width);
    const idleHeight = idle.getBoundingClientRect().height;

    const busy = await renderControl({ loading: true });
    expect(items(busy).map(i => i.getBoundingClientRect().width)).toEqual(idleWidths);
    expect(busy.getBoundingClientRect().height).toBe(idleHeight);
  });

  it("keeps the label in flow and only fades it", async () => {
    const busy = await renderControl({ loading: true });
    const label = items(busy)[0].querySelector<HTMLElement>(".v-sc__label")!;
    expect(getComputedStyle(label).opacity).toBe("0");
    expect(getComputedStyle(label).display).not.toBe("none");
    expect(label.getBoundingClientRect().width).toBeGreaterThan(0);
  });

  it("centres the spinner over the segment", async () => {
    const busy = await renderControl({ loading: true });
    const item = items(busy)[0].getBoundingClientRect();
    const spinner = items(busy)[0].querySelector<HTMLElement>(".v-sc__spinner")!
      .getBoundingClientRect();
    expect(Math.round(spinner.left + spinner.width / 2))
      .toBe(Math.round(item.left + item.width / 2));
  });

  it("tints the spinner with the foreground token, not a status colour", async () => {
    const busy = await renderControl({ loading: true });
    const spinner = items(busy)[0].querySelector<HTMLElement>(".v-sc__spinner")!;
    expect(getComputedStyle(spinner).color).toBe(tokenAsColor("--ui-foreground"));
  });

  it("recesses the other segments without dimming the whole control", async () => {
    // The `--disabled` treatment would say the control is unavailable, when in
    // fact it is busy with what was just asked of it.
    const busy = await renderControl({ loading: true });
    expect(getComputedStyle(busy).opacity).toBe("1");
    expect(getComputedStyle(items(busy)[1]).opacity).toBe("0.55");
    expect(getComputedStyle(items(busy)[0]).opacity).toBe("1");
  });

  it("says so with the cursor", async () => {
    const busy = await renderControl({ loading: true });
    expect(getComputedStyle(items(busy)[0]).cursor).toBe("progress");
  });

  it("leaves the idle control untouched", async () => {
    const idle = await renderControl();
    expect(idle.querySelector(".v-sc__spinner")).toBeNull();
    expect(getComputedStyle(items(idle)[1]).opacity).toBe("1");
    expect(getComputedStyle(items(idle)[0]).cursor).toBe("pointer");
  });

  it("still paints the active pill while busy", async () => {
    const busy = await renderControl({ loading: true });
    expect(getComputedStyle(items(busy)[0]).backgroundColor)
      .toBe(tokenAsColor("--ui-surface"));
  });
});
