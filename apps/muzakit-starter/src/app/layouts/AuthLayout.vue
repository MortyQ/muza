<script lang="ts" setup>
import { RouterView } from "vue-router";

import { VButton } from "@muzakit/ui";
import { useTheme } from "@muzakit/utils";

const { toggleTheme } = useTheme();

</script>

<template>
  <div class="min-h-screen bg-base-100 text-neutral flex items-center justify-center">
    <!-- Auth Layout - Centered content without navigation -->
    <div class="w-full max-w-md">
      <!-- Theme Toggle in corner -->
      <div class="absolute top-4 right-4">
        <VButton
          icon="lucide:cloud-sun"
          @click="toggleTheme"
        >
          Toggle theme
        </VButton>
      </div>

      <!-- Auth Content -->
      <RouterView />
    </div>
  </div>
</template>
