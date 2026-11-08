<script lang="ts" setup>
import { computed } from "vue";

export type SkeletonShape = "line" | "disc" | "block";
export type SkeletonSize = "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl";

/**
 * A placeholder at the content's own geometry. A `line` takes the line box of a
 * type step, so swapping it for the real text moves nothing; a `disc` stands in
 * for an avatar or icon disc; a `block` for anything else with a known box.
 *
 * Decorative: the region that is loading carries `role="status"` and its label,
 * not each bar inside it.
 *
 * @example
 * ```vue
 * <div role="status" aria-label="Loading revenue">
 *   <VSkeleton size="sm" width="6rem" />
 *   <VSkeleton size="2xl" width="9rem" />
 * </div>
 * ```
 */
const {
  shape = "line",
  size = "base",
  width = undefined,
  height = undefined,
} = defineProps<{
  shape?: SkeletonShape
  /** Type step whose line box a `line` occupies. Ignored by `disc` and `block`. */
  size?: SkeletonSize
  /** Any CSS length. A line fills its container without one; a disc defaults to the control height. */
  width?: string
  /** Any CSS length. `block` only. */
  height?: string
}>();

const modifiers = computed(() =>
  shape === "line" ? [`v-skeleton--${shape}`, `v-skeleton--${size}`] : [`v-skeleton--${shape}`],
);

const vars = computed(() => {
  const out: Record<string, string> = {};
  if (width) out["--v-skeleton-width"] = width;
  if (height) out["--v-skeleton-height"] = height;
  return Object.keys(out).length ? out : undefined;
});
</script>

<template>
  <span
    :class="modifiers"
    :style="vars"
    aria-hidden="true"
    class="v-skeleton"
  />
</template>

<style lang="scss" scoped>
@use "../../styles/components/feedback/vskeleton.scss";
</style>
