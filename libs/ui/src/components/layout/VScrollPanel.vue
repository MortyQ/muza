<script lang="ts" setup>
import { useClipboard } from "@vueuse/core";

import VIcon from "../base/VIcon.vue";

const { maxHeight = undefined, copyText = undefined, copyLabel = "Copy to clipboard" } = defineProps<{
  /** Any CSS length; omit to let the panel grow with its container */
  maxHeight?: string
  /**
   * Puts a copy button in the corner and this string on the clipboard. Omit it
   * and the panel renders exactly as before — no button, no wrapper, no
   * behaviour change for existing callers.
   */
  copyText?: string
  copyLabel?: string
}>();

const { copy, copied, isSupported } = useClipboard({ copiedDuring: 2000 });
</script>

<template>
  <div
    :style="maxHeight ? { '--v-scroll-panel-max-height': maxHeight } : undefined"
    class="v-scroll-panel"
  >
    <!-- Sticky rather than absolute: this element *is* the scroll container, so
         an absolutely positioned button would scroll away with the content. Zero
         height keeps it out of the layout — it overlays the first line, which is
         why callers pad their content on the right. -->
    <div
      v-if="copyText !== undefined && isSupported"
      class="v-scroll-panel__copy"
    >
      <button
        :aria-label="copied ? 'Copied' : copyLabel"
        :class="{ 'v-scroll-panel__copy-btn--copied': copied }"
        class="v-scroll-panel__copy-btn"
        type="button"
        @click="copy(copyText)"
      >
        <!-- Both glyphs occupy the same grid cell and cross-fade. Swapping one
             for the other with `v-if` would pop, and the button would resize for
             a frame. -->
        <span class="v-scroll-panel__copy-glyph">
          <VIcon
            :size="14"
            icon="lucide:copy"
          />
        </span>
        <span class="v-scroll-panel__copy-glyph v-scroll-panel__copy-glyph--check">
          <VIcon
            :size="14"
            icon="lucide:check"
          />
        </span>
      </button>
    </div>

    <slot />
  </div>
</template>

<style lang="scss" scoped>
@use "../../styles/components/layout/vscrollpanel.scss";
</style>
