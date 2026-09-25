import { nextTick } from "vue";

import { mount, type VueWrapper } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import VButton from "../../../src/components/base/VButton.vue";
import VComposer from "../../../src/components/inputs/VComposer.vue";

/**
 * A collapsed row that grows into a textarea, with the send in the caller's
 * hands: the component emits `submit` and then watches `status` for what
 * happened. Most of what is worth testing here is that transition and the focus
 * that follows it.
 *
 * Not covered: the clipboard button. `useClipboard` needs `navigator.clipboard`
 * defined on the *real* navigator plus a `permissions.query` that resolves — see
 * trap 11 in testing.md and `VScrollPanel.spec.ts`. What is asserted instead is
 * the gate: nothing renders while support is absent, which is this environment.
 */
function composer(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(VComposer, { props, slots, attachTo: document.body });
}

/** The composer is open when the textarea is in the tree. */
const field = (w: VueWrapper) => w.find("textarea");
const row = (w: VueWrapper) => w.find(".v-composer__row");
const buttons = (w: VueWrapper) => w.findAllComponents(VButton);
const byText = (w: VueWrapper, text: string) =>
  buttons(w).find(b => b.props("text") === text);

async function open(w: VueWrapper) {
  await row(w).find("button").trigger("click");
  await nextTick();
  return w;
}

describe("VComposer", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  describe("the collapsed row", () => {
    it("starts collapsed", () => {
      const w = composer();
      expect(row(w).exists()).toBe(true);
      expect(w.classes()).not.toContain("v-composer--open");
    });

    it("shows the preview text", () => {
      const w = composer({ preview: "Buy box lost on 3 ASINs" });
      expect(w.find(".v-composer__preview").text()).toBe("Buy box lost on 3 ASINs");
    });

    it("falls back to the placeholder when there is no preview yet", () => {
      const w = composer({ placeholder: "Add a note" });
      expect(w.find(".v-composer__preview").text()).toBe("Add a note");
    });

    it("lets the preview slot override both", () => {
      const w = composer({ preview: "ignored" }, { preview: "<b>Draft</b>" });
      expect(w.find(".v-composer__preview b").text()).toBe("Draft");
    });

    it("opens on a click anywhere in the row, not only on the button", async () => {
      // The row is a pointer affordance; the CTA inside it is the keyboard one.
      const w = composer();
      await row(w).trigger("click");
      expect(w.classes()).toContain("v-composer--open");
    });

    it("emits expand once per user-initiated open", async () => {
      const w = await open(composer());
      expect(w.emitted("expand")).toHaveLength(1);
    });

    it("does not emit expand for an initial open state", () => {
      const w = composer({ open: true });
      expect(w.emitted("expand")).toBeUndefined();
    });
  });

  describe("the open state", () => {
    it("renders the field and the header", async () => {
      const w = await open(composer());
      expect(field(w).exists()).toBe(true);
      expect(w.find(".v-composer__meta").exists()).toBe(true);
      expect(row(w).exists()).toBe(false);
    });

    it("hands the rows prop straight to the textarea", async () => {
      const w = await open(composer({ rows: 9 }));
      expect(field(w).attributes("rows")).toBe("9");
    });

    it("is two-way through v-model", async () => {
      const w = await open(composer({ modelValue: "Draft" }));
      expect((field(w).element as HTMLTextAreaElement).value).toBe("Draft");

      await field(w).setValue("Edited");
      expect(w.emitted("update:modelValue")?.at(-1)).toEqual(["Edited"]);
    });

    it("is two-way through v-model:open", async () => {
      const w = await open(composer());
      expect(w.emitted("update:open")?.at(-1)).toEqual([true]);
    });

    it("marks the body inert while collapsed, so nothing inside takes focus", () => {
      // VCollapse keeps its content mounted, which is what makes the height
      // animate — without `inert` the textarea would still be tab-reachable.
      const w = composer();
      expect(w.find(".v-composer__body").attributes("inert")).toBeDefined();
    });
  });

  describe("submitting", () => {
    it("emits the current text", async () => {
      const w = await open(composer({ modelValue: "Ship it" }));
      await byText(w, "Send")!.trigger("click");
      expect(w.emitted("submit")?.[0]).toEqual(["Ship it"]);
    });

    it("sends on Cmd/Ctrl+Enter", async () => {
      const w = await open(composer({ modelValue: "Ship it" }));
      await field(w).trigger("keydown", { key: "Enter", metaKey: true });
      expect(w.emitted("submit")?.[0]).toEqual(["Ship it"]);
    });

    it("leaves a bare Enter to the textarea", async () => {
      const w = await open(composer({ modelValue: "Ship it" }));
      await field(w).trigger("keydown", { key: "Enter" });
      expect(w.emitted("submit")).toBeUndefined();
    });

    it("refuses a second submit while one is in flight", async () => {
      const w = await open(composer({ modelValue: "Ship it", status: "sending" }));
      await field(w).trigger("keydown", { key: "Enter", ctrlKey: true });
      expect(w.emitted("submit")).toBeUndefined();
    });

    it("disables the button while sending", async () => {
      const w = await open(composer({ status: "sending" }));
      expect(w.find(".v-composer__submit").attributes("disabled")).toBeDefined();
    });

    it("relabels the button per status", async () => {
      const w = await open(composer({ submitLabel: "Post" }));
      expect(byText(w, "Post")).toBeDefined();

      await w.setProps({ status: "error" });
      expect(byText(w, "Retry")).toBeDefined();
    });
  });

  describe("the sent transition", () => {
    it("collapses when the status goes sending → sent", async () => {
      const w = await open(composer({ status: "sending" }));
      await w.setProps({ status: "sent" });
      await nextTick();
      expect(row(w).exists()).toBe(true);
    });

    it("ignores an arrival at sent that did not come through sending", async () => {
      // A caller may report sent again once the text is edited back to what was
      // sent; that is not a delivery and must not close the composer.
      //
      // Asserted on the collapsed row, not on the textarea: VCollapse keeps its
      // content mounted so the height can animate, so `field()` is there either
      // way and the assertion would pass against a composer that did close.
      const w = await open(composer({ status: "idle" }));
      await w.setProps({ status: "sent" });
      await nextTick();
      expect(row(w).exists()).toBe(false);
    });

    it("turns the collapsed row into a View affordance once sent", async () => {
      const w = composer({ status: "sent" });
      expect(byText(w, "View")).toBeDefined();
      expect(w.classes()).toContain("v-composer--sent");
    });

    it("restores focus even after the disabled Submit dropped it to body", async () => {
      // The reason the component keeps a private `submittedFromInside` flag:
      // VButton disables Submit while `status` is "sending", which blurs it to
      // <body>, so by the time "sent" arrives the live `activeElement` is
      // already outside and would be read as "focus was never in here".
      const w = await open(composer({ modelValue: "Ship it" }));
      await w.find(".v-composer__submit").trigger("click");
      await w.setProps({ status: "sending" });
      (document.activeElement as HTMLElement | null)?.blur();

      await w.setProps({ status: "sent" });
      await nextTick();
      await nextTick();
      expect(document.activeElement).toBe(row(w).find("button").element);
    });

    it("moves focus to the row's button, not the removed textarea", async () => {
      const w = await open(composer({ status: "sending" }));
      await w.setProps({ status: "sent" });
      await nextTick();
      await nextTick();
      expect(document.activeElement).toBe(row(w).find("button").element);
    });
  });

  describe("collapsing", () => {
    it("closes on Escape", async () => {
      const w = await open(composer());
      await field(w).trigger("keydown", { key: "Escape" });
      expect(row(w).exists()).toBe(true);
    });

    it("stops the Escape from travelling to a modal above it", async () => {
      const w = await open(composer());
      const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
      const stopPropagation = vi.spyOn(event, "stopPropagation");
      field(w).element.dispatchEvent(event);
      expect(stopPropagation).toHaveBeenCalled();
    });

    it("closes on the ✕ button", async () => {
      const w = await open(composer());
      await w.find("[aria-label=\"Collapse\"]").trigger("click");
      expect(row(w).exists()).toBe(true);
    });
  });

  describe("the edited marker and Reset", () => {
    it("hides both when there is no baseline to compare against", async () => {
      const w = await open(composer({ modelValue: "Anything" }));
      expect(w.find(".v-composer__edited").exists()).toBe(false);
      expect(w.find(".v-composer__reset").exists()).toBe(false);
    });

    it("shows Reset, disabled, while the text still matches the baseline", async () => {
      const w = await open(composer({ initialValue: "Original", modelValue: "Original" }));
      expect(w.find(".v-composer__edited").exists()).toBe(false);
      expect(w.find(".v-composer__reset").attributes("disabled")).toBeDefined();
    });

    it("marks it edited once the text diverges", async () => {
      const w = await open(composer({ initialValue: "Original", modelValue: "Changed" }));
      expect(w.find(".v-composer__edited").exists()).toBe(true);
      expect(w.find(".v-composer__reset").attributes("disabled")).toBeUndefined();
    });

    it("puts the baseline back", async () => {
      const w = await open(composer({ initialValue: "Original", modelValue: "Changed" }));
      await w.find(".v-composer__reset").trigger("click");
      expect(w.emitted("update:modelValue")?.at(-1)).toEqual(["Original"]);
    });
  });

  describe("validation and helper text", () => {
    it("shows an error string under the field", async () => {
      const w = await open(composer({ error: "Note is required" }));
      expect(w.find(".v-composer__message--error").text()).toBe("Note is required");
      expect(w.classes()).toContain("v-composer--error");
    });

    it("prefers the validation object's first message", async () => {
      const w = await open(composer({
        error: "ignored",
        validation: { $error: true, $errors: [{ $message: "Too short" }] },
      }));
      expect(w.find(".v-composer__message--error").text()).toBe("Too short");
    });

    it("marks the field invalid for assistive tech", async () => {
      const w = await open(composer({ error: "Note is required" }));
      expect(field(w).attributes("aria-invalid")).toBe("true");
    });

    it("shows helper text only while there is no error", async () => {
      const w = await open(composer({ helperText: "Visible to the brand" }));
      expect(w.find(".v-composer__message").text()).toBe("Visible to the brand");

      await w.setProps({ error: "Note is required" });
      expect(w.find(".v-composer__message").text()).toBe("Note is required");
    });

    it("keeps a failed send separate from a validation error", async () => {
      // One is the caller's request, the other is the field's contents; they sit
      // in different places and must not be conflated.
      const w = await open(composer({ status: "error" }));
      expect(w.find(".v-composer__failed").exists()).toBe(true);
      expect(w.find(".v-composer__message--error").exists()).toBe(false);
    });

    it("flags the collapsed row when the send failed", () => {
      const w = composer({ status: "error" });
      expect(w.classes()).toContain("v-composer--failed");
    });
  });

  describe("copy", () => {
    it("renders nothing without clipboard support, even when asked", async () => {
      // The gate is `copyable && canCopy` — a button that cannot copy is worse
      // than no button.
      const w = await open(composer({ copyable: true }));
      expect(w.find("[aria-label=\"Copy to clipboard\"]").exists()).toBe(false);
    });
  });

  describe("slots", () => {
    it("renders #meta in the open header", async () => {
      const w = await open(composer({}, { meta: "<time>2 days ago</time>" }));
      expect(w.find(".v-composer__meta time").text()).toBe("2 days ago");
    });

    it("lets #hint replace the keyboard legend", async () => {
      const w = await open(composer({}, { hint: "Markdown supported" }));
      expect(w.find(".v-composer__hint").text()).toBe("Markdown supported");
    });
  });
});
