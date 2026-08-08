<script lang="ts" setup>
import { computed } from "vue";

import VIcon from "./VIcon.vue";

export type TagVariant = "solid" | "soft" | "outline" | "ghost";
export type TagColor = "primary" | "success" | "warning" | "error" | "info" | "neutral" | "gray";
export type TagSize = "xs" | "sm" | "md" | "lg";

interface Props {
  /** Text content of the tag */
  label?: string
  /** Visual variant */
  variant?: TagVariant
  /** Color scheme */
  color?: TagColor
  /** Size variant */
  size?: TagSize
  /** Icon to display (lucide format) */
  icon?: string
  /** Which side the icon sits on */
  iconPosition?: "left" | "right"
  /** Make tag rounded/pill shaped */
  rounded?: boolean
  /**
   * Name of a CSS custom property to tone the tag with, e.g. "--ui-info".
   * Takes precedence over `color`, for palettes outside the TagColor set.
   */
  customColor?: string
}

const {
  label = "",
  variant = "soft",
  color = "primary",
  size = "sm",
  icon = undefined,
  iconPosition = "left",
  rounded = false,
  customColor = undefined,
} = defineProps<Props>();

const iconSize = computed(() => ({ xs: 12, sm: 14, md: 16, lg: 18 }[size]));

const sizeClass = computed(() => `vtag--${size}`);

// customColor swaps the whole variant/colour pair for the custom-* rules, which
// read the tone from --_tag-color rather than a fixed token.
const variantColorClass = computed(() =>
  customColor ? `vtag--custom-${variant}` : `vtag--${variant}-${color}`,
);

const customStyle = computed(() =>
  customColor ? { "--_tag-color": `var(${customColor})` } : undefined,
);

const roundedClass = computed(() => rounded ? "vtag--rounded" : "vtag--square");
</script>

<template>
  <span
    :class="[sizeClass, variantColorClass, roundedClass]"
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

<style scoped>
@import "../../styles/components/base/vtag.scss";
</style>
