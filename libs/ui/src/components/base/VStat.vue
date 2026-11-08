<script lang="ts" setup>
/**
 * The one number a block leads with. Label over figure with a 2px gap, the
 * figure in tabular digits at a headline step, and room beside it for a chip
 * (a delta, a status tag) and under it for a hint.
 *
 * One per block: two figures at headline size compete, and the reader no
 * longer knows which one the block is about.
 *
 * The figure is a string the caller formatted — currency, locale and units
 * are the caller's — or the default slot, for a `VCount`.
 *
 * @example
 * ```vue
 * <VStat label="Revenue" :value="formatCurrency(total)" hint="vs. last month">
 *   <template #chip><DeltaIndicator :value="delta" /></template>
 * </VStat>
 * ```
 */
const {
  label,
  value = "",
  hint = undefined,
  size = "md",
  tone = "default",
} = defineProps<{
  label: string
  /** Already formatted. Use the default slot for markup or a VCount. */
  value?: string
  hint?: string
  size?: "md" | "lg"
  /** `danger` only when the figure itself is the problem — not for a negative delta. */
  tone?: "default" | "danger"
}>();
</script>

<template>
  <div
    :class="[`v-stat--${size}`, `v-stat--tone-${tone}`]"
    class="v-stat"
  >
    <span class="v-stat__label">{{ label }}</span>

    <span class="v-stat__row">
      <span class="v-stat__figure">
        <slot>{{ value }}</slot>
      </span>

      <span
        v-if="$slots.chip"
        class="v-stat__chip"
      >
        <slot name="chip" />
      </span>
    </span>

    <span
      v-if="hint || $slots.hint"
      class="v-stat__hint"
    >
      <slot name="hint">{{ hint }}</slot>
    </span>
  </div>
</template>

<style lang="scss" scoped>
@use "../../styles/components/base/vstat.scss";
</style>
