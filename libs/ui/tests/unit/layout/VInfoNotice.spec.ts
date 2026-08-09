import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import VIcon from "../../../src/components/base/VIcon.vue";
import VCard from "../../../src/components/layout/VCard.vue";
import VInfoNotice, { type NoticeFeature, type NoticeTone } from "../../../src/components/layout/VInfoNotice.vue";

const TONES: NoticeTone[] = ["primary", "success", "warning", "danger", "info", "muted"];

const FEATURES: NoticeFeature[] = [
  { icon: "lucide:zap", title: "Fast", description: "Under a second", tone: "success" },
  { icon: "lucide:lock", title: "Secure" },
];

const stubs = { Icon: true };

function notice(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(VInfoNotice, { props, slots, global: { stubs } });
}

describe("VInfoNotice", () => {
  describe("wrapper", () => {
    it("wraps itself in a VCard by default", () => {
      expect(notice().findComponent(VCard).exists()).toBe(true);
    });

    it("renders a bare div when card is off", () => {
      const w = notice({ card: false });
      expect(w.findComponent(VCard).exists()).toBe(false);
      expect(w.element.tagName).toBe("DIV");
    });
  });

  describe("default layout", () => {
    it("renders title and subtitle", () => {
      const w = notice({ title: "Heads up", subtitle: "Read this" });
      expect(w.find(".v-info-notice__title").text()).toBe("Heads up");
      expect(w.find(".v-info-notice__subtitle").text()).toBe("Read this");
    });

    it("omits empty text elements", () => {
      const w = notice();
      expect(w.find(".v-info-notice__title").exists()).toBe(false);
      expect(w.find(".v-info-notice__subtitle").exists()).toBe(false);
    });

    it("defaults to the info icon at the primary tone", () => {
      const w = notice({ title: "T" });
      expect(w.find(".v-info-notice__icon").classes()).toContain("v-info-notice--tone-primary");
      expect(w.findComponent(VIcon).props().icon).toBe("lucide:info");
    });

    it.each(TONES)("applies the %s tone to the icon", (tone) => {
      const w = notice({ title: "T", tone });
      expect(w.find(".v-info-notice__icon").classes()).toContain(`v-info-notice--tone-${tone}`);
    });

    it("passes the size through to the icon", () => {
      expect(notice({ title: "T", size: 32 }).findComponent(VIcon).props().size).toBe(32);
    });

    it("renders the default slot as body text", () => {
      const w = notice({}, { default: "<p class='body'>Body</p>" });
      expect(w.find(".body").exists()).toBe(true);
    });

    it("renders the actions slot only when given", () => {
      expect(notice({ title: "T" }).find(".v-info-notice__actions").exists()).toBe(false);
      expect(notice({ title: "T" }, { actions: "<button class='act' />" })
        .find(".act").exists()).toBe(true);
    });

    it("lets the icon slot replace the whole icon block", () => {
      const w = notice({ title: "T" }, { icon: "<b class='custom-icon'>i</b>" });
      expect(w.find(".custom-icon").exists()).toBe(true);
      expect(w.find(".v-info-notice__icon").exists()).toBe(false);
    });

    it("renders no features grid", () => {
      expect(notice({ title: "T" }).find(".v-info-notice__features").exists()).toBe(false);
    });
  });

  describe("feature layout", () => {
    it("switches layout as soon as features are given", () => {
      const w = notice({ title: "T", features: FEATURES });
      expect(w.find(".v-info-notice__stack").exists()).toBe(true);
      expect(w.findAll(".v-info-notice__feature")).toHaveLength(2);
    });

    it("treats an empty feature list as absent", () => {
      const w = notice({ title: "T", features: [] });
      expect(w.find(".v-info-notice__stack").exists()).toBe(false);
    });

    it("renders each feature's title and optional description", () => {
      const w = notice({ features: FEATURES });
      expect(w.findAll(".v-info-notice__feature-title").map(t => t.text()))
        .toEqual(["Fast", "Secure"]);
      expect(w.findAll(".v-info-notice__feature-description")).toHaveLength(1);
    });

    it("tones each feature icon independently, defaulting to primary", () => {
      const w = notice({ features: FEATURES });
      const icons = w.findAll(".v-info-notice__feature-icon");
      expect(icons[0].classes()).toContain("v-info-notice--tone-success");
      expect(icons[1].classes()).toContain("v-info-notice--tone-primary");
    });

    it("drops the head when there is no title or subtitle", () => {
      const w = notice({ features: FEATURES });
      expect(w.find(".v-info-notice__head").exists()).toBe(false);
    });

    describe("hint", () => {
      it("is absent by default", () => {
        expect(notice({ features: FEATURES }).find(".v-info-notice__hint").exists()).toBe(false);
      });

      it("renders the hint text", () => {
        const w = notice({ features: FEATURES, hint: "Applies to new orders only" });
        expect(w.find(".v-info-notice__hint").text()).toBe("Applies to new orders only");
      });

      it("can be slotted instead", () => {
        const w = notice({ features: FEATURES }, { hint: "<b class='custom-hint'>H</b>" });
        expect(w.find(".custom-hint").exists()).toBe(true);
      });
    });
  });
});
