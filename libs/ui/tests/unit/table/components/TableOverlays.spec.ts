import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import VLoader from "../../../../src/components/feedback/VLoader.vue";
import TableBackdrop from "../../../../src/components/table/components/TableBackdrop.vue";
import TableLoadingOverlay from "../../../../src/components/table/components/TableLoadingOverlay.vue";

/**
 * Two mount/unmount-driven overlays with no state of their own. What is worth
 * asserting is that they really do leave the DOM — `Transition` is stubbed with
 * a pass-through in the unit setup precisely because jsdom never fires
 * `transitionend`, which would otherwise leave a "closed" overlay matching its
 * own selector forever.
 */

const overlay = (loading: boolean) =>
  mount(TableLoadingOverlay, { props: { loading } });

const backdrop = (props: { active: boolean, zIndex: number }) =>
  mount(TableBackdrop, { props, global: { stubs: { Teleport: true } } });

describe("TableLoadingOverlay", () => {
  it("renders nothing while not loading", () => {
    expect(overlay(false).find(".v-table-loading-overlay").exists()).toBe(false);
  });

  it("defaults to not loading", () => {
    expect(mount(TableLoadingOverlay).find(".v-table-loading-overlay").exists()).toBe(false);
  });

  it("renders the overlay while loading", () => {
    expect(overlay(true).find(".v-table-loading-overlay").exists()).toBe(true);
  });

  it("shows a backdrop and a spinner", () => {
    const w = overlay(true);
    expect(w.find(".v-table-loading-backdrop").exists()).toBe(true);
    expect(w.findComponent(VLoader).exists()).toBe(true);
  });

  it("uses the large loader", () => {
    expect(overlay(true).findComponent(VLoader).props("size")).toBe("lg");
  });

  it("leaves the DOM when loading ends", async () => {
    const w = overlay(true);
    await w.setProps({ loading: false });
    expect(w.find(".v-table-loading-overlay").exists()).toBe(false);
  });
});

describe("TableBackdrop", () => {
  it("renders nothing while inactive", () => {
    expect(backdrop({ active: false, zIndex: 100 })
      .find(".v-table-fullscreen-backdrop").exists()).toBe(false);
  });

  it("renders while active", () => {
    expect(backdrop({ active: true, zIndex: 100 })
      .find(".v-table-fullscreen-backdrop").exists()).toBe(true);
  });

  it("takes its stacking order from the prop", () => {
    expect(backdrop({ active: true, zIndex: 1042 })
      .find(".v-table-fullscreen-backdrop").attributes("style")).toBe("z-index: 1042;");
  });

  it("emits click when tapped", async () => {
    const w = backdrop({ active: true, zIndex: 100 });
    await w.find(".v-table-fullscreen-backdrop").trigger("click");
    expect(w.emitted("click")).toHaveLength(1);
  });

  it("leaves the DOM when deactivated", async () => {
    const w = backdrop({ active: true, zIndex: 100 });
    await w.setProps({ active: false });
    expect(w.find(".v-table-fullscreen-backdrop").exists()).toBe(false);
  });

  it("stops emitting once gone", async () => {
    const w = backdrop({ active: true, zIndex: 100 });
    await w.setProps({ active: false });
    expect(w.emitted("click")).toBeUndefined();
  });
});
