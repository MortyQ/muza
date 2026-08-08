<script lang="ts" setup>
import { computed } from "vue";

import VIcon from "../../base/VIcon.vue";

const { pinned, label } = defineProps<{
  pinned: boolean
  /** Human-readable target, e.g. "row" or the column label — used in aria-label. */
  label: string
}>();

const emit = defineEmits<{
  toggle: []
}>();

const ariaLabel = computed(() => (pinned ? `Unpin ${label}` : `Pin ${label}`));

// .stop is what keeps this button from triggering the row's @click (row-click emit)
// and the header cell's sort handler.
const onClick = (event: MouseEvent) => {
  event.stopPropagation();
  emit("toggle");
};
</script>

<template>
  <button
    :aria-label="ariaLabel"
    :aria-pressed="pinned"
    :class="{ 'v-table-pin-button--active': pinned }"
    class="v-table-pin-button"
    type="button"
    @click="onClick"
    @mousedown.stop
  >
    <!-- `x` rather than `pin-off` for the active state: at 13px the diagonal slash
         in pin-off turns to mush, while `x` stays legible and reads as "clear this". -->
    <VIcon
      :icon="pinned ? 'lucide:x' : 'lucide:pin'"
      :size="13"
    />
  </button>
</template>
