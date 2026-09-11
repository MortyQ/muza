<script lang="ts" setup>
import { computed, inject } from "vue";

import { type RouteLocationRaw, RouterLink } from "vue-router";

import { BUTTON_GROUP_KEY } from "./injectionKeys";
import VIcon from "./VIcon.vue";

const {
  text = "",
  type = "button",
  variant = "primary",
  icon = undefined,
  to = undefined,
  replace = false,
  disabled = false,
  loading = false,
  modern = true,
  size = undefined,
} = defineProps<{
  text?: string
  type?: "button" | "submit" | "reset"
  disabled?: boolean
  loading?: boolean
  icon?: string
  variant?:
    | "default" | "primary" | "secondary" | "positive" | "negative" | "warning" | "link"
    /** Tonal secondary. Has no legacy appearance to preserve. */
    | "neutral"
  to?: RouteLocationRaw
  replace?: boolean
  /**
   * The current chrome, and **the default**: 30px, 8px radius, 1px hairline,
   * weight 510, two tiers of the shadow scale, and a hover that steps one token
   * inside the variant's own family.
   *
   * It changes *how* a variant is drawn, never *which* variant you get —
   * `default` is the primary fill here exactly as it is with `modern: false`.
   *
   * so-platform ships this opt-in, because flipping it there would repaint
   * screens that were designed against the legacy chrome. This library has no
   * such history, so the newer chrome is what you get unless you ask for the
   * older one. Pass `:modern="false"` for the 40px, 2px-bordered, fully-filled
   * button — the two are not interchangeable: the filled status variants become
   * tonal tints under the modern chrome.
   */
  modern?: boolean
  /**
   * 28 / 32 / 40px. Left unset the button keeps its chrome's natural height —
   * 1.875rem by default, 2.5rem with `modern: false`.
   */
  size?: "sm" | "md" | "lg"
}>();

const slots = defineSlots();

/** Set only when this button is a cell of a `VButtonGroup`. */
const isGrouped = inject(BUTTON_GROUP_KEY, false);

const isIconOnly = computed(() => !text && !!icon && !slots.default);
const isRouterLink = computed(() => !!to);
const isDisabled = computed(() => disabled || loading);

// "default" is an alias for the primary look, matching so-platform, where the
// variant switch falls through to primary.
const variantClass = computed(() =>
  `v-button--${variant === "default" ? "primary" : variant}`,
);

/**
 * 24 keeps the legacy button pixel-identical — it is VIcon's own default, which
 * is what an icon rendered without a `size` already gets. The modern chrome is
 * 30px tall, where 24 leaves no room.
 */
const iconSize = computed(() => (modern ? 16 : 24));

const rootClass = computed(() => ({
  "v-button--icon-only": isIconOnly.value,
  [variantClass.value]: true,
  "v-button--disabled": isDisabled.value,
  "v-button--modern": modern,
  "v-button--grouped": isGrouped,
  ...(size ? { [`v-button--${size}`]: true } : {}),
}));

const rootAttrs = computed(() => {
  if (isRouterLink.value) {
    return {
      to,
      replace,
      "aria-disabled": isDisabled.value || undefined,
      tabindex: isDisabled.value ? -1 : undefined,
    };
  }
  return {
    type,
    disabled: isDisabled.value,
    "aria-busy": loading || undefined,
  };
});
</script>

<template>
  <component
    :is="isRouterLink ? RouterLink : 'button'"
    :class="rootClass"
    class="v-button"
    v-bind="rootAttrs"
  >
    <span
      v-if="$slots.iconLeft || loading || icon"
      class="v-button__icon v-button__icon--left"
    >
      <slot name="iconLeft">
        <VIcon
          :icon="icon"
          :loading="loading"
          :size="iconSize"
        />
      </slot>
    </span>

    <span
      v-if="!isIconOnly"
      class="v-button__label"
    >
      <slot>{{ text }}</slot>
    </span>

    <span
      v-if="$slots.iconRight"
      class="v-button__icon v-button__icon--right"
    >
      <slot name="iconRight" />
    </span>
  </component>
</template>

<style lang="scss" scoped>
@use "../../styles/components/base/vbutton.scss";
</style>
