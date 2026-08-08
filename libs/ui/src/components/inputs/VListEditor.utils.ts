export interface ListEditorItem {
  text: string
  [extra: string]: unknown
}

/**
 * Converts a list of editor items to a plain trimmed, non-empty string list —
 * for consumers (e.g. pim) that store the list as `string[]` rather than
 * objects. See `textListToListEditorItems` for the inverse.
 */
export const listEditorToTextList = (items: ListEditorItem[]): string[] =>
  items.map(item => item.text.trim()).filter(text => text.length > 0);

/**
 * Inverse of `listEditorToTextList` — wraps plain strings into fresh items
 * with no extra fields (e.g. no `id`), which is exactly the shape a new,
 * never-saved item should have.
 */
export const textListToListEditorItems = (texts: string[]): ListEditorItem[] =>
  texts.map(text => ({ text }));
