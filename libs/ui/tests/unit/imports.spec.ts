import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Importing the library must not touch the host page. An app that imports one button should not
 * find its `<html data-theme>` rewritten, its localStorage written, or an IndexedDB opened for a
 * table it never renders. Each case loads the entry point fresh, the way an app does.
 */
describe("importing @muzakit/ui", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("leaves the page's theme attribute alone", async () => {
    document.documentElement.dataset.theme = "host-theme";
    await import("../../src/index");
    expect(document.documentElement.dataset.theme).toBe("host-theme");
  });

  it("writes nothing to localStorage", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    await import("../../src/index");
    expect(setItem).not.toHaveBeenCalled();
  });

  it("opens no IndexedDB database", async () => {
    const open = vi.spyOn(indexedDB, "open");
    await import("../../src/index");
    expect(open).not.toHaveBeenCalled();
  });

  it("still applies the theme once an app asks for it", async () => {
    const { useTheme } = await import("@muzakit/utils");
    useTheme().setTheme("dark");
    await Promise.resolve();
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("muzakit-theme")).toBe("dark");
  });
});
