import { defineComponent } from "vue";

import { config } from "@vue/test-utils";
import { beforeEach, vi } from "vitest";

// jsdom ships neither observer, and several components construct one at setup
// time — without these the component throws before a single assertion runs.
class ObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): [] {
    return [];
  }
}

vi.stubGlobal("ResizeObserver", ObserverStub);
vi.stubGlobal("IntersectionObserver", ObserverStub);

// jsdom's matchMedia is missing entirely. `matches: false` makes the default
// theme resolve to light, which is what the components assume.
vi.stubGlobal("matchMedia", (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
}));

/**
 * Transitions are replaced by pass-throughs rather than left alone. jsdom never
 * fires `transitionend`, so a leaving element sits in the DOM forever: a closed
 * modal still matches its selector, and a removed list row keeps being counted.
 * The stubs render their slot, so an element that Vue removed is actually gone.
 */
const passThrough = (name: string) =>
  defineComponent({ name, setup: (_, { slots }) => () => slots.default?.() });

config.global.stubs = {
  // Teleported content lands outside the wrapper, so tests would have to reach
  // into document.body for it. Stubbing Teleport keeps it inline and
  // assertable. Overlay behaviour that genuinely depends on portalling belongs
  // in the browser project, not here.
  Teleport: true,
  Transition: passThrough("TransitionStub"),
  TransitionGroup: passThrough("TransitionGroupStub"),
};

beforeEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
});
