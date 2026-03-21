<script lang="ts" setup>
import { RouterView } from "vue-router";

import { VButton } from "@muzakit/ui";
import { useTheme } from "@muzakit/utils";

import { useMenu } from "@/app/routes/composables/useMenu";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import GlobalFiltersWrapper from "@/widgets/global-filters/GlobalFiltersWrapper.vue";

const authStore = useAuthStore();

const { menuItems } = useMenu();
const { toggleTheme } = useTheme();
</script>

<template>
  <div
    class="flex flex-col min-h-screen w-full bg-background text-mainText overflow-x-hidden"
  >
    <div class="w-full flex justify-between p-4">
      <GlobalFiltersWrapper />

      <VButton
        icon="lucide:cloud-sun"
        @click="toggleTheme"
      >
        Toggle theme
      </VButton>
    </div>
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
