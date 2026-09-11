<script lang="ts" setup>
import { computed } from "vue";

import VIcon from "../base/VIcon.vue";

export interface SegmentOption {
  label: string
  value: string | number
  icon?: string
  disabled?: boolean
}

const {
  modelValue,
  options,
  size = "md",
  fullWidth = false,
  disabled = false,
  loading = false,
} = defineProps<{
  modelValue: string | number
  options: SegmentOption[]
  size?: "sm" | "md" | "lg"
  fullWidth?: boolean
  disabled?: boolean
  /**
   * A selection is being persisted. Blocks input and shows a spinner on the
   * selected option.
   *
   * The label fades in place and the spinner is centred over the segment, so its
   * width never changes and the pill stays put.
   *
   * This assumes the consumer moves `modelValue` on click and rolls it back if
   * the write fails — otherwise the spinner sits on the old option and says
   * nothing about what was clicked.
   */
  loading?: boolean
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string | number]
}>();

const iconSize = computed(() => ({ sm: 14, md: 16, lg: 20 }[size]));

const rootClass = computed(() => ({
  [`v-segmented-control--${size}`]: true,
  "v-segmented-control--full-width": fullWidth,
  "v-segmented-control--disabled": disabled,
  "v-segmented-control--loading": loading,
}));

const isPending = (option: SegmentOption): boolean => loading && modelValue === option.value;

const getItemClass = (option: SegmentOption) => ({
  "v-sc__item--active": modelValue === option.value,
  "v-sc__item--disabled": !!option.disabled,
  "v-sc__item--pending": isPending(option),
});

const handleSelect = (option: SegmentOption) => {
  if (option.disabled || disabled || loading) return;
  emit("update:modelValue", option.value);
};
</script>

<template>
  <div
    :class="rootClass"
    class="v-segmented-control"
  >
    <button
      v-for="option in options"
      :key="option.value"
      :aria-busy="isPending(option) || undefined"
      :aria-pressed="modelValue === option.value"
      :class="getItemClass(option)"
      :disabled="option.disabled || disabled || loading"
      class="v-sc__item"
      type="button"
      @click="handleSelect(option)"
    >
      <!-- The label stays in flow and only fades: pulling it out for the spinner
           would collapse the segment's width and drag the pill with it. -->
      <span class="v-sc__label">
        <VIcon
          v-if="option.icon"
          :icon="option.icon"
          :size="iconSize"
        />
        <span>{{ option.label }}</span>
      </span>

      <span
        v-if="isPending(option)"
        class="v-sc__spinner"
      >
        <VIcon
          :loading="true"
          :size="iconSize"
        />
      </span>
    </button>
  </div>
</template>

<style scoped>
@import "../../styles/components/inputs/vsegmentedcontrol.scss";
</style>
