<script lang="ts" setup>
import { computed, defineAsyncComponent, ref, type Component, watch } from "vue";

import { useRoute, useRouter } from "vue-router";

import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { setOnAuthFailed } from "@/shared/config/axios";
import { useGlobalFiltersSync } from "@/shared/config/global-filter/useGlobalFiltersSync";

import LayoutLoader from "./LayoutLoader.vue";
import LayoutLoadError from "./LayoutLoadError.vue";

const authStore = useAuthStore();
const { syncFromUrl } = useGlobalFiltersSync();

const route = useRoute();
const router = useRouter();

// Each layout is its own chunk: the sign-in page never needs the sidebar, topbar and filters,
// and the app shell never needs the sign-in backdrop.
const lazyLayout = (loader: () => Promise<Component>) => defineAsyncComponent({
  loader,
  loadingComponent: LayoutLoader,
  errorComponent: LayoutLoadError,
  delay: 200,
});

const layouts: Record<string, Component> = {
  default: lazyLayout(() => import("./DefaultLayout.vue")),
  auth: lazyLayout(() => import("./AuthLayout.vue")),
};

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
  <LayoutLoader v-else />
</template>
