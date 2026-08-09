<script lang="ts" setup>
import { computed } from "vue";

const {
  align = "left",
  depth = 0,
  isFirstColumn = false,
  // Renamed on the way out because nothing here reads it: the slot renders the
  // content. Declared and defaulted so the prop's contract survives the
  // withDefaults migration unchanged.
  value: _value = undefined,
} = defineProps<{
  value?: unknown
  align?: "left" | "center" | "right" | string
  depth?: number
  isFirstColumn?: boolean
}>();

// Calculate padding for indent of nested rows
const computedPaddingLeft = computed(() => {
  if (isFirstColumn && depth > 0) {
    return `${depth * 24 + 16}px`;
  }
  return undefined;
});
</script>

<template>
  <div
    :class="{
      'v-table-cell--left': align === 'left',
      'v-table-cell--center': align === 'center',
      'v-table-cell--right': align === 'right',
      'v-table-cell--indented': isFirstColumn && depth > 0
    }"
    :style="{ paddingLeft: computedPaddingLeft }"
    class="v-table-cell"
  >
    <slot />
  </div>
</template>
