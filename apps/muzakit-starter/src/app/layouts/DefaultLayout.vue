<script lang="ts" setup>
import { RouterView } from "vue-router";

import { useMenu } from "@/app/routes/composables/useMenu";

const { menuItems } = useMenu();
</script>

<template>
  <div
    class="flex min-h-screen w-full bg-background text-mainText overflow-x-hidden"
  >
    <div class="flex flex-col gap-2 p-4">
      <span
        v-for="item in menuItems"
        :key="item.id"
      >
        {{ item.label }}
      </span>
    </div>
    <RouterView />
  </div>
</template>
