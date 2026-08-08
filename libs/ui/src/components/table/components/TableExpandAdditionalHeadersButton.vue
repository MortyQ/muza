<script lang="ts" setup>
import VIcon from "../../base/VIcon.vue";

interface Props {
  isExpanded: boolean
}

defineProps<Props>();

const emit = defineEmits<{
  click: []
}>();
</script>

<template>
  <button
    :class="{ 'is-expanded': isExpanded }"
    class="expand-button"
    type="button"
    @click.stop="emit('click')"
  >
    <VIcon
      :size="16"
      class="expand-icon"
      icon="lucide:chevron-right"
    />
  </button>
</template>

<style scoped>
.expand-button {
  /* Sizing & Layout */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  flex-shrink: 0;

  /* Reset button styles */
  border: none;
  background: transparent;
  cursor: pointer;

  /* Modern rounded style */
  border-radius: 6px;

  color: var(--ui-primary);

  /* Smooth transitions */
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);

  /* Hover state - subtle background with primary color */

  &:hover {
    background-color: color-mix(in oklch, var(--ui-primary) 10%, transparent);
  }

  /* Active state - micro interaction */

  &:active {
    transform: scale(0.92);
    background-color: color-mix(in oklch, var(--ui-primary) 20%, transparent);
  }

  /* Focus state - accessibility */

  &:focus-visible {
    outline: 2px solid var(--ui-primary);
    outline-offset: 2px;
  }
}

/* Icon rotation animation */
.expand-icon {
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Expanded state - rotate chevron right → down (90deg) */
.expand-button.is-expanded .expand-icon {
  transform: rotate(180deg);
}
</style>
