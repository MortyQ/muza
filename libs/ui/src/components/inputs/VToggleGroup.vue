<script generic="T extends string | number" lang="ts" setup>
import { computed } from "vue";

import VIcon from "../base/VIcon.vue";
import VTooltip from "../overlay/VTooltip.vue";

export interface ToggleOption<V = string | number> {
  label: string
  value: V
  icon?: string
  disabled?: boolean
  tooltip?: string
}

const {
  modelValue,
  options,
  size = undefined,
} = defineProps<{
  modelValue: T
  options: ToggleOption<T>[]
  /**
   * 28 / 32 / 40px. Left unset the control keeps the chrome's natural 30px,
   * which is what every other control in a toolbar row stands at.
   */
  size?: "sm" | "md" | "lg"
}>();

const emit = defineEmits<{
  "update:modelValue": [value: T]
}>();

const iconSize = computed(() => (size ? { sm: 12, md: 16, lg: 20 }[size] : 15));

const rootClass = computed(() => (size ? [`v-toggle-group--${size}`] : []));

const getItemClass = (option: ToggleOption<T>) => ({
  "v-tg__item--active": modelValue === option.value,
  "v-tg__item--disabled": !!option.disabled,
});

const handleSelect = (option: ToggleOption<T>) => {
  if (option.disabled) return;
  emit("update:modelValue", option.value);
};
</script>

<template>
  <div
    :class="rootClass"
    class="v-toggle-group"
  >
    <VTooltip
      v-for="option in options"
      :key="String(option.value)"
      :allow-html="true"
      :disabled="!option.tooltip"
      :text="option.tooltip ?? ''"
      placement="top"
    >
      <button
        :aria-pressed="modelValue === option.value"
        :class="getItemClass(option)"
        :disabled="option.disabled"
        class="v-tg__item"
        type="button"
        @click="handleSelect(option)"
      >
        <VIcon
          v-if="option.icon"
          :icon="option.icon"
          :size="iconSize"
        />
        <span>{{ option.label }}</span>
      </button>
    </VTooltip>
  </div>
</template>

<style scoped>
@import "../../styles/components/inputs/vtogglegroup.scss";
</style>
