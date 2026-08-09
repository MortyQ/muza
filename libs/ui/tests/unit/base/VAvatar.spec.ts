import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import VAvatar from "../../../src/components/base/VAvatar.vue";

describe("VAvatar", () => {
  describe("initials", () => {
    it.each([
      ["Ada Lovelace", "AL"],
      ["ada lovelace", "AL"],
      ["  Ada   Lovelace  ", "AL"],
      ["Ada Byron King Lovelace", "AB"],
      ["Ada", "AD"],
      ["a", "A"],
    ])("renders %s as %s", (name, expected) => {
      const w = mount(VAvatar, { props: { name } });
      expect(w.find(".v-avatar__initials").text()).toBe(expected);
    });

    it("falls back to a question mark with no name", () => {
      const w = mount(VAvatar, {});
      expect(w.find(".v-avatar__initials").text()).toBe("?");
    });
  });

  describe("tone", () => {
    it("gives the same name the same tone every time", () => {
      const first = mount(VAvatar, { props: { name: "Ada Lovelace" } }).classes();
      const second = mount(VAvatar, { props: { name: "Ada Lovelace" } }).classes();
      expect(first).toEqual(second);
      expect(first.some(c => c.startsWith("v-avatar--tone-"))).toBe(true);
    });

    it("stays inside the eight available tones", () => {
      const tones = new Set<string>();
      for (const name of ["Ada", "Grace", "Alan", "Edsger", "Barbara", "Donald", "Ken", "Dennis", "Linus", "Guido"]) {
        const tone = mount(VAvatar, { props: { name } })
          .classes()
          .find(c => c.startsWith("v-avatar--tone-"));
        expect(tone).toBeDefined();
        tones.add(tone as string);
      }
      for (const tone of tones) {
        const index = Number(tone.replace("v-avatar--tone-", ""));
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(8);
      }
    });

    it("marks a nameless avatar as empty rather than toned", () => {
      const w = mount(VAvatar, {});
      expect(w.classes()).toContain("v-avatar--empty");
      expect(w.classes().some(c => c.startsWith("v-avatar--tone-"))).toBe(false);
    });

    it("drops the tone once an image is showing", () => {
      const w = mount(VAvatar, { props: { name: "Ada", avatar: "/a.png" } });
      expect(w.classes().some(c => c.startsWith("v-avatar--tone-"))).toBe(false);
    });
  });

  describe("image", () => {
    it("renders the image instead of initials", () => {
      const w = mount(VAvatar, { props: { name: "Ada", avatar: "/a.png", alt: "Ada" } });
      expect(w.find("img").attributes("src")).toBe("/a.png");
      expect(w.find("img").attributes("alt")).toBe("Ada");
      expect(w.find(".v-avatar__initials").exists()).toBe(false);
    });

    it("falls back to initials when the image fails", async () => {
      const w = mount(VAvatar, { props: { name: "Ada Lovelace", avatar: "/missing.png" } });
      await w.find("img").trigger("error");
      expect(w.find("img").exists()).toBe(false);
      expect(w.find(".v-avatar__initials").text()).toBe("AL");
    });

    it("retries when the src changes after a failure", async () => {
      const w = mount(VAvatar, { props: { name: "Ada", avatar: "/missing.png" } });
      await w.find("img").trigger("error");
      expect(w.find("img").exists()).toBe(false);

      await w.setProps({ avatar: "/present.png" });
      expect(w.find("img").attributes("src")).toBe("/present.png");
    });
  });

  describe("presentation", () => {
    it.each(["xs", "sm", "md", "lg", "xl"] as const)("applies the %s size class", (size) => {
      expect(mount(VAvatar, { props: { size } }).classes()).toContain(`v-avatar--${size}`);
    });

    it.each(["circle", "square"] as const)("applies the %s shape class", (shape) => {
      expect(mount(VAvatar, { props: { shape } }).classes()).toContain(`v-avatar--${shape}`);
    });

    it("hands a custom size to CSS as a variable, not as a width", () => {
      const w = mount(VAvatar, { props: { customSize: 72 } });
      expect(w.attributes("style")).toContain("--v-avatar-size: 72px");
      expect(w.attributes("style")).not.toContain("width:");
    });

    it("sets no inline style without a custom size", () => {
      expect(mount(VAvatar, {}).attributes("style")).toBeUndefined();
    });

    it("shows the status dot only when online", () => {
      expect(mount(VAvatar, {}).find(".v-avatar__status").exists()).toBe(false);
      const online = mount(VAvatar, { props: { online: true } });
      expect(online.find(".v-avatar__status").attributes("aria-label")).toBe("Online");
    });
  });
});
