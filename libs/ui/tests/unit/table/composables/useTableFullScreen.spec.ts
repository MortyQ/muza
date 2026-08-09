import { defineComponent, h, nextTick, ref, type Ref } from "vue";

import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  useTableFullScreen,
  type UseTableFullScreenOptions,
  type UseTableFullScreenReturn,
} from "../../../../src/components/table/composables/useTableFullScreen";
import { useModalRegisterer } from "../../../../src/composables/useModalRegister";

/**
 * jsdom covers the half of this composable that is arithmetic and state: the
 * panel box derived from the viewport, the chrome subtraction, the Escape
 * handling against the shared modal registry, and the listener lifecycle. The
 * FLIP animation itself — real rects, a real transition — belongs to the
 * browser project; here `getBoundingClientRect` is all zeros and no transition
 * ever ends on its own, so `transitionend` is dispatched by hand.
 *
 * `useModal` keeps a module-level registry that outlives a test, so it is
 * cleared up front: a leftover open entry changes what Escape does next.
 */

const VIEWPORT = { width: 1280, height: 800 };

beforeEach(() => {
  useModalRegisterer().modals.value.clear();
  Object.assign(window, { innerWidth: VIEWPORT.width, innerHeight: VIEWPORT.height });
});

/**
 * An element with a stubbed height, standing in for a toolbar or pagination bar.
 * The getter is redefinable so a test can reflow it mid-run.
 */
function chromeEl(height: number): HTMLElement {
  const el = document.createElement("div");
  let current = height;
  Object.defineProperty(el, "offsetHeight", {
    get: () => current,
    set: (value: number) => { current = value; },
    configurable: true,
  });
  return el;
}

interface HostOptions {
  isEnabled?: boolean
  chromeRefs?: Ref<HTMLElement | null>[]
  withPlaceholder?: boolean
  onToggle?: UseTableFullScreenOptions["onToggle"]
}

function host({ isEnabled = true, chromeRefs, withPlaceholder, onToggle }: HostOptions = {}) {
  const wrapper = document.createElement("div");
  document.body.appendChild(wrapper);

  const wrapperRef = ref<HTMLElement | null>(wrapper);
  const placeholderRef = withPlaceholder
    ? ref<HTMLElement | null>(document.createElement("div"))
    : undefined;

  let api!: UseTableFullScreenReturn;
  const component = mount(defineComponent({
    setup() {
      api = useTableFullScreen({ wrapperRef, isEnabled, placeholderRef, chromeRefs, onToggle });
      return () => h("div");
    },
  }));

  return { api: () => api, wrapper, component };
}

/** The only way a transition finishes in jsdom. */
function finishTransition(el: HTMLElement) {
  const event = new Event("transitionend", { bubbles: true });
  Object.defineProperty(event, "propertyName", { value: "transform" });
  el.dispatchEvent(event);
}

/** Open, then settle the enter animation. */
async function open(api: UseTableFullScreenReturn, el: HTMLElement) {
  api.toggle();
  await nextTick();
  await nextTick();
  finishTransition(el);
}

/** Close, then settle the exit animation. */
async function close(api: UseTableFullScreenReturn, el: HTMLElement) {
  api.toggle();
  await nextTick();
  await nextTick();
  finishTransition(el);
  await nextTick();
}

describe("useTableFullScreen", () => {
  describe("isEnabled", () => {
    it("reflects the option", () => {
      expect(host({ isEnabled: true }).api().isEnabled.value).toBe(true);
      expect(host({ isEnabled: false }).api().isEnabled.value).toBe(false);
    });

    it("does not gate toggling — the flag only controls the button", () => {
      const { api, wrapper } = host({ isEnabled: false });
      api().toggle();
      expect(api().isFullscreen.value).toBe(true);
      void wrapper;
    });
  });

  describe("entering", () => {
    it("starts closed", () => {
      const { api } = host();
      expect(api().isFullscreen.value).toBe(false);
      expect(api().panelStyle.value).toBeNull();
      expect(api().placeholderStyle.value).toBeNull();
      expect(api().contentHeight.value).toBe(0);
    });

    it("flips the flag synchronously, before any animation", () => {
      const { api } = host();
      api().toggle();
      expect(api().isFullscreen.value).toBe(true);
    });

    it("has the final panel geometry on the very first fullscreen render", () => {
      // The geometry is computed before the flag flips, so a consumer never
      // renders one frame at a provisional size.
      const { api } = host();
      api().toggle();

      expect(api().panelStyle.value).toEqual({
        top: "0px",
        left: "0px",
        width: "1280px",
        height: "800px",
      });
    });

    it("derives the panel from the viewport, never from the element", () => {
      Object.assign(window, { innerWidth: 640, innerHeight: 480 });
      const { api } = host();
      api().toggle();

      expect(api().panelStyle.value).toMatchObject({ width: "640px", height: "480px" });
    });

    it("does nothing when there is no wrapper element", () => {
      let api!: UseTableFullScreenReturn;
      mount(defineComponent({
        setup() {
          api = useTableFullScreen({ wrapperRef: ref(null), isEnabled: true });
          return () => h("div");
        },
      }));

      api.toggle();
      expect(api.isFullscreen.value).toBe(false);
    });
  });

  describe("contentHeight", () => {
    it("is the panel height when there is no chrome", () => {
      const { api } = host();
      api().toggle();
      expect(api().contentHeight.value).toBe(800);
    });

    it("subtracts every chrome element", () => {
      const { api } = host({ chromeRefs: [ref(chromeEl(48)), ref(chromeEl(56))] });
      api().toggle();
      expect(api().contentHeight.value).toBe(800 - 48 - 56);
    });

    it("reads the height off a component instance's $el", () => {
      const instance = { $el: chromeEl(60) } as unknown as HTMLElement;
      const { api } = host({ chromeRefs: [ref(instance)] });
      api().toggle();
      expect(api().contentHeight.value).toBe(740);
    });

    it("counts an unmounted chrome ref as zero", () => {
      const { api } = host({ chromeRefs: [ref(null), ref(chromeEl(48))] });
      api().toggle();
      expect(api().contentHeight.value).toBe(752);
    });

    it("is measured before the flag flips, so it is final immediately", () => {
      const { api } = host({ chromeRefs: [ref(chromeEl(48))] });
      api().toggle();
      expect(api().contentHeight.value).toBe(752);
    });

    it("is back to zero once closed", async () => {
      const { api, wrapper } = host({ chromeRefs: [ref(chromeEl(48))] });
      await open(api(), wrapper);
      await close(api(), wrapper);

      expect(api().contentHeight.value).toBe(0);
    });
  });

  describe("placeholderStyle", () => {
    it("carries both dimensions of the slot the wrapper left behind", () => {
      const { api, wrapper } = host();
      vi.spyOn(wrapper, "getBoundingClientRect")
        .mockReturnValue({ width: 900, height: 420, top: 10, left: 20 } as DOMRect);

      api().toggle();
      expect(api().placeholderStyle.value).toEqual({ width: "900px", height: "420px" });
    });

    it("is null while not fullscreen, so the placeholder is not rendered", () => {
      expect(host().api().placeholderStyle.value).toBeNull();
    });
  });

  describe("exiting", () => {
    it("stays open until the transition ends", async () => {
      const { api, wrapper } = host();
      await open(api(), wrapper);

      api().toggle();
      await nextTick();
      await nextTick();
      expect(api().isFullscreen.value).toBe(true);

      finishTransition(wrapper);
      expect(api().isFullscreen.value).toBe(false);
    });

    it("clears the inline styles it applied", async () => {
      const { api, wrapper } = host();
      await open(api(), wrapper);
      await close(api(), wrapper);

      expect(wrapper.style.transform).toBe("");
      expect(wrapper.style.transition).toBe("");
      expect(wrapper.style.transformOrigin).toBe("");
    });

    it("ignores a transitionend for another property", async () => {
      const { api, wrapper } = host();
      await open(api(), wrapper);

      api().toggle();
      await nextTick();
      await nextTick();

      const event = new Event("transitionend", { bubbles: true });
      Object.defineProperty(event, "propertyName", { value: "opacity" });
      wrapper.dispatchEvent(event);

      expect(api().isFullscreen.value).toBe(true);
    });

    it("prefers the placeholder's live rect over the cached one", async () => {
      // The page may have scrolled while fullscreen was open; the cached rect
      // would then aim the exit animation at a slot that has moved.
      const { api, wrapper, component } = host({ withPlaceholder: true });
      await open(api(), wrapper);
      await close(api(), wrapper);

      expect(api().isFullscreen.value).toBe(false);
      void component;
    });
  });

  describe("close()", () => {
    it("closes an open panel", async () => {
      const { api, wrapper } = host();
      await open(api(), wrapper);

      api().close();
      await nextTick();
      await nextTick();
      finishTransition(wrapper);

      expect(api().isFullscreen.value).toBe(false);
    });

    it("does nothing when already closed", () => {
      const { api } = host();
      api().close();
      expect(api().isFullscreen.value).toBe(false);
    });
  });

  describe("Escape", () => {
    const escape = () =>
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    it("is ignored while closed", () => {
      const { api } = host();
      escape();
      expect(api().isFullscreen.value).toBe(false);
    });

    it("closes an open panel", async () => {
      const { api, wrapper } = host();
      await open(api(), wrapper);

      escape();
      await nextTick();
      await nextTick();
      finishTransition(wrapper);

      expect(api().isFullscreen.value).toBe(false);
    });

    it("ignores other keys", async () => {
      const { api, wrapper } = host();
      await open(api(), wrapper);

      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      await nextTick();
      expect(api().isFullscreen.value).toBe(true);
    });

    it("leaves the table alone when a modal sits above it", async () => {
      // The listener is window-level because focus is not guaranteed to be in
      // the table — without the registry check, Escape aimed at a row-action
      // modal would close the table underneath it too.
      const { api, wrapper } = host();
      await open(api(), wrapper);

      const { modals } = useModalRegisterer();
      modals.value.set("row-action", { id: "row-action", isOpen: true, zIndex: 9999 });

      escape();
      await nextTick();
      expect(api().isFullscreen.value).toBe(true);
    });

    it("stops listening once closed", async () => {
      const { api, wrapper } = host();
      await open(api(), wrapper);
      await close(api(), wrapper);

      const spy = vi.spyOn(api(), "toggle");
      escape();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("window resize", () => {
    it("recomputes the panel while fullscreen", async () => {
      const { api, wrapper } = host();
      await open(api(), wrapper);

      Object.assign(window, { innerWidth: 800, innerHeight: 600 });
      window.dispatchEvent(new Event("resize"));

      expect(api().panelStyle.value).toMatchObject({ width: "800px", height: "600px" });
    });

    it("re-measures the chrome, so contentHeight cannot go stale", async () => {
      const toolbar = chromeEl(48);
      const { api, wrapper } = host({ chromeRefs: [ref(toolbar)] });
      await open(api(), wrapper);

      (toolbar as unknown as { offsetHeight: number }).offsetHeight = 96;
      Object.assign(window, { innerHeight: 600 });
      window.dispatchEvent(new Event("resize"));

      expect(api().contentHeight.value).toBe(600 - 96);
    });

    it("is ignored while not fullscreen", () => {
      const { api } = host();
      Object.assign(window, { innerWidth: 300 });
      window.dispatchEvent(new Event("resize"));

      expect(api().panelStyle.value).toBeNull();
    });
  });

  describe("onToggle", () => {
    it("fires with true after opening", async () => {
      const onToggle = vi.fn();
      const { api } = host({ onToggle });

      api().toggle();
      await nextTick();
      await nextTick();

      expect(onToggle).toHaveBeenCalledWith(true);
    });

    it("fires with false after closing", async () => {
      const onToggle = vi.fn();
      const { api, wrapper } = host({ onToggle });
      await open(api(), wrapper);
      onToggle.mockClear();

      await close(api(), wrapper);
      await nextTick();

      expect(onToggle).toHaveBeenCalledWith(false);
    });
  });

  describe("the shared modal entry", () => {
    it("exposes a z-index", () => {
      expect(typeof host().api().zIndex.value).toBe("number");
    });

    it("marks the entry open while fullscreen", async () => {
      const { api } = host();
      api().toggle();
      await nextTick();

      const { modals } = useModalRegisterer();
      expect(modals.value.get("v-table-fullscreen")?.isOpen).toBe(true);
    });

    it("marks it closed again on exit", async () => {
      const { api, wrapper } = host();
      await open(api(), wrapper);
      await close(api(), wrapper);

      const { modals } = useModalRegisterer();
      expect(modals.value.get("v-table-fullscreen")?.isOpen).toBe(false);
    });
  });
});
