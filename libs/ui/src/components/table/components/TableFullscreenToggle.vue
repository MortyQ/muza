<script lang="ts" setup>
import { computed } from "vue";

import VIcon from "../../base/VIcon.vue";

const { isFullscreen } = defineProps<{
  isFullscreen: boolean
}>();

const emit = defineEmits<{
  toggle: []
}>();

const label = computed(() => (isFullscreen ? "Collapse table" : "Expand table"));
const icon = computed(() => (isFullscreen ? "lucide:minimize-2" : "lucide:maximize-2"));
</script>

<template>
  <button
    :aria-label="label"
    :class="{ 'v-table-fullscreen-toggle--active': isFullscreen }"
    :title="label"
    class="v-table-fullscreen-toggle"
    type="button"
    @click="emit('toggle')"
  >
    <VIcon
      :icon="icon"
      :size="15"
    />
  </button>
</template>
