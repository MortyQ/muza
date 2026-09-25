<script lang="ts" setup>
import { computed } from "vue";

import VIcon from "./VIcon.vue";

export interface ThemeOption {
  value: string
  label: string
  /** Any lucide/iconify icon id, e.g. "lucide:sun" */
  icon?: string
}

const {
  themes,
  variant = "cycle",
  size = undefined,
  vertical = false,
} = defineProps<{
  /** All available theme options — labels + icons */
  themes: ThemeOption[]
  /**
   * "cycle"   — single icon button that cycles through themes on click
   * "segment" — all themes displayed as a segmented-control strip
   * "toggle"  — icon-only track with one sliding thumb, full width
   */
  variant?: "cycle" | "segment" | "toggle"
  /**
   * 28 / 32 / 40px. Left unset the control keeps the chrome's natural 30px,
   * which is what every other control in a toolbar row stands at.
   */
  size?: "sm" | "md" | "lg"
  /** Stack the toggle's options — for a collapsed sidebar, where side by side they would not fit */
  vertical?: boolean
}>();

const model = defineModel<string>({ required: true });

const iconSize = computed(() => (size ? { sm: 14, md: 16, lg: 20 }[size] : 15));

const currentTheme = computed(
  () => themes.find(t => t.value === model.value) ?? themes[0],
);

const nextTheme = computed(() => {
  const i = themes.findIndex(t => t.value === model.value);
  return themes[(i + 1) % themes.length];
});

const activeIndex = computed(() => Math.max(0, themes.findIndex(t => t.value === model.value)));

const cycle = () => {
  model.value = nextTheme.value.value;
};

const rootClass = computed(() => [
  "v-theme-switcher",
  `v-theme-switcher--${variant}`,
  size ? `v-theme-switcher--${size}` : "",
  { "v-theme-switcher--vertical": variant === "toggle" && vertical },
]);

</script>

<template>
  <!-- ── Cycle variant: single animated icon button ── -->
  <button
    v-if="variant === 'cycle'"
    :aria-label="`Theme: ${currentTheme?.label}. Switch to ${nextTheme?.label}`"
    :class="rootClass"
    :title="`Switch to ${nextTheme?.label}`"
    type="button"
    @click="cycle"
  >
    <Transition
      mode="out-in"
      name="v-theme-icon"
    >
      <VIcon
        :key="model"
        :icon="currentTheme?.icon ?? 'lucide:palette'"
        :size="iconSize"
      />
    </Transition>
  </button>

  <!-- ── Toggle variant: one thumb that slides, so the options read as one control ── -->
  <div
    v-else-if="variant === 'toggle'"
    :class="rootClass"
    :style="{ '--v-ts-count': themes.length, '--v-ts-index': activeIndex }"
    aria-label="Theme"
    role="radiogroup"
  >
    <span
      aria-hidden="true"
      class="v-ts__thumb"
    />
    <button
      v-for="theme in themes"
      :key="theme.value"
      :aria-checked="model === theme.value"
      :aria-label="theme.label"
      :class="{ 'v-ts__option--active': model === theme.value }"
      :title="theme.label"
      class="v-ts__option"
      role="radio"
      type="button"
      @click="model = theme.value"
    >
      <VIcon
        :icon="theme.icon ?? 'lucide:palette'"
        :size="iconSize - 1"
      />
    </button>
  </div>

  <!-- ── Segment variant: strip with all themes ── -->
  <div
    v-else
    :class="rootClass"
  >
    <button
      v-for="theme in themes"
      :key="theme.value"
      :aria-pressed="model === theme.value"
      :class="{ 'v-ts__item--active': model === theme.value }"
      :title="theme.label"
      class="v-ts__item"
      type="button"
      @click="model = theme.value"
    >
      <VIcon
        v-if="theme.icon"
        :icon="theme.icon"
        :size="iconSize"
      />
      <span class="v-ts__label">{{ theme.label }}</span>
    </button>
  </div>
</template>
<style scoped>
@import "../../styles/components/base/vthemeswitcher.scss";
</style>
