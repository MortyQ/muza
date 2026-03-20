<script lang="ts" setup>
import { RouterView } from "vue-router";

import { VAnimatedBackground, VButton } from "@muzakit/ui";
import { useTheme } from "@muzakit/utils";

const { toggleTheme } = useTheme();

</script>

<template>
  <div class="min-h-screen bg-background text-neutral flex items-center justify-center">
    <div class="w-full max-w-md">
      <VAnimatedBackground :count="25" />
      <div class="absolute top-4 right-4 z-2">
        <VButton
          icon="lucide:cloud-sun"
          @click="toggleTheme"
        >
          Toggle theme
        </VButton>
      </div>

      <RouterView v-slot="{ Component, route }">
        <component
          :is="Component"
          :key="route.path"
          class="z-2 relative bg-transparent"
        />
      </RouterView>
    </div>
  </div>
</template>
