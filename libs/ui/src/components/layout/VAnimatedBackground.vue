<script lang="ts" setup>
import { computed } from "vue";

interface Props {
  count?: number
  minRadius?: number
  maxRadius?: number
  speed?: number
  colors?: string[]
}

const {
  count = 15,
  minRadius = 100,
  maxRadius = 200,
  speed = 1,
  colors = [
    "rgba(37, 99, 235, 0.3)", // primary
    "rgba(251, 191, 36, 0.3)", // accent
    "rgba(14, 165, 233, 0.3)", // info
    "rgba(34, 197, 94, 0.3)", // success
  ],
} = defineProps<Props>();

/** Average drift, in px per second at `speed` 1 — the pace the canvas version had at 60fps. */
const DRIFT_PX_PER_SECOND = 15;
const RGB = /rgba?\((\d+),\s*(\d+),\s*(\d+)/;

const random = (min: number, max: number) => min + Math.random() * (max - min);

/** The blob's centre and its halo. An `rgb()` colour keeps its hue at fixed alphas, as the canvas
 *  drew it; anything else (a token, a named colour) is mixed toward transparent instead. */
const stops = (color: string) => {
  const match = color.match(RGB);
  if (!match) {
    return {
      core: `color-mix(in oklch, ${color} 50%, transparent)`,
      halo: `color-mix(in oklch, ${color} 25%, transparent)`,
    };
  }
  const [, r, g, b] = match;
  return { core: `rgba(${r}, ${g}, ${b}, 0.5)`, halo: `rgba(${r}, ${g}, ${b}, 0.25)` };
};

// Every value reaches CSS as a custom property; the motion itself is a CSS animation of
// `transform`, so it runs on the compositor and leaves the main thread idle. The canvas
// version repainted every blob 60 times a second for as long as the page was open.
const blobs = computed(() => Array.from({ length: count }, (_, i) => {
  const radius = random(0, maxRadius) + minRadius;
  const dx = random(-1, 1) * radius * 1.5;
  const dy = random(-1, 1) * radius * 1.5;
  const duration = speed > 0 ? Math.hypot(dx, dy) / (DRIFT_PX_PER_SECOND * speed) : 0;
  const { core, halo } = stops(colors[i % colors.length]);

  return {
    "--v-blob-x": `${random(0, 100)}%`,
    "--v-blob-y": `${random(0, 100)}%`,
    "--v-blob-size": `${radius * 2}px`,
    "--v-blob-dx": `${dx}px`,
    "--v-blob-dy": `${dy}px`,
    "--v-blob-period": `${Math.max(duration, 1)}s`,
    "--v-blob-offset": `${-random(0, duration)}s`,
    "--v-blob-play": speed > 0 ? "running" : "paused",
    "--v-blob-core": core,
    "--v-blob-halo": halo,
  };
}));
</script>

<template>
  <div
    aria-hidden="true"
    class="v-animated-background"
  >
    <span
      v-for="(blob, index) in blobs"
      :key="index"
      :style="blob"
      class="v-animated-background__blob"
    />
  </div>
  <div class="v-animated-background__tint" />
</template>

<style lang="scss" scoped>
@use "../../styles/components/layout/vanimatedbackground.scss";
</style>
