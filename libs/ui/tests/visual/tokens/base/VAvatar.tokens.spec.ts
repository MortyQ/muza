import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import VAvatar from "../../../../src/components/base/VAvatar.vue";
import { applyTheme, THEME_CASES } from "../../../setup/theme";
import { computed as computedValue, rawToken, tokenAsColor, tokenAsValue } from "../../../setup/tokens";

/** The five solid tones. Tones 5–7 are colour-mixes and are checked separately. */
const SOLID_TONES = [
  ["v-avatar--tone-0", "--ui-primary", "--ui-primary-foreground"],
  ["v-avatar--tone-1", "--ui-info", "--ui-info-foreground"],
  ["v-avatar--tone-2", "--ui-success", "--ui-success-foreground"],
  ["v-avatar--tone-3", "--ui-warning", "--ui-warning-foreground"],
  ["v-avatar--tone-4", "--ui-danger", "--ui-danger-foreground"],
] as const;

/**
 * Names chosen so their hash lands on each tone — the mapping is deterministic,
 * so this is stable. Recomputed by the test itself rather than trusted blindly.
 */
function nameForTone(tone: number): string {
  for (let i = 0; i < 5000; i++) {
    const candidate = `User${i}`;
    let hash = 0;
    for (let c = 0; c < candidate.length; c++) {
      hash = candidate.charCodeAt(c) + ((hash << 5) - hash);
    }
    if (Math.abs(hash) % 8 === tone) return candidate;
  }
  throw new Error(`no name found for tone ${tone}`);
}

describe.each(THEME_CASES)("VAvatar tokens — %s theme", (theme) => {
  async function renderAvatar(props: Record<string, unknown>): Promise<HTMLElement> {
    await applyTheme(theme);
    const screen = render(VAvatar, { props });
    return screen.container.firstElementChild as HTMLElement;
  }

  it.each(SOLID_TONES)("%s binds background and foreground to %s / %s", async (cls, bg, fg) => {
    const tone = Number(cls.replace("v-avatar--tone-", ""));
    const el = await renderAvatar({ name: nameForTone(tone) });
    expect(el.classList.contains(cls), `expected ${cls} on ${el.className}`).toBe(true);
    expect(computedValue(el, "--v-avatar-bg")).toBe(rawToken(bg));
    expect(computedValue(el, "--v-avatar-fg")).toBe(rawToken(fg));
  });

  it.each([5, 6, 7])("tone %i blends two tokens rather than hardcoding a third colour", async (tone) => {
    const el = await renderAvatar({ name: nameForTone(tone) });
    const bg = computedValue(el, "--v-avatar-bg");
    expect(bg).toContain("color-mix");
    expect(bg).toContain("oklch");
  });

  it("falls back to surface tokens with no name", async () => {
    const el = await renderAvatar({});
    expect(computedValue(el, "--v-avatar-bg")).toBe(rawToken("--ui-surface-raised"));
    expect(computedValue(el, "--v-avatar-fg")).toBe(rawToken("--ui-foreground-secondary"));
  });

  it("renders every tone as a visibly different background", async () => {
    const seen = new Set<string>();
    for (let tone = 0; tone < 8; tone++) {
      const el = await renderAvatar({ name: nameForTone(tone) });
      seen.add(getComputedStyle(el).backgroundColor);
    }
    expect(seen.size).toBe(8);
  });

  describe("shape", () => {
    it("circle uses the full radius token", async () => {
      const el = await renderAvatar({ name: "Ada", shape: "circle" });
      // Through the probe, so the token and the element are compared in the
      // same units — the authored value is a rem, the computed one a px.
      expect(getComputedStyle(el).borderRadius).toBe(tokenAsValue("border-radius", "--ui-radius-full"));
    });

    it("square uses the base radius token", async () => {
      const el = await renderAvatar({ name: "Ada", shape: "square" });
      expect(getComputedStyle(el).borderRadius).toBe(tokenAsValue("border-radius", "--ui-radius"));
    });
  });

  describe("size", () => {
    it("every preset resolves to a different box", async () => {
      const sizes = new Set<string>();
      for (const size of ["xs", "sm", "md", "lg", "xl"] as const) {
        const el = await renderAvatar({ name: "Ada", size });
        sizes.add(getComputedStyle(el).width);
      }
      expect(sizes.size).toBe(5);
    });

    it("customSize overrides the preset", async () => {
      const el = await renderAvatar({ name: "Ada", size: "xs", customSize: 96 });
      expect(getComputedStyle(el).width).toBe("96px");
      expect(getComputedStyle(el).height).toBe("96px");
    });
  });

  it("the online dot is a success token ringed by the surface", async () => {
    const el = await renderAvatar({ name: "Ada", online: true });
    const dot = el.querySelector(".v-avatar__status") as HTMLElement;
    expect(getComputedStyle(dot).backgroundColor).toBe(tokenAsColor("--ui-success"));
    expect(getComputedStyle(dot).boxShadow).toContain(tokenAsColor("--ui-surface"));
  });
});
