<script lang="ts" setup>
import { RouterView } from "vue-router";

import { VButton } from "@muzakit/ui";
import { useTheme } from "@muzakit/utils";

const { toggleTheme } = useTheme();

</script>

<template>
  <div class="min-h-screen bg-background text-neutral flex items-center justify-center">
    <div class="w-full max-w-md">
      <div class="absolute top-4 right-4">
        <VButton
          icon="lucide:cloud-sun"
          @click="toggleTheme"
        >
          Toggle theme
        </VButton>
      </div>

      <RouterView />
    </div>
  </div>
</template>
