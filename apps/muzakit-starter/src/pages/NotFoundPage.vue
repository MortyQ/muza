<script lang="ts" setup>
import { ref } from "vue";

import { useRouter } from "vue-router";

import { VAnimatedBackground, VButton, VCard, VIcon } from "@muzakit/ui";

const router = useRouter();
const mouseX = ref(0);
const mouseY = ref(0);

function goBack() {
  if (window.history.length > 1) router.go(-1);
  else router.push("/");
}

const handleMouseMove = (e: MouseEvent) => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  mouseX.value = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
  mouseY.value = ((e.clientY - rect.top) / rect.height - 0.5) * 20;
};
</script>

<template>
  <div
    class="relative flex items-center justify-center overflow-hidden p-8 w-full"
    @mousemove="handleMouseMove"
  >
    <VAnimatedBackground />

    <!-- Noise texture overlay -->
    <div class="nf-noise absolute inset-0 opacity-[0.03] z-0 pointer-events-none" />

    <!-- Grid pattern -->
    <div class="nf-grid" />

    <!-- Main content card -->
    <VCard
      class="relative z-10 flex flex-col items-center text-center
      max-w-[520px] w-full backdrop-blur-2xl"
      padding="xl"
      size="xl"
      variant="translucent"
    >
      <!-- Floating 404 with parallax -->
      <div
        :style="{ transform: `translate(${mouseX * 0.3}px, ${mouseY * 0.3}px)` }"
        class="flex items-center justify-center gap-2 mb-6 select-none
        transition-transform duration-150 ease-out will-change-transform"
      >
        <span class="nf-digit nf-digit--left">4</span>

        <div
          class="relative flex items-center justify-center
        w-[clamp(5rem,12vw,7rem)] h-[clamp(5rem,12vw,7rem)]"
        >
          <div
            class="nf-ring flex items-center justify-center w-full h-full
            rounded-full bg-primary/[0.06] border border-primary/[0.15]"
          >
            <VIcon
              :size="48"
              class="nf-compass text-primary opacity-60"
              icon="lucide:compass"
            />
          </div>
          <!-- Orbiting dot -->
          <div class="nf-orbit absolute inset-[-4px]">
            <div
              class="nf-orbit-dot absolute top-0 left-1/2 -translate-x-1/2
              -translate-y-1/2 w-2 h-2 rounded-full bg-primary"
            />
          </div>
        </div>

        <span class="nf-digit nf-digit--right">4</span>
      </div>

      <!-- Text -->
      <div class="mb-8">
        <h1
          class="text-[clamp(1.25rem,3vw,1.75rem)] font-bold
        tracking-tight text-foreground m-0 mb-3"
        >
          Page Not Found
        </h1>
        <p
          class="text-[0.9375rem] leading-[1.7] text-foreground-secondary
        max-w-[380px] mx-auto m-0"
        >
          The requested page doesn't exist or may have been moved.
        </p>
      </div>

      <!-- Actions -->
      <div class="flex gap-3 flex-wrap justify-center mb-6">
        <VButton
          icon="lucide:layout-dashboard"
          text="Go to Home"
          to="/"
          variant="primary"
        />
        <VButton
          icon="lucide:undo-2"
          text="Go Back"
          @click="goBack"
        />
      </div>

      <!-- Hint -->
      <p
        class="flex items-center justify-center gap-1.5 text-[0.8125rem]
      text-foreground-muted m-0"
      >
        <VIcon
          :size="14"
          icon="lucide:info"
        />
        If you believe this is an error, contact support.
      </p>
    </VCard>
  </div>
</template>

<style lang="scss" scoped>
/* Noise — SVG data URI can't be inlined cleanly in Tailwind arbitrary values */
.nf-noise {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 256px 256px;
}

/* Grid — needs mask-image + CSS-variable gradient, not expressible in Tailwind */
.nf-grid {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.04;
  background-image: linear-gradient(var(--color-primary) 1px, transparent 1px),
  linear-gradient(90deg, var(--color-primary) 1px, transparent 1px);
  background-size: 60px 60px;
  mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, black 20%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, black 20%, transparent 70%);
}

/* Gradient text — needs -webkit-text-fill-color, not possible in Tailwind */
.nf-digit {
  font-size: clamp(5rem, 14vw, 8rem);
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.04em;
  background: linear-gradient(
          160deg,
          var(--color-primary),
          color-mix(in oklch, var(--color-primary) 40%, transparent)
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 4px 20px color-mix(in oklch, var(--color-primary) 20%, transparent));

  &--left {
    animation: digit-float 4s ease-in-out infinite;
  }

  &--right {
    animation: digit-float 4s ease-in-out infinite;
    animation-delay: -2s;
  }
}

/* Animated box-shadow on ring — Tailwind can't animate CSS-variable shadows */
.nf-ring {
  animation: ring-pulse 4s ease-in-out infinite;
}

.nf-compass {
  animation: compass-spin 8s linear infinite;
}

.nf-orbit {
  animation: orbit-rotate 6s linear infinite;
}

.nf-orbit-dot {
  box-shadow: 0 0 12px color-mix(in oklch, var(--color-primary) 50%, transparent);
}

@keyframes digit-float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

@keyframes compass-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes ring-pulse {
  0%, 100% {
    box-shadow: 0 0 40px color-mix(in oklch, var(--color-primary) 8%, transparent),
    inset 0 0 30px color-mix(in oklch, var(--color-primary) 4%, transparent);
  }
  50% {
    box-shadow: 0 0 60px color-mix(in oklch, var(--color-primary) 15%, transparent),
    inset 0 0 40px color-mix(in oklch, var(--color-primary) 8%, transparent);
  }
}

@keyframes orbit-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
