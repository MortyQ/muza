<script lang="ts" setup>
export type LoaderColor = "primary" | "success" | "warning" | "danger" | "info";

interface Props {
  size?: "sm" | "md" | "lg"
  message?: string
  fullscreen?: boolean
  color?: LoaderColor
}

const {
  size = "md",
  message = undefined,
  fullscreen = false,
  color = "primary",
} = defineProps<Props>();
</script>

<template>
  <div
    :class="{ 'v-loader--fullscreen': fullscreen }"
    :style="{ color: `var(--ui-${color})` }"
    aria-label="Loading"
    class="v-loader-container"
    role="status"
  >
    <div
      :class="`v-loader--${size}`"
      class="v-loader"
    />

    <slot>
      <span
        v-if="message"
        class="v-loader-message"
      >{{ message }}</span>
    </slot>
  </div>
</template>

<style scoped>
@import "../../styles/components/feedback/vloader.scss";
</style>
