<script lang="ts" setup>
import { nextTick, onWatcherCleanup, shallowRef, useTemplateRef, watch } from "vue";

/**
 * A figure that rolls to its new value instead of jumping.
 *
 * Takes the string the caller already formatted — it never formats money
 * itself. Old and new are aligned from the right; each digit that changed
 * rolls in its own column, the last digit first. Separators, signs and the
 * currency symbol never roll, and digits that did not change stay still. When
 * the length changes the width eases rather than snapping.
 *
 * At rest the DOM holds the plain value and nothing else, so `textContent`
 * equals it. The first paint never moves, and nothing rolls under
 * `prefers-reduced-motion` or where `matchMedia` cannot answer.
 *
 * Rejected on purpose: a per-frame tween of the number (blurs every digit and
 * needs the raw number back) and CSS `@property` counters (no locale grouping,
 * no currency).
 *
 * @example
 * ```vue
 * <VStat label="Revenue"><VCount :value="formatCurrency(total)" /></VStat>
 * ```
 */
const { value } = defineProps<{
  /** The formatted figure, e.g. "$12,400.00". */
  value: string
}>();

const DURATION_MS = 450;
const STAGGER_MS = 30;

interface Glyph {
  /** Offset from the right — the identity a column keeps across lengths. */
  key: number
  char: string
  /** Top and bottom face of the reel; `null` for a still glyph. */
  faces: readonly [string, string] | null
  direction: "up" | "down"
  delay: number
}

const glyphs = shallowRef<ReadonlyArray<Glyph> | null>(null);
const root = useTemplateRef<HTMLElement>("root");

const isDigit = (c: string | undefined): c is string => c !== undefined && c >= "0" && c <= "9";

function canRoll(): boolean {
  return typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
}

function plan(prev: string, next: string): ReadonlyArray<Glyph> {
  const out: Glyph[] = [];
  let rank = 0;
  for (let offset = 0; offset < next.length; offset++) {
    const char = next[next.length - 1 - offset];
    const old = prev[prev.length - 1 - offset];
    const rolls = isDigit(char) && isDigit(old) && char !== old;
    const direction = rolls && char < old ? "down" : "up";
    // Rolling up, the new digit arrives from below; rolling down, from above.
    const faces = rolls ? (direction === "up" ? [old, char] as const : [char, old] as const) : null;
    out.push({
      key: offset,
      char,
      faces,
      direction,
      delay: rolls ? STAGGER_MS * rank++ : 0,
    });
  }
  return out.reverse();
}

// Measures the natural width before and after the swap, then hands CSS the two
// numbers to transition between. `auto` cannot be transitioned; two lengths can.
function easeWidth(el: HTMLElement, before: number): void {
  el.style.removeProperty("--v-count-width");
  const after = el.getBoundingClientRect().width;
  if (Math.abs(after - before) < 0.5) return;
  el.style.setProperty("--v-count-width", `${before}px`);
  void el.offsetWidth;
  el.style.setProperty("--v-count-width", `${after}px`);
}

watch(() => value, async (next, prev) => {
  const el = root.value;
  if (!el || !canRoll()) {
    glyphs.value = null;
    return;
  }

  const planned = plan(prev, next);
  const lastDelay = Math.max(0, ...planned.map(g => g.delay));
  const before = el.getBoundingClientRect().width;

  const timer = setTimeout(() => {
    glyphs.value = null;
    el.style.removeProperty("--v-count-width");
  }, DURATION_MS + lastDelay);
  onWatcherCleanup(() => clearTimeout(timer));

  glyphs.value = planned.some(g => g.faces) ? planned : null;
  await nextTick();
  easeWidth(el, before);
});
</script>

<template>
  <span
    ref="root"
    :style="{ '--v-count-duration': `${DURATION_MS}ms` }"
    class="v-count"
  >
    <template v-if="glyphs">
      <span class="v-count__sr">{{ value }}</span>
      <span
        aria-hidden="true"
        class="v-count__glyphs"
      >
        <template
          v-for="glyph in glyphs"
          :key="glyph.key"
        >
          <span
            v-if="glyph.faces"
            :style="{ '--v-count-delay': `${glyph.delay}ms` }"
            class="v-count__column"
          >
            <span
              :class="`v-count__reel--${glyph.direction}`"
              class="v-count__reel"
            >
              <span class="v-count__face">{{ glyph.faces[0] }}</span>
              <span class="v-count__face">{{ glyph.faces[1] }}</span>
            </span>
          </span>
          <span
            v-else
            class="v-count__still"
          >{{ glyph.char }}</span>
        </template>
      </span>
    </template>
    <template v-else>
      {{ value }}
    </template>
  </span>
</template>

<style lang="scss" scoped>
@use "../../styles/components/base/vcount.scss";
</style>
