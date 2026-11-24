<script lang="ts" setup>
import { VButton, VEmptyState } from "@muzakit/ui";

// A layout chunk fails to load when a deploy replaced the hashed files under an open tab;
// a reload fetches the new ones.
const reload = () => window.location.reload();
</script>

<template>
  <div class="w-full min-h-screen flex flex-col gap-4 justify-center items-center">
    <VEmptyState text="This page could not load. A new version may have been released." />
    <VButton @click="reload">
      Reload
    </VButton>
  </div>
</template>
