<script lang="ts" setup>
import { VButton } from "@muzakit/ui";
import { useTheme } from "@muzakit/utils";

const { theme, toggleTheme } = useTheme();
</script>

<template>
  <div
    class="min-h-screen bg-mainBg text-mainText flex flex-col items-center
  justify-center gap-6 p-8"
  >
    <div
      class="bg-cardBg border border-border rounded-2xl p-8 w-full
    max-w-sm flex flex-col gap-4 shadow-sm"
    >
      <h1 class="text-2xl font-bold text-mainText">
        Muzakit Starter
      </h1>
      <p class="text-secondaryText text-sm">
        Workspace links: ✅<br>
        Tailwind v4 theme: ✅
      </p>

      <div class="flex items-center justify-between pt-2">
        <span class="text-sm text-mutedText">Current theme:
          <strong class="text-mainText">{{ theme }}</strong></span>
        <VButton
          @click="toggleTheme"
        >
          Toggle theme
        </VButton>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3 w-full max-w-sm text-xs">
      <div class="bg-navigationBg text-primary-text rounded-lg p-3">
        navigationBg
      </div>
      <div class="bg-surfaceBg border border-border rounded-lg p-3 text-mainText">
        surfaceBg
      </div>
      <div class="bg-success/20 text-success rounded-lg p-3">
        success
      </div>
      <div class="bg-danger/20 text-danger rounded-lg p-3">
        danger
      </div>
    </div>
  </div>
</template>
