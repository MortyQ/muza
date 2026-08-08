<script setup lang="ts">
const { active, zIndex } = defineProps<{
  active: boolean
  zIndex: number
}>();

const emit = defineEmits<{
  click: []
}>();
</script>

<template>
  <Teleport to="body">
    <Transition name="v-table-backdrop">
      <div
        v-if="active"
        :style="{ zIndex }"
        class="v-table-fullscreen-backdrop"
        @click="emit('click')"
      />
    </Transition>
  </Teleport>
</template>

<style scoped>
.v-table-fullscreen-backdrop {
  position: fixed;
  inset: 0;
  background-color: var(--ui-overlay);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.v-table-backdrop-enter-active,
.v-table-backdrop-leave-active {
  transition: opacity 200ms ease;
}

.v-table-backdrop-enter-from,
.v-table-backdrop-leave-to {
  opacity: 0;
}
</style>
