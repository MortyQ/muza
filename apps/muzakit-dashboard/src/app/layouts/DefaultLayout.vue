<script lang="ts" setup>
import { computed } from "vue";

import { RouterView, useRouter } from "vue-router";

import { VButton, NavigationSidebar, createSidebar, VIcon } from "@muzakit/ui";
import { useTheme, prefetchRoute } from "@muzakit/utils";

import { useMenu } from "@/app/routes/composables/useMenu";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { useGlobalFiltersStore } from "@/shared/store/useGlobalFiltersStore";
import GlobalFiltersWrapper from "@/widgets/global-filters/GlobalFiltersWrapper.vue";

const authStore = useAuthStore();

const { menuItems } = useMenu();
const router = useRouter();
const { toggleTheme } = useTheme();
const globalFiltersStore = useGlobalFiltersStore();

const sidebar = createSidebar({
  items: menuItems,
  brandName: "Muzakit",
  storageKey: "so-insights-sidebar",
  persistCollapse: true,
  persistentQueryParams: ["since", "until", "granularity"],
});

const contentMargin = computed(() => ({
  "lg:ml-64": !sidebar.isCollapsed.value,
  "lg:ml-20": sidebar.isCollapsed.value,
}));
</script>

<template>
  <div
    class="flex min-h-screen bg-mainBg text-mainText overflow-x-hidden p-4"
  >
    <NavigationSidebar
      :sidebar="sidebar"
      @prefetch="(to) => prefetchRoute(router, to)"
    >
      <template #footer-end>
        <VButton
          class="w-full"
          icon="lucide:cloud-sun"
          @click="toggleTheme"
        >
          Toggle theme
        </VButton>

        <VButton
          text="logout"
          @click="authStore.logout"
        />
      </template>
    </NavigationSidebar>

    <div
      :class="contentMargin"
      class="flex-1 flex flex-col transition-all duration-300
      overflow-x-hidden rounded-xl shadow-lg bg-surface-sunken"
    >
      <header
        class="shadow-sm border-b flex-shrink-0 lg:hidden"
      >
        <div class="flex items-center justify-between h-16 px-4">
          <button
            aria-label="Open menu"
            class="p-2 rounded-lg transition-colors cursor-pointer hover:text-primary"
            type="button"
            @click="sidebar.toggleMobile"
          >
            <VIcon
              :size="24"
              icon="lucide:menu"
            />
          </button>
          <h1 class="text-lg font-semibold">
            SO Insights
          </h1>
          <div class="w-10" />
        </div>
      </header>

      <main
        v-if="globalFiltersStore.isInitialized"
        class="flex-1 flex flex-col overflow-x-hidden"
      >
        <div class="flex-1 py-4 px-4 sm:px-6 flex flex-col min-w-0">
          <!-- Page Header -->
          <header
            class="min-h-fit xl:justify-between
         flex flex-wrap items-center gap-3"
          >
            Headers
            <GlobalFiltersWrapper />
          </header>
          <!-- Page Content -->
          <RouterView v-slot="{ Component, route }">
            <component
              :is="Component"
              :key="route.path"
              class="flex-1 min-w-0"
            />
          </RouterView>
        </div>
      </main>
    </div>
  </div>
</template>
