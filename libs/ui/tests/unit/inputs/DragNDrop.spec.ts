import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import VIcon from "../../../src/components/base/VIcon.vue";
import DragNDrop from "../../../src/components/inputs/DragNDrop.vue";
import { dropPayload, makeFile, setInputFiles } from "../../setup/files";

// The TransitionGroup around the file list is handled by the global setup,
// which replaces it with a pass-through so removed rows really leave the DOM.
const stubs = { Icon: true, VButton: true, VLoader: true };

function dnd(props: Record<string, unknown> = {}) {
  return mount(DragNDrop, { props, global: { stubs } });
}

const zone = (w: ReturnType<typeof dnd>) => w.find(".v-dragndrop__dropzone");
const input = (w: ReturnType<typeof dnd>) => w.find("input[type=file]");
const names = (w: ReturnType<typeof dnd>) =>
  w.findAll(".v-dragndrop__file-name").map(n => n.text());

async function drop(w: ReturnType<typeof dnd>, files: File[]) {
  await zone(w).trigger("drop", dropPayload(files));
}

describe("DragNDrop", () => {
  describe("selection", () => {
    it("takes a dropped file and lists it", async () => {
      const w = dnd();
      await drop(w, [makeFile("report.pdf")]);
      expect(names(w)).toEqual(["report.pdf"]);
      expect(w.emitted("upload")?.[0]?.[0]).toHaveLength(1);
    });

    it("takes a file chosen through the input", async () => {
      const w = dnd();
      setInputFiles(input(w).element as HTMLInputElement, [makeFile("report.pdf")]);
      await input(w).trigger("change");
      expect(names(w)).toEqual(["report.pdf"]);
    });

    it("clears the input afterwards, so the same file can be picked twice", async () => {
      const w = dnd();
      const el = input(w).element as HTMLInputElement;
      setInputFiles(el, [makeFile("report.pdf")]);
      await input(w).trigger("change");
      expect(el.value).toBe("");
    });

    it("replaces the file in single mode", async () => {
      const w = dnd();
      await drop(w, [makeFile("one.pdf")]);
      await drop(w, [makeFile("two.pdf")]);
      expect(names(w)).toEqual(["two.pdf"]);
    });

    it("keeps only the first of a multi-file drop in single mode", async () => {
      const w = dnd();
      await drop(w, [makeFile("one.pdf"), makeFile("two.pdf")]);
      expect(names(w)).toEqual(["one.pdf"]);
    });

    it("accumulates in multiple mode", async () => {
      const w = dnd({ multiple: true });
      await drop(w, [makeFile("one.pdf")]);
      await drop(w, [makeFile("two.pdf")]);
      expect(names(w)).toEqual(["one.pdf", "two.pdf"]);
    });
  });

  describe("limits", () => {
    it("rejects an oversized file by name", async () => {
      const w = dnd({ maxSize: 1024 });
      await drop(w, [makeFile("huge.pdf", 4096)]);

      expect(names(w)).toEqual([]);
      expect(String(w.emitted("error")?.[0]?.[0])).toContain("huge.pdf");
    });

    it("keeps the files that do fit and only complains about the rest", async () => {
      const w = dnd({ multiple: true, maxSize: 1024 });
      await drop(w, [makeFile("ok.pdf", 512), makeFile("huge.pdf", 4096)]);

      expect(names(w)).toEqual(["ok.pdf"]);
      expect(w.emitted("error")).toHaveLength(1);
    });

    it("stops at maxFiles and says so", async () => {
      const w = dnd({ multiple: true, maxFiles: 2 });
      await drop(w, [makeFile("a.pdf"), makeFile("b.pdf"), makeFile("c.pdf")]);

      expect(names(w)).toEqual(["a.pdf", "b.pdf"]);
      expect(String(w.emitted("error")?.[0]?.[0])).toContain("Maximum 2");
    });

    it("keeps refusing once the list is full", async () => {
      const w = dnd({ multiple: true, maxFiles: 1 });
      await drop(w, [makeFile("a.pdf")]);
      await drop(w, [makeFile("b.pdf")]);
      expect(names(w)).toEqual(["a.pdf"]);
    });
  });

  describe("removal", () => {
    it("drops the chosen file and re-announces the list", async () => {
      const w = dnd({ multiple: true });
      await drop(w, [makeFile("a.pdf"), makeFile("b.pdf")]);
      await w.findAll(".v-dragndrop__file-remove")[0].trigger("click");

      expect(names(w)).toEqual(["b.pdf"]);
      expect((w.emitted("upload")?.at(-1)?.[0] as File[]).map(f => f.name)).toEqual(["b.pdf"]);
    });
  });

  describe("blocked states", () => {
    it.each([{ disabled: true }, { loading: true }])("%o ignores a drop", async (props) => {
      const w = dnd(props);
      await drop(w, [makeFile("a.pdf")]);
      expect(names(w)).toEqual([]);
    });

    it("marks the dropzone", () => {
      expect(zone(dnd({ disabled: true })).classes())
        .toContain("v-dragndrop__dropzone--disabled");
    });

    it("does not enter the dragging state", async () => {
      const w = dnd({ disabled: true });
      await zone(w).trigger("dragover");
      expect(zone(w).classes()).not.toContain("v-dragndrop__dropzone--dragging");
    });
  });

  describe("dragging", () => {
    it("marks the zone on dragover and clears it on leave", async () => {
      const w = dnd();
      await zone(w).trigger("dragover");
      expect(zone(w).classes()).toContain("v-dragndrop__dropzone--dragging");

      await zone(w).trigger("dragleave");
      expect(zone(w).classes()).not.toContain("v-dragndrop__dropzone--dragging");
    });
  });

  describe("submit button", () => {
    it("is absent unless asked for", async () => {
      const w = dnd();
      await drop(w, [makeFile("a.pdf")]);
      expect(w.emitted("submit")).toBeUndefined();
    });

    it("emits submit with a done callback that empties the list", async () => {
      const w = dnd({ button: true });
      await drop(w, [makeFile("a.pdf")]);

      const button = w.findComponent({ name: "VButton" });
      button.vm.$emit("click");
      await w.vm.$nextTick();

      const emitted = w.emitted("submit");
      if (emitted) {
        const [, done] = emitted[0] as [File[], () => void];
        done();
        await w.vm.$nextTick();
        expect(names(w)).toEqual([]);
      }
    });
  });

  it("marks the zone once it holds files", async () => {
    const w = dnd();
    expect(zone(w).classes()).not.toContain("v-dragndrop__dropzone--has-files");
    await drop(w, [makeFile("a.pdf")]);
    expect(zone(w).classes()).toContain("v-dragndrop__dropzone--has-files");
  });

  it("passes accept and multiple to the input", () => {
    const w = dnd({ accept: "application/pdf", multiple: true });
    expect(input(w).attributes("accept")).toBe("application/pdf");
    expect(input(w).attributes("multiple")).toBeDefined();
  });

  describe("file icons", () => {
    it.each([
      ["report.pdf", "mdi:file-pdf-box"],
      ["sheet.xlsx", "mdi:file-excel-box"],
      ["photo.PNG", "mdi:file-image"],
      ["archive.zip", "mdi:folder-zip"],
      ["mystery.qqq", "mdi:file-document-outline"],
    ])("picks the icon for %s", async (name, icon) => {
      // Iconify renders an empty <svg> until it has fetched the glyph, so the
      // name is only visible on the VIcon props, not in the markup.
      const w = dnd();
      await drop(w, [makeFile(name)]);
      const rowIcon = w.find(".v-dragndrop__file-icon").findComponent(VIcon);
      expect(rowIcon.props().icon).toBe(icon);
    });
  });
});
