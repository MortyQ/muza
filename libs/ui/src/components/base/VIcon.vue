<script lang="ts" setup>
import { computed } from "vue";

import { Icon } from "@iconify/vue";

import { registerLibraryIcons } from "../../icons/registerLibraryIcons";

const {
  icon = "",
  size = 16,
  color = undefined,
  loading = false,
} = defineProps<{
  icon?: string
  size?: string | number
  /**
   * Any CSS colour value, e.g. "var(--ui-primary)". Omit to inherit
   * currentColor from the parent, which is the usual way to tone an icon.
   *
   * Deliberately not accepting a Tailwind class as so-platform does: a class
   * name assembled at runtime is invisible to the v4 scanner, so the utility
   * is never generated and the colour silently does nothing.
   */
  color?: string
  loading?: boolean
}>();

registerLibraryIcons();

const resolvedIcon = computed(() =>
  loading ? "lucide:loader-circle" : icon,
);

const iconSize = computed(() =>
  typeof size === "number" ? size : parseInt(size),
);
</script>

<template>
  <Icon
    :class="{ 'v-icon--spin': loading }"
    :height="iconSize"
    :icon="resolvedIcon"
    :style="color ? { color } : undefined"
    :width="iconSize"
    aria-hidden="true"
    class="v-icon"
    focusable="false"
  />
</template>

<style scoped>
/* inline-flex and middle: centred on the line of text it sits in, not
   sitting on the baseline. */
.v-icon {
  display: inline-flex;
  flex-shrink: 0;
  vertical-align: middle;
  line-height: 1;
}

.v-icon--spin {
  animation: spin 1s linear infinite; /* literal: loop period */
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
