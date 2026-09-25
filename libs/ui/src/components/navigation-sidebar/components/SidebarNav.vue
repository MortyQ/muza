<script lang="ts" setup>
import { useSidebarState } from "../composables/useSidebarState";

import SidebarNavItem from "./SidebarNavItem.vue";

const {
  resolvedItems,
  isCollapsed,
  expandedItems,
  activeItemId,
} = useSidebarState();
</script>

<template>
  <nav
    :class="{ 'sidebar-nav--collapsed': isCollapsed }"
    class="sidebar-nav"
  >
    <div class="sidebar-nav__list">
      <!--
        v-memo: items re-render only when active route, expand state or collapse
        changes. Keyed on the Set itself, not its size — toggleExpanded and
        expandMany reassign a new Set on every change, whereas `size` stays equal
        when one branch opens and another closes in the same tick.
      -->
      <SidebarNavItem
        v-for="item in resolvedItems"
        :key="item.id"
        v-memo="[activeItemId, expandedItems, isCollapsed, item.id]"
        :item="item"
        :level="0"
      />
    </div>
  </nav>
</template>
