<script lang="ts" setup>
import { computed } from "vue";

import {
  type SelectValue,
  type ValueComparator,
  type VModelValue,
  isSameModelValue,
} from "../../types/vmodel";

import VIcon from "./VIcon.vue";
import VTag, { type TagColor } from "./VTag.vue";

export type ChipVariant = "filled" | "outlined" | "soft";

export type ChipColor
  = | "default"
    | "primary"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "neutral";

export type ChipSize = "sm" | "md" | "lg";

const {
  label = "",
  variant = "soft",
  color = "default",
  selectedColor = "primary",
  size = "md",
  icon = undefined,
  closable = false,
  active = false,
  disabled = false,
  badge = undefined,
  badgeColor = "primary",
  value = undefined,
  multiple = false,
  valueComparator = undefined,
} = defineProps<{
  label?: string
  variant?: ChipVariant
  color?: ChipColor
  /** Colour applied while selected — only used when `color` is "default" */
  selectedColor?: Exclude<ChipColor, "default">
  size?: ChipSize
  /** Iconify icon name */
  icon?: string
  closable?: boolean
  /** Selected state, used when the chip is not bound with v-model */
  active?: boolean
  disabled?: boolean
  badge?: string
  badgeColor?: TagColor
  /** Identifier of this chip within a v-model bound group */
  value?: VModelValue
  /** Treat the model as an array of selected values */
  multiple?: boolean
  valueComparator?: ValueComparator
}>();

const emit = defineEmits<{
  click: [event: MouseEvent]
  close: [event: MouseEvent]
}>();

const model = defineModel<SelectValue>();

const isBound = computed(() => model.value !== undefined && value !== undefined);

const isSelected = computed(() => {
  if (!isBound.value) return active;

  if (multiple) {
    return Array.isArray(model.value)
      && model.value.some(v => isSameModelValue(v, value, valueComparator));
  }

  return isSameModelValue(model.value, value, valueComparator);
});

const iconSize = computed(() => ({ sm: 14, md: 16, lg: 18 }[size]));

/** "default" borrows selectedColor once selected, so the resting state stays neutral */
const activeColor = computed<Exclude<ChipColor, "default"> | "default">(() =>
  color === "default" && isSelected.value ? selectedColor : color,
);

const rootClass = computed(() => [
  `v-chip--${size}`,
  `v-chip--${variant}`,
  `v-chip--color-${activeColor.value}`,
  {
    "v-chip--selected": isSelected.value,
    "v-chip--disabled": disabled,
    "v-chip--interactive": !disabled,
  },
]);

const handleClick = (event: MouseEvent): void => {
  if (disabled) return;

  if (isBound.value) {
    if (multiple) {
      const current = Array.isArray(model.value) ? model.value : [];
      model.value = current.some(v => isSameModelValue(v, value, valueComparator))
        ? current.filter(v => !isSameModelValue(v, value, valueComparator))
        : [...current, value];
    }
    else {
      model.value = isSameModelValue(model.value, value, valueComparator) ? null : value;
    }
  }

  emit("click", event);
};

const handleClose = (event: MouseEvent): void => {
  if (disabled) return;
  emit("close", event);
};
</script>

<template>
  <span
    :class="rootClass"
    class="v-chip"
    @click="handleClick"
  >
    <span class="v-chip__content">
      <VIcon
        v-if="icon"
        :icon="icon"
        :size="iconSize"
        class="v-chip__icon"
      />

      <span
        v-if="label || $slots.default"
        class="v-chip__label"
      >
        <slot>{{ label }}</slot>
      </span>

      <slot name="badge">
        <VTag
          v-if="badge"
          :color="badgeColor"
          :label="badge"
          size="sm"
          variant="outline"
        />
      </slot>
    </span>

    <button
      v-if="closable"
      :disabled="disabled"
      class="v-chip__close"
      type="button"
      @click.stop="handleClose"
    >
      <VIcon
        :size="iconSize - 2"
        icon="lucide:x"
      />
    </button>
  </span>
</template>

<style lang="scss" scoped>
@import "../../styles/components/base/vchip.scss";
</style>
