import { defineComponent, h, nextTick, ref, type Ref } from "vue";

import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import { useVirtualTable } from "../../../../src/components/table/composables/useVirtualTable";
import { makeRows } from "../../../setup/table";

/**
 * jsdom gives every element a height of zero, so the virtualizer's window is
 * always empty here and asserting on `virtualItems` would only confirm that.
 * What this file covers is the wiring around it — the scroll listener's
 * lifecycle, and `remeasure`'s contract of measuring plus firing a synthetic
 * scroll event without touching listener registration. The windowing itself is
 * the browser project's job.
 */

function host(data = makeRows(50), options?: Parameters<typeof useVirtualTable>[2]) {
  const scrollContainerRef = ref<HTMLElement | null>(null);
  const rows = ref(data as Record<string, unknown>[]);

  let api!: ReturnType<typeof useVirtualTable>;
  const wrapper = mount(defineComponent({
    setup() {
      api = useVirtualTable(scrollContainerRef, rows, options);
      return () => h("div", { ref: (el) => { scrollContainerRef.value = el as HTMLElement; } });
    },
  }), { attachTo: document.body });

  return { api: () => api, el: () => scrollContainerRef as Ref<HTMLElement | null>, rows, wrapper };
}

const frame = () => new Promise(resolve => requestAnimationFrame(() => resolve(null)));

describe("useVirtualTable", () => {
  describe("shape", () => {
    it("hands back the virtualizer and its derived state", () => {
      const { api } = host();
      expect(api().virtualizer.value).toBeDefined();
      expect(Array.isArray(api().virtualItems.value)).toBe(true);
      expect(typeof api().totalSize.value).toBe("number");
      expect(typeof api().remeasure).toBe("function");
    });

    it("sizes the spacer from the row count and the estimate", () => {
      expect(host(makeRows(10), { estimateSize: 40 }).api().totalSize.value).toBe(400);
    });

    it("defaults the estimate to 50px", () => {
      expect(host(makeRows(10)).api().totalSize.value).toBe(500);
    });

    it("follows the data length", async () => {
      const { api, rows } = host(makeRows(10), { estimateSize: 40 });
      rows.value = makeRows(3) as Record<string, unknown>[];
      await nextTick();
      expect(api().totalSize.value).toBe(120);
    });

    it("is zero for no rows", () => {
      expect(host([]).api().totalSize.value).toBe(0);
    });
  });

  describe("remeasure", () => {
    it("fires a scroll event on the container", async () => {
      const { api, el } = host();
      await frame();

      const onScroll = vi.fn();
      el().value!.addEventListener("scroll", onScroll);

      api().remeasure();
      expect(onScroll).toHaveBeenCalled();
    });

    it("bubbles that event, so an ancestor listener sees it", async () => {
      const { api, el, wrapper } = host();
      await frame();

      const onScroll = vi.fn();
      wrapper.element.parentElement?.addEventListener("scroll", onScroll);

      api().remeasure();
      expect(onScroll).toHaveBeenCalled();
      void el;
    });

    it("asks the virtualizer to measure again", async () => {
      const { api } = host();
      await frame();

      const measure = vi.spyOn(api().virtualizer.value, "measure");
      api().remeasure();
      expect(measure).toHaveBeenCalled();
    });

    it("does nothing when there is no container", () => {
      const rows = ref(makeRows(5) as Record<string, unknown>[]);
      let api!: ReturnType<typeof useVirtualTable>;
      mount(defineComponent({
        setup() {
          api = useVirtualTable(ref(null), rows);
          return () => h("div");
        },
      }));

      expect(() => api.remeasure()).not.toThrow();
    });
  });

  describe("the scroll listener", () => {
    it("is passive, so scrolling is never blocked", async () => {
      const scrollContainerRef = ref<HTMLElement | null>(null);
      const container = document.createElement("div");
      document.body.appendChild(container);
      const add = vi.spyOn(container, "addEventListener");

      mount(defineComponent({
        setup() {
          scrollContainerRef.value = container;
          useVirtualTable(scrollContainerRef, ref(makeRows(5) as Record<string, unknown>[]));
          return () => h("div");
        },
      }));
      await frame();

      expect(add).toHaveBeenCalledWith("scroll", expect.any(Function), { passive: true });
    });

    it("is removed on unmount", async () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const scrollContainerRef = ref<HTMLElement | null>(container);

      const wrapper = mount(defineComponent({
        setup() {
          useVirtualTable(scrollContainerRef, ref(makeRows(5) as Record<string, unknown>[]));
          return () => h("div");
        },
      }));
      await frame();

      const remove = vi.spyOn(container, "removeEventListener");
      wrapper.unmount();
      expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
    });
  });

  describe("measureElement", () => {
    it("is off by default, keeping the estimate authoritative", () => {
      // Dynamic measurement costs a layout read per row; the table opts out
      // unless a caller asks for it.
      expect(host(makeRows(4), { estimateSize: 30 }).api().totalSize.value).toBe(120);
    });

    it("can be turned on without changing the estimate-based total in jsdom", () => {
      // Real measurement needs layout, which jsdom has none of — this only
      // asserts the option is accepted and the fallback is the estimate.
      expect(host(makeRows(4), { estimateSize: 30, measureElement: true }).api().totalSize.value)
        .toBe(120);
    });
  });
});
