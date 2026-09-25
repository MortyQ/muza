<script lang="ts" setup>
import { computed } from "vue";

import { useRoute } from "vue-router";

import { VCard } from "@muzakit/ui";

const route = useRoute();

const title = computed(() => String(route.meta.title ?? route.name ?? ""));
</script>

<template>
  <div class="flex items-start pt-6">
    <VCard class="w-full max-w-xl">
      <h2 class="text-lg font-semibold text-foreground">
        {{ title }}
      </h2>
      <p class="mt-1 text-sm text-foreground-muted">
        Placeholder page — this route exists to show nested navigation in the sidebar.
      </p>
      <code class="mt-3 inline-block text-xs text-foreground-secondary">{{ route.path }}</code>
    </VCard>
  </div>
</template>
