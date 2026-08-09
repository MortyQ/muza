import { defineComponent, h, inject, nextTick, ref, watch, watchEffect, type Ref } from "vue";

import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import {
  TABLE_PAGE_KEY,
  useTablePage,
} from "../../../../src/components/table/composables/useTablePage";

/**
 * Mounted rather than run in an effectScope: `useTablePage` calls `provide`,
 * which needs a component instance. That is the whole point of the composable —
 * a page ref a child VTable can find without the parent wiring `v-model:page`.
 */

function host(resetOn: Parameters<typeof useTablePage>[0] = []) {
  let page!: Ref<number>;
  let injected: Ref<number> | undefined;

  const Child = defineComponent({
    name: "PageChild",
    setup() {
      injected = inject(TABLE_PAGE_KEY);
      return () => h("span", String(injected?.value));
    },
  });

  const wrapper = mount(defineComponent({
    name: "PageHost",
    setup() {
      page = useTablePage(resetOn);
      return () => h(Child);
    },
  }));

  return { wrapper, page: () => page, injected: () => injected };
}

describe("useTablePage", () => {
  it("starts on page 1", () => {
    expect(host().page().value).toBe(1);
  });

  it("is a writable ref", () => {
    const { page } = host();
    page().value = 4;
    expect(page().value).toBe(4);
  });

  it("provides the same ref instance to a descendant", () => {
    const { page, injected } = host();
    expect(injected()).toBe(page());
  });

  it("lets a descendant see a write from the parent", async () => {
    const { wrapper, page } = host();
    page().value = 7;
    await nextTick();
    expect(wrapper.text()).toBe("7");
  });

  it("lets a descendant write back to the parent", () => {
    const { page, injected } = host();
    injected()!.value = 3;
    expect(page().value).toBe(3);
  });

  describe("resetOn", () => {
    it("returns to page 1 when a watched source changes", async () => {
      const filters = ref({ brand: "a" });
      const { page } = host([() => filters.value]);

      page().value = 5;
      filters.value = { brand: "b" };
      await nextTick();

      expect(page().value).toBe(1);
    });

    it("watches deeply, so a nested mutation counts", async () => {
      const filters = ref({ nested: { brand: "a" } });
      const { page } = host([filters]);

      page().value = 5;
      filters.value.nested.brand = "b";
      await nextTick();

      expect(page().value).toBe(1);
    });

    it("re-triggers the ref even when already on page 1", async () => {
      // Assigning 1 over 1 is a no-op for a ref, so an effect that reads
      // `page.value` to refetch would silently skip the request the filter
      // change should have caused. `triggerRef` is what prevents that.
      const filters = ref("a");
      const { page } = host([filters]);

      const seen = vi.fn();
      const stop = watchEffect(() => seen(page().value));
      expect(seen).toHaveBeenCalledTimes(1);

      filters.value = "b";
      await nextTick();

      expect(page().value).toBe(1);
      expect(seen).toHaveBeenCalledTimes(2);
      stop();
    });

    it("does not wake a value-comparing `watch` on a same-page reset", () => {
      // The counterpart to the test above, and the reason the composable's
      // contract is "read the ref in an effect", not "watch the ref": `watch`
      // runs its own equality check after the dep fires, so 1 → 1 is dropped
      // before the callback. A consumer that watches instead of reading will
      // miss the reset — worth knowing before debugging a stale request.
      const filters = ref("a");
      const { page } = host([filters]);

      const seen = vi.fn();
      const stop = watch(page(), () => seen());

      filters.value = "b";

      expect(page().value).toBe(1);
      expect(seen).not.toHaveBeenCalled();
      stop();
    });

    it("resets on any of several sources", async () => {
      const a = ref(0);
      const b = ref(0);
      const { page } = host([a, b]);

      page().value = 9;
      b.value = 1;
      await nextTick();
      expect(page().value).toBe(1);

      page().value = 9;
      a.value = 1;
      await nextTick();
      expect(page().value).toBe(1);
    });

    it("registers no watcher when the list is empty", async () => {
      const { page } = host();
      page().value = 5;
      await nextTick();
      expect(page().value).toBe(5);
    });

    it("leaves the page alone until a source actually changes", async () => {
      const filters = ref("a");
      const { page } = host([filters]);

      page().value = 5;
      await nextTick();
      expect(page().value).toBe(5);
    });
  });
});
