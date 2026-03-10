<script lang="ts" setup>
import { computed } from "vue";

import { RouterLink } from "vue-router";

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

// import VIcon from "./VIcon.vue";

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
      <template v-if="!loading">
        <slot name="iconLeft" />
      </template>
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

<style lang="scss" scoped>
.v-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 2.5rem;
  width: fit-content;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  font-weight: 300;
  text-decoration: none;
  cursor: pointer;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  transition: background-color 300ms ease-in-out,
  color 300ms ease-in-out,
  border-color 300ms ease-in-out,
  box-shadow 300ms ease-in-out;
}

.v-button--icon-only {
  width: 2.5rem;
  padding: 0;
}

.v-button--disabled,
.v-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.v-button--primary {
  background-color: var(--primary);
  color: var(--primary-text);
  border: 2px solid var(--primary);

  &:hover:not(:disabled) {
    background-color: var(--primary-hover);
    border-color: var(--primary-hover);
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  }
}

.v-button--positive {
  background-color: var(--success);
  color: white;
  border: 2px solid var(--success);

  &:hover:not(:disabled) {
    background-color: color-mix(in oklch, var(--success) 82%, black);
    border-color: color-mix(in oklch, var(--success) 82%, black);
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  }
}

.v-button--negative {
  background-color: var(--danger);
  color: white;
  border: 2px solid var(--danger);

  &:hover:not(:disabled) {
    background-color: color-mix(in oklch, var(--danger) 82%, black);
    border-color: color-mix(in oklch, var(--danger) 82%, black);
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  }
}

.v-button--warning {
  background-color: var(--warning);
  color: white;
  border: 2px solid var(--warning);

  &:hover:not(:disabled) {
    background-color: color-mix(in oklch, var(--warning) 82%, black);
    border-color: color-mix(in oklch, var(--warning) 82%, black);
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  }
}

.v-button--link {
  background-color: transparent;
  color: var(--primary);
  border: none;
  box-shadow: none;
  font-weight: 500;
  padding: 0 0.5rem;
  min-width: unset;
  position: relative;

  &::after {
    content: '';
    display: block;
    position: absolute;
    left: 0;
    bottom: 6px;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, var(--primary), var(--primary-hover));
    opacity: 0.2;
    border-radius: 1px;
    transition: opacity 0.3s ease, transform 0.3s ease;
    transform: scaleX(0.6);
    transform-origin: left;
  }

  &:hover:not(:disabled),
  &.router-link-active {
    color: var(--primary-hover);
    background: transparent;
    box-shadow: none;
  }

  &:hover:not(:disabled)::after,
  &.router-link-active::after {
    opacity: 0.8;
    transform: scaleX(1);
  }

  &:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  &:disabled {
    color: var(--mutedText);
    background: transparent;
    opacity: 0.5;
  }
}
</style>
