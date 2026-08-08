<script lang="ts" setup>
import { computed } from "vue";

import { formatCurrency, formatNumber, formatPercentage } from "@muzakit/utils";

import VIcon from "../../base/VIcon.vue";
import type { ColumnFormatOptions } from "../types";

export interface DeltaIndicatorProps {
  /**
   * Value to display with color + arrow treatment
   */
  value?: number
  /**
   * Format options — same API as VTable column format
   * @example { currency: { decimals: 2 } }
   * @example { percentage: { decimals: 1 } }
   * @example { number: "compact" }
   */
  format?: ColumnFormatOptions
  /**
   * Reverse positive/negative colors
   * Useful when lower is better (e.g., costs, errors)
   * @default false
   */
  reverse?: boolean
  /**
   * Size variant
   * @default 'default'
   */
  size?: "sm" | "default" | "lg"
  /**
   * Show arrow icon
   * @default true
   */
  showIcon?: boolean
  /**
   * Show value even if it's 0
   * @default true
   */
  showZero?: boolean
}

const {
  value = 0,
  format = undefined,
  reverse = false,
  size = "default",
  showIcon = true,
  showZero = true,
} = defineProps<DeltaIndicatorProps>();

const hasValue = computed(() =>
  value !== null && value !== undefined,
);

const shouldShow = computed(() =>
  hasValue.value && (showZero || value !== 0),
);

const isPositive = computed(() => {
  if (!hasValue.value) return null;
  return reverse ? value < 0 : value > 0;
});

const isNegative = computed(() => {
  if (!hasValue.value) return null;
  return reverse ? value > 0 : value < 0;
});

const isZero = computed(() => value === 0);

const formattedValue = computed(() => {
  if (!hasValue.value) return "";

  const fmt = format;
  if (!fmt) return String(value);

  if (fmt.currency !== undefined) {
    if (typeof fmt.currency === "object") {
      const { code, decimals } = fmt.currency;
      return formatCurrency(value, { code, decimals });
    }
    if (typeof fmt.currency === "string") {
      return formatCurrency(value, fmt.currency);
    }
    return formatCurrency(value);
  }

  if (fmt.percentage !== undefined) {
    return formatPercentage(value, fmt.percentage === true ? undefined : fmt.percentage);
  }

  if (fmt.number !== undefined) {
    return formatNumber(value, fmt.number);
  }

  return String(value);
});

const iconSize = computed(() => {
  switch (size) {
    case "sm":
      return 12;
    case "lg":
      return 18;
    default:
      return 14;
  }
});

const toneIcon = computed<string | null>(() => {
  if (isPositive.value) return "lucide:arrow-up";
  if (isNegative.value) return "lucide:arrow-down";
  if (isZero.value) return "lucide:minus";
  return null;
});

const rootClass = computed(() => [
  `v-delta--${size}`,
  {
    "v-delta--positive": isPositive.value,
    "v-delta--negative": isNegative.value,
    "v-delta--zero": isZero.value,
  },
]);
</script>

<template>
  <div
    v-if="shouldShow"
    :class="rootClass"
    class="v-delta"
  >
    <VIcon
      v-if="showIcon && toneIcon"
      :icon="toneIcon"
      :size="iconSize"
    />

    <span class="v-delta__text">{{ formattedValue }}</span>
  </div>
</template>

<style lang="scss" scoped>
@import "../../../styles/components/table/delta.scss";
</style>
