<script lang="ts" setup>
import { computed } from "vue";

import VIcon from "../../base/VIcon.vue";

export interface DeltaValueProps {
  /**
   * Main value to display (optional)
   * If not provided, only delta will be shown
   */
  value?: number | string | null
  /**
   * Delta/change value (percentage or absolute)
   */
  delta?: number | null
  /**
   * Format options for main value
   */
  format?: {
    type?: "number" | "currency" | "percentage"
    decimals?: number
    currencyCode?: string
  }
  /**
   * Format options for delta value (optional)
   * If not provided, uses deltaAsPercentage and format.decimals
   */
  deltaFormat?: {
    type?: "number" | "currency" | "percentage"
    decimals?: number
    currencyCode?: string
  }
  /**
   * Whether delta represents percentage (adds % suffix)
   * @default true
   */
  deltaAsPercentage?: boolean
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
   * Show delta even if it's 0
   * @default true
   */
  showZeroDelta?: boolean
}

const {
  value = undefined,
  delta = undefined,
  format = undefined,
  deltaFormat = undefined,
  deltaAsPercentage = true,
  reverse = false,
  size = "default",
  showZeroDelta = true,
} = defineProps<DeltaValueProps>();

// Check if delta is positive
const isPositive = computed(() => {
  if (delta === null || delta === undefined) return null;
  return reverse ? delta < 0 : delta > 0;
});

// Check if delta is negative
const isNegative = computed(() => {
  if (delta === null || delta === undefined) return null;
  return reverse ? delta > 0 : delta < 0;
});

// Check if delta is zero
const isZero = computed(() => {
  return delta === 0;
});

// Should show delta
const showDelta = computed(() => {
  if (delta === null || delta === undefined) return false;
  return showZeroDelta || delta !== 0;
});

// Format delta value
const formattedDelta = computed(() => {
  if (delta === null || delta === undefined) return "";

  const absValue = Math.abs(delta);

  if (deltaFormat) {
    const { type = "number", decimals = 0, currencyCode = "USD" } = deltaFormat;

    switch (type) {
      case "currency":
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: currencyCode,
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(absValue);
      case "percentage": {
        const formattedNumber = new Intl.NumberFormat("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(absValue);
        return `${formattedNumber}%`;
      }
      default:
        return new Intl.NumberFormat("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(absValue);
    }
  }

  const formatted = absValue.toFixed(format?.decimals ?? 0);

  return deltaAsPercentage ? `${formatted}%` : formatted;
});

// Format main value
const formattedValue = computed(() => {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") return value;

  const { type = "number", decimals = 0, currencyCode = "USD" } = format || {};

  switch (type) {
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currencyCode,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);
    case "percentage": {
      const formattedNumber = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);
      return `${formattedNumber}%`;
    }
    default:
      return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);
  }
});

const iconSize = computed(() => {
  switch (size) {
    case "sm":
      return 14;
    case "lg":
      return 20;
    default:
      return 16;
  }
});

const deltaSize = computed(() => (size === "sm" ? "sm" : "default"));

const toneIcon = computed<string | null>(() => {
  if (isPositive.value) return "lucide:arrow-up";
  if (isNegative.value) return "lucide:arrow-down";
  if (isZero.value) return "lucide:minus";
  return null;
});

const deltaClass = computed(() => [
  `v-delta--${deltaSize.value}`,
  {
    "v-delta--positive": isPositive.value,
    "v-delta--negative": isNegative.value,
    "v-delta--zero": isZero.value,
  },
]);
</script>

<template>
  <div
    :class="`v-delta-value--${size}`"
    class="v-delta-value"
  >
    <span
      v-if="formattedValue !== null"
      class="v-delta-value__main"
    >
      {{ formattedValue }}
    </span>

    <div
      v-if="showDelta"
      :class="deltaClass"
      class="v-delta"
    >
      <VIcon
        v-if="toneIcon"
        :icon="toneIcon"
        :size="iconSize"
      />

      <span class="v-delta__text">{{ formattedDelta }}</span>
    </div>
  </div>
</template>

<style scoped>
@import "../../../styles/components/table/delta.scss";
</style>
