<script lang="ts" setup>
/**
 * What a block says when it has nothing to show: one muted line, and at most
 * one way forward. No illustration and no heading — the block's own title
 * already says what is empty.
 *
 * @example
 * ```vue
 * <VEmptyState text="No orders in this period">
 *   <template #action>
 *     <VButton variant="ghost" size="sm" @click="resetFilters">Reset filters</VButton>
 *   </template>
 * </VEmptyState>
 * ```
 */
const { text = "", align = "center" } = defineProps<{
  /** The line. Use the default slot for markup. */
  text?: string
  align?: "start" | "center"
}>();
</script>

<template>
  <div
    :class="`v-empty-state--${align}`"
    class="v-empty-state"
  >
    <p class="v-empty-state__text">
      <slot>{{ text }}</slot>
    </p>

    <div
      v-if="$slots.action"
      class="v-empty-state__action"
    >
      <slot name="action" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "../../styles/components/feedback/vemptystate.scss";
</style>
