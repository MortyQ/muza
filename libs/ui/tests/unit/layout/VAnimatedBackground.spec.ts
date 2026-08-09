import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import VAnimatedBackground from "../../../src/components/layout/VAnimatedBackground.vue";

/**
 * jsdom has no 2D context, and the component guards on that (`if (!ctx) return`),
 * so it mounts without drawing. What is worth asserting here is the structure
 * and the teardown; the painting itself is a canvas and would need a real engine
 * plus a frozen clock to be worth a pixel baseline, so it stays out of the
 * screenshot layer entirely.
 */
describe("VAnimatedBackground", () => {
  it("renders a canvas and a tint layer", () => {
    const w = mount(VAnimatedBackground);
    expect(w.find("canvas.v-animated-background__canvas").exists()).toBe(true);
    expect(w.find(".v-animated-background__tint").exists()).toBe(true);
  });

  it("styles itself through classes, never inline", () => {
    const w = mount(VAnimatedBackground);
    expect(w.find("canvas").attributes("style")).toBeUndefined();
    expect(w.find(".v-animated-background__tint").attributes("style")).toBeUndefined();
  });

  it("survives a missing 2D context", () => {
    // The guard is what makes the component safe under SSR hydration and in
    // any environment without canvas support.
    expect(() => mount(VAnimatedBackground)).not.toThrow();
  });

  it("releases its resize listener and animation frame on unmount", () => {
    const removeEventListener = vi.spyOn(window, "removeEventListener");
    const cancelAnimationFrame = vi.spyOn(window, "cancelAnimationFrame");

    const context = {
      clearRect: vi.fn(),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      fillStyle: "",
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue(context as unknown as CanvasRenderingContext2D);

    const w = mount(VAnimatedBackground);
    w.unmount();

    expect(removeEventListener).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(cancelAnimationFrame).toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it("accepts a blob count without throwing", () => {
    expect(() => mount(VAnimatedBackground, { props: { count: 3, speed: 0 } })).not.toThrow();
  });
});
