<script lang="ts" setup>
import { computed } from "vue";

import { Icon } from "@iconify/vue";

const {
  icon = "",
  size = 24,
  color = "currentColor",
  loading = false,
} = defineProps<{
  icon?: string
  size?: string | number
  color?: string
  loading?: boolean
}>();

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
    :color="color"
    :height="iconSize"
    :icon="resolvedIcon"
    :width="iconSize"
    class="v-icon"
  />
</template>

<style scoped>
.v-icon {
  display: inline-flex;
  flex-shrink: 0;
  line-height: 1;
}

.v-icon--spin {
  animation: spin 1s linear infinite;
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
