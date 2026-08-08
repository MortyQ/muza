<script lang="ts" setup>
const { maxHeight = undefined } = defineProps<{
  /** Any CSS length; omit to let the panel grow with its container */
  maxHeight?: string
}>();
</script>

<template>
  <div
    :style="maxHeight ? { '--v-scroll-panel-max-height': maxHeight } : undefined"
    class="v-scroll-panel"
  >
    <slot />
  </div>
</template>

<style lang="scss" scoped>
@import "../../styles/components/layout/vscrollpanel.scss";
</style>
