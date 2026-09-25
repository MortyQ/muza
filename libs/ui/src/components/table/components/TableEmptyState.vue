<script lang="ts" setup>
import VIcon from "../../base/VIcon.vue";

defineProps<{
  title?: string
  description?: string
  icon?: string
}>();
</script>

<template>
  <div class="v-table-empty-state">
    <div class="v-table-empty-state-content">
      <div
        v-if="icon"
        class="v-table-empty-state-icon"
      >
        <VIcon
          :icon="icon"
          :size="40"
        />
      </div>

      <h3
        v-if="title"
        class="v-table-empty-state-title"
      >
        {{ title }}
      </h3>

      <p
        v-if="description"
        class="v-table-empty-state-description"
      >
        {{ description }}
      </p>

      <!-- Custom content slot -->
      <div
        v-if="$slots.default"
        class="v-table-empty-state-slot"
      >
        <slot />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.v-table-empty-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 2;
}

.v-table-empty-state-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ui-space-md);
  pointer-events: auto;
}

.v-table-empty-state-icon {
  color: color-mix(in oklch, var(--ui-primary) 40%, transparent);
}

.v-table-empty-state-title {
  margin: 0;
  font-size: var(--ui-text-lg);
  line-height: var(--ui-leading-lg);
  font-weight: 600;
  color: var(--ui-primary);
  white-space: nowrap;
}

.v-table-empty-state-description {
  margin: 0;
  font-size: var(--ui-text-base);
  line-height: var(--ui-leading-base);
  color: var(--ui-foreground-secondary);
  text-align: center;
  max-width: 25rem;
}

.v-table-empty-state-slot {
  margin-top: var(--ui-space-xs);
}
</style>
