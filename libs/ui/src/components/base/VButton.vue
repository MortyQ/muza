<script lang="ts" setup>
import { computed } from "vue";

import { RouterLink } from "vue-router";

import VIcon from "./VIcon.vue";

const {
  text = "",
  type = "button",
  variant = "default",
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
  variant?: "default" | "primary" | "positive" | "negative" | "warning" | "link"
  to?: string | object
  replace?: boolean
}>();

const slots = defineSlots();

const isIconOnly = computed(() => !text && !!icon && !slots.default);
const isRouterLink = computed(() => !!to);
const isDisabled = computed(() => disabled || loading);

const variantClass = computed(() => {
  switch (variant) {
    case "primary":
      return "v-button--primary";
    case "positive":
      return "v-button--positive";
    case "negative":
      return "v-button--negative";
    case "warning":
      return "v-button--warning";
    case "link":
      return "v-button--link";
    default:
      return "v-button--primary";
  }
});

const rootClass = computed(() => [
  "v-button",
  isIconOnly.value ? "v-button--icon-only" : "",
  variantClass.value,
  isDisabled.value ? "v-button--disabled" : "",
]);

const rootAttrs = computed(() => {
  if (isRouterLink.value) {
    return {
      to: isDisabled.value ? undefined : to,
      replace,
    };
  }
  return {
    type,
    disabled: isDisabled.value,
  };
});
</script>

<template>
  <component
    :is="isRouterLink ? RouterLink : 'button'"
    :class="rootClass"
    v-bind="rootAttrs"
  >
    <span
      v-if="$slots.iconLeft || loading || icon"
      class="inline-flex items-center justify-center"
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
      class="inline-flex items-center justify-center gap-0.75"
    >
      <span v-if="text">{{ text }}</span>
      <slot />
    </span>

    <span
      v-if="$slots.iconRight"
      class="inline-flex items-center justify-center"
    >
      <slot name="iconRight" />
    </span>
  </component>
</template>

<style scoped>
@import "../../styles/components/base/vbutton.scss";
</style>
