<script lang="ts" setup>
import { computed } from "vue";

import { type RouteLocationRaw, RouterLink } from "vue-router";

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
} = defineProps<{
  text?: string
  type?: "button" | "submit" | "reset"
  disabled?: boolean
  loading?: boolean
  icon?: string
  variant?: "default" | "primary" | "secondary" | "positive" | "negative" | "warning" | "link"
  to?: RouteLocationRaw
  replace?: boolean
}>();

const slots = defineSlots();

const isIconOnly = computed(() => !text && !!icon && !slots.default);
const isRouterLink = computed(() => !!to);
const isDisabled = computed(() => disabled || loading);

// "default" is an alias for the primary look, matching so-platform, where the
// variant switch falls through to primary.
const variantClass = computed(() =>
  `v-button--${variant === "default" ? "primary" : variant}`,
);

const rootClass = computed(() => ({
  "v-button--icon-only": isIconOnly.value,
  [variantClass.value]: true,
  "v-button--disabled": isDisabled.value,
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
          :size="24"
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
