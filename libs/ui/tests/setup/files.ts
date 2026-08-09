/**
 * Helpers for driving file inputs and drop zones under jsdom.
 *
 * jsdom implements `File` but not a usable `DataTransfer`, and `input.files` is
 * read-only. Both components under test only ever read `event.dataTransfer
 * .files` and `target.files`, so a plain object and a redefined property are
 * enough — and keep these specs in the fast unit project instead of pushing
 * them into the browser one.
 */

export function makeFile(name: string, size = 1024, type = "text/plain"): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size, configurable: true });
  return file;
}

/** Attach a file list to an `<input type="file">` that jsdom would keep empty. */
export function setInputFiles(input: HTMLInputElement, files: File[]): void {
  Object.defineProperty(input, "files", {
    value: Object.assign(files, {
      item: (i: number) => files[i] ?? null,
    }),
    configurable: true,
    writable: true,
  });
}

/** A drop event payload shaped like the only part of DataTransfer that is read. */
export function dropPayload(files: File[]): { dataTransfer: { files: File[] } } {
  return { dataTransfer: { files } };
}
