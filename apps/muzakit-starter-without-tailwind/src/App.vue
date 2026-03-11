<script lang="ts" setup>
import { ref } from "vue";

import { VButton, VInput } from "@muzakit/ui";
import { useTheme } from "@muzakit/utils";

const { theme, toggleTheme } = useTheme();

const test = ref("");
</script>

<template>
  <div
    class="min-h-screen bg-background text-foreground flex flex-col items-center
  justify-center gap-6 p-8"
  >
    <div
      class="bg-surface border border-border rounded-2xl p-8 w-full
    max-w-sm flex flex-col gap-4 shadow-sm"
    >
      <VInput
        v-model="test"
        name="Test"
      />
      <h1 class="text-2xl font-bold text-foreground">
        Muzakit Starter
      </h1>
      <p class="text-foreground-secondary text-sm">
        Workspace links: ✅<br>
        Tailwind v4 theme: ✅
      </p>

      <div class="flex items-center justify-between pt-2">
        <span class="text-sm text-foreground-muted">Current theme:
          <strong class="text-foreground">{{ theme }}</strong></span>
        <VButton
          variant="negative"
          @click="toggleTheme"
        >
          Toggle theme
        </VButton>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3 w-full max-w-sm text-xs">
      <div class="bg-nav text-primary-foreground rounded-lg p-3">
        nav
      </div>
      <div class="bg-surface-raised border border-border rounded-lg p-3 text-foreground">
        surface-raised
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
