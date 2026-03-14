<script lang="ts" setup>
// import { computed } from "vue";
import { RouterView } from "vue-router";

// import { getMenuItems } from "@/app/router/modules";
// import { menuItemsToSidebarConfig } from "@/app/router/utils/adapters";
// import { useAuthStore } from "@/features/auth/store/authStore";
// import { useGlobalFiltersStore } from "@/shared/stores";
// import VIcon from "@/shared/ui/common/VIcon.vue";
// import VLoader from "@/shared/ui/common/VLoader.vue";
// import { Sidebar, useSidebar } from "@/shared/ui/navigationSidebar";
// import type { SidebarConfig } from "@/shared/ui/navigationSidebar";
// import GlobalFilterSidebar from "@/widgets/filters/GlobalFilterSidebar.vue";
// import HeaderFilters from "@/widgets/filters/HeaderFilters.vue";

// const authStore = useAuthStore();
// const globalFiltersStore = useGlobalFiltersStore();
// const { isCollapsed, toggleMobile } = useSidebar();
//
// // Footer items - can add additional items here if needed
// const footerItems = computed(() => {
//   const items: Array<{
//     id: string
//     label: string
//     icon: string
//     to?: { name: string }
//     onClick?: () => void
//   }> = [];
//   return items;
// });

// Auto-generated sidebar config from router
// Recomputes when user permissions change
// const sidebarConfig = computed<SidebarConfig>(() => {
//   // Pass authStore to filter menu items by permissions
//   // Computed automatically reacts to authStore.user changes
//   return menuItemsToSidebarConfig(getMenuItems(authStore), {
//     brandName: "SO Insights",
//     footerItems: footerItems.value,
//     showThemeToggle: true,
//     showUserMenu: true,
//   });
// });
//
// // Computed content margin based on sidebar state
// const contentMargin = computed(() => ({
//   "lg:ml-64": !isCollapsed.value,
//   "lg:ml-20": isCollapsed.value,
// }));
</script>

<template>
  <div
    class="flex min-h-screen bg-mainBg text-mainText overflow-x-hidden p-4"
  >
    <!-- Sidebar -->
    <!--    <Sidebar :config="sidebarConfig" />-->

    <!-- Global Filter Sidebar (keep-alive - mounts once) -->
    <!--    <GlobalFilterSidebar />-->

    <!-- Main Content Area -->
    <!--    <div-->
    <!--      :class="contentMargin"-->
    <!--      class="flex-1 flex flex-col transition-all duration-300-->
    <!--      overflow-x-hidden bg-cardBg rounded-xl shadow-glass-soft"-->
    <!--    >-->
    <!--      &lt;!&ndash; Top Header with Mobile Menu Toggle &ndash;&gt;-->
    <!--      <header-->
    <!--        class="bg-base-100 shadow-sm border-b-->
    <!--        border-base-300 flex-shrink-0 lg:hidden"-->
    <!--      >-->
    <!--        <div class="flex items-center justify-between h-16 px-4">-->
    <!--          <button-->
    <!--            aria-label="Open menu"-->
    <!--            class="p-2 rounded-lg hover:bg-base-200-->
    <!--            text-neutral transition-colors"-->
    <!--            type="button"-->
    <!--            @click="toggleMobile"-->
    <!--          >-->
    <!--            <VIcon-->
    <!--              :size="24"-->
    <!--              icon="mdi:menu"-->
    <!--            />-->
    <!--          </button>-->
    <!--          <h1 class="text-lg font-semibold text-primary">-->
    <!--            MuzaKit-->
    <!--          </h1>-->
    <!--          <div class="w-10" />-->
    <!--        </div>-->
    <!--      </header>-->

    <!--      &lt;!&ndash; Main Content &ndash;&gt;-->
    <!--      <main-->
    <!--        v-if="globalFiltersStore.isInitialized"-->
    <!--        class="flex-1 flex flex-col overflow-x-hidden"-->
    <!--      >-->
    <!--        <div class="flex-1 py-4 px-4 sm:px-6 flex flex-col min-w-0">-->
    <!--          &lt;!&ndash; Page Header &ndash;&gt;-->
    <!--          <header-->
    <!--            class="min-h-16 mb-4 pb-4 xl:justify-between-->
    <!--          border-b border-base-300 flex flex-wrap items-center gap-3"-->
    <!--          >-->
    <!--            <HeaderFilters />-->
    <!--          </header>-->
    <!--          &lt;!&ndash; Page Content &ndash;&gt;-->
    <!--          <RouterView v-slot="{ Component, route }">-->
    <!--            <component-->
    <!--              :is="Component"-->
    <!--              :key="route.path"-->
    <!--              class="flex-1 min-w-0"-->
    <!--            />-->
    <!--          </RouterView>-->
    <!--        </div>-->
    <!--      </main>-->
    <!--      <div-->
    <!--        v-else-->
    <!--        class="h-full flex justify-center items-center"-->
    <!--      >-->
    <!--        <VLoader />-->
    <!--      </div>-->
    <!--    </div>-->
    <RouterView />
  </div>
</template>
