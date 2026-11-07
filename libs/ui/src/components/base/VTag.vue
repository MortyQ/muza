<script lang="ts" setup>
import { computed } from "vue";

import VIcon from "./VIcon.vue";

export type TagVariant = "solid" | "soft" | "outline" | "ghost";
// "error" and "gray" are kept as aliases of "danger" and "neutral" so existing
// call sites keep working; new code uses the status names.
export type TagColor = "primary" | "success" | "warning" | "danger" | "info" | "neutral" | "error" | "gray";
export type TagSize = "xs" | "sm" | "md" | "lg";

type TagTone = Exclude<TagColor, "error" | "gray"> | "custom";

const {
  label = "",
  variant = "soft",
  color = "primary",
  size = "sm",
  icon = undefined,
  iconPosition = "left",
  rounded = false,
  customColor = undefined,
} = defineProps<{
  label?: string
  variant?: TagVariant
  color?: TagColor
  size?: TagSize
  /** Iconify name, e.g. "lucide:star" */
  icon?: string
  iconPosition?: "left" | "right"
  /** Pill shape instead of the default small radius */
  rounded?: boolean
  /**
   * Name of a CSS custom property to tone the tag with, e.g. "--ui-info".
   * Takes precedence over `color`, for palettes outside the TagColor set.
   */
  customColor?: string
}>();

const TONES = {
  primary: "primary",
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
  neutral: "neutral",
  error: "danger",
  gray: "neutral",
} as const satisfies Record<TagColor, TagTone>;

const ICON_SIZES = { xs: 10, sm: 12, md: 12, lg: 14 } as const satisfies Record<TagSize, number>;

const tone = computed<TagTone>(() => {
  if (customColor) return "custom";
  return TONES[color];
});

const iconSize = computed(() => ICON_SIZES[size]);

const modifiers = computed(() => [
  `vtag--${size}`,
  `vtag--${variant}`,
  `vtag--tone-${tone.value}`,
  rounded ? "vtag--rounded" : "vtag--square",
]);

const customStyle = computed(() =>
  customColor ? { "--v-tag-custom": `var(${customColor})` } : undefined,
);
</script>

<template>
  <span
    :class="modifiers"
    :data-tone="tone"
    :data-variant="variant"
    :style="customStyle"
    class="vtag"
  >
    <slot name="icon-left">
      <VIcon
        v-if="icon && iconPosition === 'left'"
        :icon="icon"
        :size="iconSize"
      />
    </slot>

    <slot>{{ label }}</slot>

    <slot name="icon-right">
      <VIcon
        v-if="icon && iconPosition === 'right'"
        :icon="icon"
        :size="iconSize"
      />
    </slot>
  </span>
</template>

<style lang="scss" scoped>
@use "../../styles/components/base/vtag.scss";
</style>
