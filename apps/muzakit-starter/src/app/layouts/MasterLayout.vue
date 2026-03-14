<script lang="ts" setup>

// import { useAuthStore } from "@/features/auth/store/authStore";
// import { useThemeStore } from "@/features/theme";
// import { useGlobalFiltersStore } from "@/shared/stores";
// import VLoader from "@/shared/ui/common/VLoader.vue";

// import AuthLayout from "./AuthLayout.vue";
// import DefaultLayout from "./DefaultLayout.vue";
// import EmptyLayout from "./EmptyLayout.vue";

// const layouts: Record<string, Component> = {
//   default: DefaultLayout,
//   auth: AuthLayout,
//   empty: EmptyLayout,
// };
//
// const route = useRoute();
// const router = useRouter();
// const themeStore = useThemeStore();
// const authStore = useAuthStore();
// const globalFiltersStore = useGlobalFiltersStore();

// Track router readiness to prevent layout flash
// const isRouterReady = ref(false);
//
// Wait for router to be ready before rendering
// router.isReady().then(() => {
//   isRouterReady.value = true;
// });

// Initialize theme immediately (synchronous)
// themeStore.initTheme();

// Initialize global filters once when user is authenticated
// watch(() => authStore.user, async () => {
//   if (!authStore.user) return;
//
//   // Wait for router to be ready (query params parsed)
//   await router.isReady();
//
//   // Initialize all filters from URL (loads data and restores all filters including dates)
//   await globalFiltersStore.initFilters(route.query as Record<string, string | undefined>);
// }, {
//   immediate: true,
// });

// Dynamically resolve layout from route meta
// const layout = computed(() => {
//   // Don't render anything until router is ready
//   if (!isRouterReady.value) return null;
//   const layoutName = (route.meta?.layout as string) || "default";
//   return layouts[layoutName] || layouts.default;
// });
</script>

<template>
  <!--  <component-->
  <!--    :is="layout"-->
  <!--    v-if="layout"-->
  <!--  />-->
  <!--  <div-->
  <!--    v-else-->
  <!--    class="w-full min-h-screen flex justify-center items-center"-->
  <!--  >-->
  <!--    <VLoader />-->
  <!--  </div>-->
  <router-view />
</template>
