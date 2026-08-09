import { type Component } from "vue";

import { render } from "vitest-browser-vue";

import { type ThemeType } from "@muzakit/utils";

import { applyTheme } from "./theme";

export interface StageOptions {
  theme: ThemeType
  props?: Record<string, unknown>
  slots?: Record<string, unknown>
  /** Fixed stage width in px. Keep constant per component across variants. */
  width?: number
}

/**
 * Render a component inside a fixed-size, padded frame and hand back that frame
 * for the screenshot.
 *
 * Screenshotting the component itself would make every baseline resize as soon
 * as its padding changed, so a one-line style tweak reads as a full-image diff.
 * A constant frame keeps the diff local to what actually moved, and the padding
 * keeps outer shadows inside the captured area.
 */
export async function stage(
  component: Component,
  { theme, props = {}, slots = {}, width = 320 }: StageOptions,
): Promise<HTMLElement> {
  await applyTheme(theme);

  const screen = render(component, { props, slots });
  const frame = document.createElement("div");
  frame.className = "screenshot-stage";
  frame.style.width = `${width}px`;
  frame.style.padding = "16px";
  frame.style.display = "flex";
  frame.style.alignItems = "center";
  frame.style.justifyContent = "flex-start";
  frame.style.background = "var(--ui-background)";
  frame.style.boxSizing = "border-box";

  frame.append(...Array.from(screen.container.childNodes));
  document.body.appendChild(frame);

  await document.fonts.ready;
  return frame;
}
