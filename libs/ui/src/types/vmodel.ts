/** Any value usable as a v-model payload: primitives, objects, arrays. */
export type VModelValue = string | number | boolean | object | null | undefined;

export type SingleSelectValue<T = VModelValue> = T | null;

export type MultipleSelectValue<T = VModelValue> = T[];

export type SelectValue<T = VModelValue> = SingleSelectValue<T> | MultipleSelectValue<T>;

/** Custom equality for complex values; falls back to deep comparison when omitted. */
export type ValueComparator<T = VModelValue> = (a: T, b: T) => boolean;

/** Shared prop shape for components offering v-model selection. */
export interface VModelSelectProps<T = VModelValue> {
  /** Unique identifier of this item */
  value?: T
  modelValue?: SelectValue<T>
  /** Treat modelValue as an array of selected items */
  multiple?: boolean
  valueComparator?: ValueComparator<T>
}

/**
 * Equality used by selection components: honours a custom comparator, then
 * falls back to structural comparison for objects and `===` for primitives.
 */
export function isSameModelValue(
  a: VModelValue,
  b: VModelValue,
  comparator?: ValueComparator,
): boolean {
  if (comparator) return comparator(a, b);

  if (a === b) return true;
  if (a == null || b == null) return false;

  if (typeof a === "object" && typeof b === "object") {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    }
    catch {
      return false;
    }
  }

  return false;
}
