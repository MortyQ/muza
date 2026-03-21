<script lang="ts" setup>
import { computed, ref, type Component, watch } from "vue";

import { useRoute, useRouter } from "vue-router";

import { VLoader } from "@muzakit/ui";

import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { setOnAuthFailed } from "@/shared/config/axios";
import { useGlobalFiltersSync } from "@/shared/config/global-filter/useGlobalFiltersSync";

import AuthLayout from "./AuthLayout.vue";
import DefaultLayout from "./DefaultLayout.vue";

const authStore = useAuthStore();
const { syncFromUrl } = useGlobalFiltersSync();

const layouts: Record<string, Component> = {
  default: DefaultLayout,
  auth: AuthLayout,
};

const route = useRoute();
const router = useRouter();

const isRouterReady = ref(false);
router.isReady().then(() => {
  isRouterReady.value = true;
});

setOnAuthFailed(() => authStore.logout());

// Initialize global filters once when user is authenticated
watch(() => authStore.user, () => {
  if (!authStore.user) return;
  syncFromUrl(route.query);
}, {
  immediate: true,
});

const layout = computed(() => {
  if (!isRouterReady.value) return null;
  const layoutName = (route.meta?.layout as string) || "default";
  return layouts[layoutName] || layouts.default;
});
</script>

<template>
  <component
    :is="layout"
    v-if="layout"
    class="w-full"
  />
  <div
    v-else
    class="w-full min-h-screen flex justify-center items-center"
  >
    <VLoader class="text-primary" />
  </div>
</template>
