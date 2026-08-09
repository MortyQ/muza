import { defineComponent, ref } from "vue";

import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import { type ListEditorItem } from "../../../src/components/inputs/VListEditor.utils";
import VListEditor from "../../../src/components/inputs/VListEditor.vue";

/**
 * VTooltip must keep rendering its slot: VToggleGroup wraps every button in
 * one, so a plain `true` stub would swallow the whole mode toggle.
 */
const stubs = {
  Icon: true,
  VTooltip: defineComponent({ name: "VTooltipStub", template: "<span><slot /></span>" }),
};

/**
 * Mounted through a host with a real v-model. VListEditor edits the list both
 * by mutating it in place (add/remove a row) and by reassigning it (any bulk
 * edit); only the second emits. Holding the array in the host makes both
 * paths observable through the same value.
 */
function editor(props: Record<string, unknown> = {}) {
  const initial = (props.modelValue ?? [{ text: "" }]) as ListEditorItem[];
  const rest = { ...props };
  delete rest.modelValue;

  const model = ref<ListEditorItem[]>(initial);

  const Host = defineComponent({
    components: { VListEditor },
    setup: () => ({ model, rest }),
    template: "<VListEditor v-model=\"model\" v-bind=\"rest\" />",
  });

  const w = mount(Host, { global: { stubs } });
  return Object.assign(w, { model });
}

const rows = (w: ReturnType<typeof editor>) => w.findAll(".v-input-field");
const currentModel = (w: ReturnType<typeof editor>) => w.model.value;

async function toBulk(w: ReturnType<typeof editor>) {
  await w.findAll(".v-tg__item")[1].trigger("click");
  await flushPromises();
}

describe("VListEditor", () => {
  describe("manual mode", () => {
    it("renders one row per item", () => {
      const w = editor({ modelValue: [{ text: "one" }, { text: "two" }] });
      expect(rows(w)).toHaveLength(2);
    });

    it("numbers the placeholders from the item label", () => {
      const w = editor({ modelValue: [{ text: "" }, { text: "" }], itemLabel: "Win" });
      expect(rows(w).map(r => r.attributes("placeholder"))).toEqual(["Win 1", "Win 2"]);
    });

    it("lets an explicit placeholder override the first row only", () => {
      const w = editor({
        modelValue: [{ text: "" }, { text: "" }],
        itemLabel: "Win",
        placeholder: "Your biggest win",
      });
      expect(rows(w).map(r => r.attributes("placeholder")))
        .toEqual(["Your biggest win", "Win 2"]);
    });

    it("adds a row from the add button", async () => {
      const w = editor({ modelValue: [{ text: "one" }] });
      await w.find(".v-list-editor__add").trigger("click");
      expect(currentModel(w)).toEqual([{ text: "one" }, { text: "" }]);
    });

    it("stops adding at maxItems and disables the button", async () => {
      const w = editor({ modelValue: [{ text: "one" }, { text: "two" }], maxItems: 2 });
      expect(w.find(".v-list-editor__add").attributes("disabled")).toBeDefined();

      await w.find(".v-list-editor__add").trigger("click");
      expect(currentModel(w)).toHaveLength(2);
    });

    it("keeps the last row rather than emptying the list", async () => {
      const w = editor({ modelValue: [{ text: "only" }] });
      const remove = w.find(".v-list-editor__remove");
      if (remove.exists()) await remove.trigger("click");
      expect(currentModel(w)).toHaveLength(1);
    });
  });

  describe("bulk mode", () => {
    it("seeds the textarea from the current items", async () => {
      const w = editor({ modelValue: [{ text: "one" }, { text: "two" }] });
      await toBulk(w);
      expect((w.find("textarea").element as HTMLTextAreaElement).value).toBe("one\ntwo");
    });

    it("splits on newlines", async () => {
      const w = editor({ modelValue: [{ text: "" }] });
      await toBulk(w);
      await w.find("textarea").setValue("alpha\nbeta\ngamma");
      expect(currentModel(w)?.map(i => i.text)).toEqual(["alpha", "beta", "gamma"]);
    });

    it.each([
      ["a,b,c", ["a", "b", "c"]],
      ["a;b;c", ["a", "b", "c"]],
      ["a|b|c", ["a", "b", "c"]],
      ["a/b/c", ["a", "b", "c"]],
      ["a\tb\tc", ["a", "b", "c"]],
      ["a b c", ["a", "b", "c"]],
    ])("splits %j", async (text, expected) => {
      const w = editor({ modelValue: [{ text: "" }] });
      await toBulk(w);
      await w.find("textarea").setValue(text);
      expect(currentModel(w)?.map(i => i.text)).toEqual(expected);
    });

    it("handles several separators at once", async () => {
      const w = editor({ modelValue: [{ text: "" }] });
      await toBulk(w);
      await w.find("textarea").setValue("a,b\nc;d");
      expect(currentModel(w)?.map(i => i.text)).toEqual(["a", "b", "c", "d"]);
    });

    it("trims and drops blanks", async () => {
      const w = editor({ modelValue: [{ text: "" }] });
      await toBulk(w);
      await w.find("textarea").setValue("  a  ,, b ,");
      expect(currentModel(w)?.map(i => i.text)).toEqual(["a", "b"]);
    });

    it("de-duplicates", async () => {
      const w = editor({ modelValue: [{ text: "" }] });
      await toBulk(w);
      await w.find("textarea").setValue("a\nb\na");
      expect(currentModel(w)?.map(i => i.text)).toEqual(["a", "b"]);
    });

    it("truncates each entry to maxLength", async () => {
      const w = editor({ modelValue: [{ text: "" }], maxLength: 3 });
      await toBulk(w);
      await w.find("textarea").setValue("abcdef\nghijkl");
      expect(currentModel(w)?.map(i => i.text)).toEqual(["abc", "ghi"]);
    });

    it("caps the list at maxItems", async () => {
      const w = editor({ modelValue: [{ text: "" }], maxItems: 2 });
      await toBulk(w);
      await w.find("textarea").setValue("a\nb\nc\nd");
      expect(currentModel(w)?.map(i => i.text)).toEqual(["a", "b"]);
    });
  });

  describe("identity across a bulk edit", () => {
    it("keeps the original object — and therefore its server id — for unchanged text", async () => {
      // Losing the id makes a backend consumer delete the row and mint a new
      // one on the next save, which is exactly what reconcileFromText exists
      // to prevent.
      const saved: ListEditorItem[] = [{ text: "alpha", id: 11 }, { text: "beta", id: 22 }];
      const w = editor({ modelValue: saved });
      await toBulk(w);
      await w.find("textarea").setValue("alpha\nbeta");

      expect(currentModel(w)).toEqual([{ text: "alpha", id: 11 }, { text: "beta", id: 22 }]);
    });

    it("keeps ids through a reorder", async () => {
      const saved: ListEditorItem[] = [{ text: "alpha", id: 11 }, { text: "beta", id: 22 }];
      const w = editor({ modelValue: saved });
      await toBulk(w);
      await w.find("textarea").setValue("beta\nalpha");

      expect(currentModel(w)).toEqual([{ text: "beta", id: 22 }, { text: "alpha", id: 11 }]);
    });

    it("mints a bare item for genuinely new text", async () => {
      const saved: ListEditorItem[] = [{ text: "alpha", id: 11 }];
      const w = editor({ modelValue: saved });
      await toBulk(w);
      await w.find("textarea").setValue("alpha\ngamma");

      const model = currentModel(w);
      expect(model?.[0]).toEqual({ text: "alpha", id: 11 });
      expect(Object.keys(model?.[1] ?? {})).toEqual(["text"]);
    });

    it("drops the id of a line that is removed", async () => {
      const saved: ListEditorItem[] = [{ text: "alpha", id: 11 }, { text: "beta", id: 22 }];
      const w = editor({ modelValue: saved });
      await toBulk(w);
      await w.find("textarea").setValue("alpha");

      expect(currentModel(w)).toEqual([{ text: "alpha", id: 11 }]);
    });
  });

  describe("mode toggle", () => {
    it("is shown only when both modes are allowed", () => {
      expect(editor().findAll(".v-tg__item").length).toBeGreaterThan(0);
      expect(editor({ modes: "manual" }).findAll(".v-tg__item")).toHaveLength(0);
      expect(editor({ modes: "bulk" }).findAll(".v-tg__item")).toHaveLength(0);
    });

    it("locks to bulk when that is the only mode", () => {
      expect(editor({ modes: "bulk" }).find("textarea").exists()).toBe(true);
    });

    it("never leaves the list completely empty on the way back to manual", async () => {
      const w = editor({ modelValue: [{ text: "one" }] });
      await toBulk(w);
      await w.find("textarea").setValue("");
      await w.findAll(".v-tg__item")[0].trigger("click");
      await flushPromises();

      expect(currentModel(w)).toEqual([{ text: "" }]);
    });
  });

  describe("validation", () => {
    it("marks the box when the list is invalid", () => {
      const w = editor({ validation: { $error: true, $errors: [{ $message: "Add at least one" }] } });
      expect(w.find(".v-list-editor__box").classes()).toContain("v-list-editor__box--error");
    });

    it("shows the list error message", () => {
      const w = editor({ validation: { $error: true, $errors: [{ $message: "Add at least one" }] } });
      expect(w.text()).toContain("Add at least one");
    });

    it("survives a validation object with no $touch", async () => {
      // A consumer may pass a partial object; the optional call must not throw.
      const w = editor({
        modelValue: [{ text: "a" }, { text: "b" }],
        validation: { $error: false, $errors: [] },
      });
      const remove = w.findAll(".v-list-editor__remove")[0];
      if (remove) {
        await remove.trigger("click");
      }
      expect(w.exists()).toBe(true);
    });

    it("calls $touch after a removal", async () => {
      const $touch = vi.fn();
      const w = editor({
        modelValue: [{ text: "a" }, { text: "b" }],
        validation: { $error: false, $errors: [], $touch },
      });
      const remove = w.findAll(".v-list-editor__remove")[0];
      if (remove) {
        await remove.trigger("click");
        expect($touch).toHaveBeenCalled();
      }
    });

    it("looks a row error up by item, not by index", () => {
      const itemError = vi.fn((item: ListEditorItem) =>
        item.text === "bad" ? "Not allowed" : null);
      editor({ modelValue: [{ text: "ok" }, { text: "bad" }], itemError });

      expect(itemError).toHaveBeenCalledWith(expect.objectContaining({ text: "bad" }), 1);
    });
  });

  it("renders the label", () => {
    expect(editor({ label: "Wins" }).find(".v-list-editor__label").text()).toBe("Wins");
  });

  it("exposes focusRow for the parent", () => {
    const w = editor({ modelValue: [{ text: "a" }] });
    const inner = w.findComponent(VListEditor).vm as unknown as { focusRow: unknown };
    expect(typeof inner.focusRow).toBe("function");
  });
});
