import { mount } from "@vue/test-utils";
import { Settings } from "luxon";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import VDate from "../../../src/components/base/VDate.vue";

/**
 * The zone is pinned rather than left to the machine: the component's entire
 * reason to exist is that it renders in the *reader's* zone, so a test that runs
 * in whatever zone CI happens to have would assert nothing about that.
 *
 * New York is deliberately behind UTC, so a UTC afternoon lands on the same
 * calendar day locally while a UTC early morning does not — which is the
 * off-by-a-day case the `title` exists to settle.
 */
const ZONE = "America/New_York";

function date(props: Record<string, unknown> = {}) {
  return mount(VDate, { props });
}

describe("VDate", () => {
  let previousZone: string;

  beforeAll(() => {
    previousZone = Settings.defaultZone.name;
    Settings.defaultZone = ZONE;
  });

  afterAll(() => {
    Settings.defaultZone = previousZone;
  });

  it("renders a <time> carrying the raw ISO string", () => {
    const w = date({ value: "2026-03-14T18:40:00Z" });
    expect(w.element.tagName).toBe("TIME");
    expect(w.attributes("datetime")).toBe("2026-03-14T18:40:00Z");
  });

  it("shows the value in the reader's zone, not UTC", () => {
    // 18:40 UTC is 14:40 in New York (EDT, UTC-4).
    expect(date({ value: "2026-03-14T18:40:00Z" }).text()).toBe("03/14/2026, 2:40 PM");
  });

  it("keeps the UTC original in the title", () => {
    expect(date({ value: "2026-03-14T18:40:00Z" }).attributes("title"))
      .toBe("2026-03-14 18:40:00 UTC");
  });

  it("titles the UTC day even when it differs from the local one", () => {
    // 01:00 UTC on the 15th is 21:00 on the 14th in New York. The rendered date
    // and the title date disagree on purpose — that is the argument the title
    // exists to settle.
    const w = date({ value: "2026-03-15T01:00:00Z" });
    expect(w.text()).toBe("03/14/2026, 9:00 PM");
    expect(w.attributes("title")).toBe("2026-03-15 01:00:00 UTC");
  });

  it("honours a custom luxon format", () => {
    expect(date({ value: "2026-03-14T18:40:00Z", format: "yyyy-MM-dd" }).text())
      .toBe("2026-03-14");
  });

  describe("absence", () => {
    it.each([[null], [undefined], [""]])("renders an em dash for %s", (value) => {
      const w = date({ value });
      expect(w.element.tagName).toBe("SPAN");
      expect(w.text()).toBe("—");
      expect(w.classes()).toContain("v-date__empty");
      // No <time>, so nothing to carry a datetime or a title.
      expect(w.attributes("title")).toBeUndefined();
    });

    it("defaults to absent when no value is passed at all", () => {
      expect(date().text()).toBe("—");
    });
  });

  describe("an unparseable string", () => {
    it("falls through to the em dash rather than echoing the input", () => {
      // In a table column the raw text is a value the reader cannot act on
      // either way — but it stays in `datetime` for anyone inspecting the DOM.
      const w = date({ value: "not a date" });
      expect(w.element.tagName).toBe("TIME");
      expect(w.text()).toBe("—");
      expect(w.attributes("datetime")).toBe("not a date");
    });

    it("puts the raw string in the title, since there is no UTC form of it", () => {
      expect(date({ value: "not a date" }).attributes("title")).toBe("not a date");
    });
  });
});
