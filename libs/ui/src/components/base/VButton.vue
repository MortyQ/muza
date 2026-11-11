<script lang="ts" setup>
import { type Component, computed, getCurrentInstance, inject } from "vue";

import type { RouteLocationRaw } from "vue-router";

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
  size = undefined,
} = defineProps<{
  text?: string
  type?: "button" | "submit" | "reset"
  disabled?: boolean
  loading?: boolean
  icon?: string
  /**
   * Six tonal hues plus one filled tier. `default` is an alias for `primary`,
   * kept so a call site ported from so-platform resolves the same way.
   */
  variant?:
    | "default" | "primary" | "secondary" | "positive" | "negative" | "warning" | "link"
    /** Tonal secondary. */
    | "neutral"
    /** Informational accent. */
    | "info"
  to?: RouteLocationRaw
  replace?: boolean
  /**
   * 28 / 32 / 40px. Left unset the button keeps the chrome's natural 30px, so
   * adding this prop cannot reflow anything on its own.
   */
  size?: "sm" | "md" | "lg"
}>();

const slots = defineSlots();

/** Set only when this button is a cell of a `VButtonGroup`. */
const isGrouped = inject(BUTTON_GROUP_KEY, false);

// RouterLink is read from the app rather than imported: `app.use(router)` registers it globally,
// so a button in an app without vue-router — and the library itself — never loads the router.
// Without one, `to` falls back to a plain anchor, which can follow a string path only.
const routerLink: Component | null = getCurrentInstance()?.appContext.components.RouterLink ?? null;

const isIconOnly = computed(() => !text && !!icon && !slots.default);
const isLink = computed(() => to !== undefined);
const isDisabled = computed(() => disabled || loading);

// "default" is an alias for the primary look, matching so-platform, where the
// variant switch falls through to primary.
const variantClass = computed(() =>
  `v-button--${variant === "default" ? "primary" : variant}`,
);

/** VIcon's own default is 24, which leaves no room in a 30px button. */
const iconSize = 15;

const rootClass = computed(() => ({
  "v-button--icon-only": isIconOnly.value,
  [variantClass.value]: true,
  // Two classes, not one: both block input, but only `disabled` dims. A
  // loading button is busy with what was just asked of it, not unavailable.
  "v-button--disabled": disabled,
  "v-button--loading": loading && !disabled,
  "v-button--grouped": isGrouped,
  ...(size ? { [`v-button--${size}`]: true } : {}),
}));

const rootTag = computed<Component | string>(() => {
  if (!isLink.value) return "button";
  return routerLink ?? "a";
});

const rootAttrs = computed(() => {
  if (isLink.value) {
    const linkState = {
      "aria-disabled": isDisabled.value || undefined,
      tabindex: isDisabled.value ? -1 : undefined,
    };
    if (routerLink) return { to, replace, ...linkState };
    // A disabled anchor loses its href, which is what actually stops it navigating.
    const href = typeof to === "string" && !isDisabled.value ? to : undefined;
    return { href, ...linkState };
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
    :is="rootTag"
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
