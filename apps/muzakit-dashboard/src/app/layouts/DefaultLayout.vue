<script lang="ts" setup>
import { RouterView } from "vue-router";

import { VButton } from "@muzakit/ui";

import { useMenu } from "@/app/routes/composables/useMenu";
import { useAuthStore } from "@/features/auth/store/useAuthStore";

const authStore = useAuthStore();

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
    <VButton
      text="logout"
      @click="authStore.logout"
    />
  </div>
</template>
