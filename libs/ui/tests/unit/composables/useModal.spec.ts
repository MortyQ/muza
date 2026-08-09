import { defineComponent } from "vue";

import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";

import { useModal } from "../../../src/composables/useModal";
import { useModalRegisterer } from "../../../src/composables/useModalRegister";

/**
 * The registry is a module-level singleton, so it survives between tests in
 * this file. Everything gets cleared up front rather than relying on unmount.
 */
beforeEach(() => {
  const { modals } = useModalRegisterer();
  modals.value.clear();
});

/** useModal needs an owning component for its onBeforeUnmount hook. */
function host(id: string, autoUnregister = true) {
  let api!: ReturnType<typeof useModal>;
  const wrapper = mount(defineComponent({
    setup() {
      api = useModal(id, autoUnregister);
      return () => null;
    },
  }));
  return { api, wrapper };
}

describe("useModalRegisterer", () => {
  it("starts empty", () => {
    expect(useModalRegisterer().modals.value.size).toBe(0);
  });

  it("registers an id once, however many times it is asked", () => {
    const r = useModalRegisterer();
    r.register("a");
    r.register("a");
    expect(r.modals.value.size).toBe(1);
  });

  it("registering does not open", () => {
    const r = useModalRegisterer();
    r.register("a");
    expect(r.isOpen.value("a")).toBe(false);
  });

  it("reports an unknown id as closed rather than throwing", () => {
    expect(useModalRegisterer().isOpen.value("ghost")).toBe(false);
  });

  it("gives an unknown id the base z-index", () => {
    expect(useModalRegisterer().getZIndex.value("ghost")).toBe(1000);
  });

  it("opens an id it has never seen, registering it on the way", () => {
    const r = useModalRegisterer();
    r.open("late");
    expect(r.isOpen.value("late")).toBe(true);
  });

  it("toggles", () => {
    const r = useModalRegisterer();
    r.register("a");
    r.toggle("a");
    expect(r.isOpen.value("a")).toBe(true);
    r.toggle("a");
    expect(r.isOpen.value("a")).toBe(false);
  });

  it("closeAll closes every open modal and leaves them registered", () => {
    const r = useModalRegisterer();
    r.open("a");
    r.open("b");
    r.closeAll();

    expect(r.isOpen.value("a")).toBe(false);
    expect(r.isOpen.value("b")).toBe(false);
    expect(r.modals.value.size).toBe(2);
  });

  it("tracks the open set", () => {
    const r = useModalRegisterer();
    r.open("a");
    r.register("b");

    expect(r.hasOpenModals.value).toBe(true);
    expect(r.openModals.value.map(m => m.id)).toEqual(["a"]);
  });

  it("unregister removes the entry entirely", () => {
    const r = useModalRegisterer();
    r.open("a");
    r.unregister("a");
    expect(r.modals.value.has("a")).toBe(false);
  });

  it("every open modal lands on the same z-index", () => {
    // `zIndexCounter` is a const that is never incremented, so stacking order
    // between two open modals comes down to DOM order rather than z-index.
    // Documented as it stands; changing it is a product decision.
    const r = useModalRegisterer();
    r.open("first");
    r.open("second");
    expect(r.getZIndex.value("first")).toBe(r.getZIndex.value("second"));
  });

  it("raises an opened modal above the base level", () => {
    const r = useModalRegisterer();
    r.open("a");
    expect(r.getZIndex.value("a")).toBeGreaterThan(1000);
  });
});

describe("useModal", () => {
  it("registers its id on creation", () => {
    host("mine");
    expect(useModalRegisterer().modals.value.has("mine")).toBe(true);
  });

  it("opens and closes through its own handles", () => {
    const { api } = host("mine");
    expect(api.isOpen.value).toBe(false);

    api.open();
    expect(api.isOpen.value).toBe(true);

    api.close();
    expect(api.isOpen.value).toBe(false);
  });

  it("two components sharing an id share state", () => {
    const a = host("shared");
    const b = host("shared");

    a.api.open();
    expect(b.api.isOpen.value).toBe(true);
  });

  it("unregisters on unmount", () => {
    const { wrapper } = host("temporary");
    wrapper.unmount();
    expect(useModalRegisterer().modals.value.has("temporary")).toBe(false);
  });

  it("stays registered when asked to", () => {
    const { wrapper } = host("persistent", false);
    wrapper.unmount();
    expect(useModalRegisterer().modals.value.has("persistent")).toBe(true);
  });

  it("exposes the modal record", () => {
    const { api } = host("mine");
    expect(api.modal.value).toMatchObject({ id: "mine", isOpen: false });
  });
});
