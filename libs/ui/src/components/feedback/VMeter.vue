<script lang="ts" setup>
import { computed } from "vue";

import VIcon from "../base/VIcon.vue";
import VTooltip from "../overlay/VTooltip.vue";

/**
 * A value measured against a threshold.
 *
 * Not a progress bar. `VProgressBar` reports how far along a task is, always
 * toward 100%, and "done" is the only good outcome. A meter reports where a
 * *measurement* sits relative to a limit that matters — tokens against a caching
 * floor, spend against a budget, storage against a quota. The bar is the smaller
 * half of it: the value, its state icon and the explanation next to it are what
 * the reader acts on.
 *
 * @example
 * ```vue
 * <VMeter
 *   :value="tokens"
 *   :max="minTokens"
 *   :label="`${tokens} / ${minTokens} tokens`"
 *   hint="Below the threshold the provider stops caching the prefix."
 * />
 *
 * <VMeter :value="usedGb" :max="quotaGb" goal="stay-under" />
 * ```
 */
const {
  value,
  max,
  goal = "reach",
  label = undefined,
  hint = undefined,
  pending = false,
  size = "sm",
} = defineProps<{
  /** `null` means "could not be measured" — a different thing from zero, and shown as such. */
  value: number | null
  /** The threshold the value is read against. */
  max: number
  /**
   * Which side of `max` is the good side.
   * - `reach` — the value should be at or above `max` (a floor: minimum tokens, minimum coverage)
   * - `stay-under` — the value should stay at or below `max` (a ceiling: quota, budget)
   */
  goal?: "reach" | "stay-under"
  /** Text beside the bar. Falls back to `value / max`; use the `label` slot for markup. */
  label?: string
  /** Tooltip on the label. Without it the label carries no tooltip and no help cursor. */
  hint?: string
  /** A measurement is in flight. Distinct from `value === null`: one resolves, the other does not. */
  pending?: boolean
  size?: "sm" | "md"
}>();

const isMeasured = computed<boolean>(() => value !== null);

const isMet = computed<boolean>(() => {
  if (value === null) return false;
  return goal === "reach" ? value >= max : value <= max;
});

// 0–1, applied as `scaleX` rather than a width: a transform stays off the layout
// path. Guarded against `max: 0` — a threshold of zero has no bar to fill, and
// the division would be Infinity.
const ratio = computed<number>(() => {
  if (value === null || max <= 0) return 0;
  return Math.min(1, value / max);
});

const defaultLabel = computed<string>(() => {
  if (value === null) return "Not measured";
  return `${value.toLocaleString("en-US")} / ${max.toLocaleString("en-US")}`;
});

const icon = computed<string>(() => {
  if (!isMeasured.value) return "lucide:circle-help";
  return isMet.value ? "lucide:circle-check" : "lucide:triangle-alert";
});

const iconClass = computed<string>(() => {
  if (!isMeasured.value) return "";
  return isMet.value ? "v-meter__icon--met" : "v-meter__icon--unmet";
});
</script>

<template>
  <div class="v-meter">
    <!-- The track stays mounted while pending, at zero fill: the row keeps its
         height from the first frame, so an arriving value animates in instead of
         shoving the layout down. -->
    <div
      v-if="isMeasured || pending"
      :class="`v-meter__track--${size}`"
      class="v-meter__track"
    >
      <div
        :aria-valuemax="max"
        :aria-valuenow="value ?? undefined"
        :class="isMet ? 'v-meter__fill--met' : 'v-meter__fill--unmet'"
        :style="{ '--v-meter-fill': ratio }"
        aria-valuemin="0"
        class="v-meter__fill"
        role="meter"
      />
    </div>

    <VTooltip
      :disabled="!hint"
      :text="hint ?? ''"
    >
      <span
        :class="{ 'v-meter__value--pending': pending, 'v-meter__value--help': !!hint }"
        class="v-meter__value"
      >
        <VIcon
          v-if="pending"
          :loading="true"
          :size="14"
        />
        <VIcon
          v-else
          :class="iconClass"
          :icon
          :size="14"
        />
        <slot name="label">{{ label ?? defaultLabel }}</slot>
      </span>
    </VTooltip>
  </div>
</template>

<style lang="scss" scoped>
@use "../../styles/components/feedback/vmeter.scss";
</style>
