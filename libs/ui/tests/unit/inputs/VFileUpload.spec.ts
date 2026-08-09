import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import VFileUpload from "../../../src/components/inputs/VFileUpload.vue";
import { dropPayload, makeFile, setInputFiles } from "../../setup/files";

const stubs = { Icon: true };

function upload(props: Record<string, unknown> = {}) {
  return mount(VFileUpload, { props, global: { stubs } });
}

const dropzone = (w: ReturnType<typeof upload>) => w.find(".v-file-upload__dropzone");
const input = (w: ReturnType<typeof upload>) => w.find("input[type=file]");

async function drop(w: ReturnType<typeof upload>, files: File[]) {
  await dropzone(w).trigger("drop", dropPayload(files));
}

async function pick(w: ReturnType<typeof upload>, files: File[]) {
  setInputFiles(input(w).element as HTMLInputElement, files);
  await input(w).trigger("change");
}

describe("VFileUpload", () => {
  describe("selection", () => {
    it("accepts a dropped file", async () => {
      const w = upload();
      await drop(w, [makeFile("a.png")]);
      expect(w.emitted("change")?.[0]?.[0]).toHaveLength(1);
    });

    it("accepts a file chosen through the input", async () => {
      const w = upload();
      await pick(w, [makeFile("a.png")]);
      expect(w.emitted("change")?.[0]?.[0]).toHaveLength(1);
    });

    it("keeps only the first file in single mode", async () => {
      const w = upload();
      await drop(w, [makeFile("a.png"), makeFile("b.png")]);
      expect((w.emitted("change")?.[0]?.[0] as File[]).map(f => f.name)).toEqual(["a.png"]);
    });

    it("replaces the previous file in single mode", async () => {
      const w = upload();
      await drop(w, [makeFile("a.png")]);
      await drop(w, [makeFile("b.png")]);
      expect((w.emitted("change")?.at(-1)?.[0] as File[]).map(f => f.name)).toEqual(["b.png"]);
    });

    it("appends in multiple mode", async () => {
      const w = upload({ multiple: true });
      await drop(w, [makeFile("a.png")]);
      await drop(w, [makeFile("b.png")]);
      expect((w.emitted("change")?.at(-1)?.[0] as File[]).map(f => f.name))
        .toEqual(["a.png", "b.png"]);
    });

    it("ignores an empty drop", async () => {
      const w = upload();
      await drop(w, []);
      expect(w.emitted("change")).toBeUndefined();
    });
  });

  describe("size limit", () => {
    it("rejects an oversized file with a readable message", async () => {
      const w = upload({ maxSize: 1024 });
      await drop(w, [makeFile("big.png", 2048)]);

      expect(w.emitted("change")).toBeUndefined();
      expect(String(w.emitted("error")?.[0]?.[0])).toContain("exceeds limit");
    });

    it("rejects the whole batch when any file is too big", async () => {
      const w = upload({ multiple: true, maxSize: 1024 });
      await drop(w, [makeFile("ok.png", 512), makeFile("big.png", 2048)]);
      expect(w.emitted("change")).toBeUndefined();
    });

    it("accepts a file exactly at the limit", async () => {
      const w = upload({ maxSize: 1024 });
      await drop(w, [makeFile("edge.png", 1024)]);
      expect(w.emitted("change")).toHaveLength(1);
    });
  });

  describe("blocked states", () => {
    it.each([{ disabled: true }, { loading: true }])("%o ignores a drop", async (props) => {
      const w = upload(props);
      await drop(w, [makeFile("a.png")]);
      expect(w.emitted("change")).toBeUndefined();
    });

    it("marks the dropzone", () => {
      expect(dropzone(upload({ disabled: true })).classes())
        .toContain("v-file-upload__dropzone--disabled");
      expect(dropzone(upload({ loading: true })).classes())
        .toContain("v-file-upload__dropzone--loading");
    });
  });

  describe("immediate mode", () => {
    it("hands the file straight over instead of keeping a list", async () => {
      const w = upload({ immediate: true });
      const file = makeFile("a.png");
      await drop(w, [file]);

      expect((w.emitted("file-select")?.[0]?.[0] as File).name).toBe("a.png");
      expect(w.emitted("upload")).toHaveLength(1);
      expect(w.emitted("change")).toBeUndefined();
    });

    it("reports null when the drop is empty of usable files", async () => {
      const w = upload({ immediate: true });
      await dropzone(w).trigger("drop", dropPayload([]));
      expect(w.emitted("file-select")).toBeUndefined();
    });
  });

  describe("upload event", () => {
    it("comes with a reset callback that empties the list", async () => {
      const w = upload({ multiple: true });
      await drop(w, [makeFile("a.png")]);

      const [, reset] = w.emitted("upload")?.[0] as [File[], () => void];
      expect(typeof reset).toBe("function");

      reset();
      await w.vm.$nextTick();
      await drop(w, [makeFile("b.png")]);
      expect((w.emitted("change")?.at(-1)?.[0] as File[]).map(f => f.name)).toEqual(["b.png"]);
    });
  });

  describe("dragging", () => {
    it("marks the dropzone while a file is over it, and clears on leave", async () => {
      const w = upload();
      await dropzone(w).trigger("dragenter");
      expect(dropzone(w).classes()).toContain("v-file-upload__dropzone--dragging");

      await dropzone(w).trigger("dragleave");
      expect(dropzone(w).classes()).not.toContain("v-file-upload__dropzone--dragging");
    });

    it("clears the marker after a drop", async () => {
      const w = upload();
      await dropzone(w).trigger("dragover");
      await drop(w, [makeFile("a.png")]);
      expect(dropzone(w).classes()).not.toContain("v-file-upload__dropzone--dragging");
    });
  });

  it("passes accept and multiple to the input", () => {
    const w = upload({ accept: "image/*", multiple: true });
    expect(input(w).attributes("accept")).toBe("image/*");
    expect(input(w).attributes("multiple")).toBeDefined();
  });

  it("renders the compact variant", () => {
    expect(dropzone(upload({ variant: "compact" })).classes())
      .toContain("v-file-upload__dropzone--compact");
  });

  it("exposes reset to the parent", () => {
    const w = upload();
    expect(typeof (w.vm as unknown as { reset: unknown }).reset).toBe("function");
  });
});
