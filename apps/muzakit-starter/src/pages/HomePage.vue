<script lang="ts" setup>

import { VButton } from "@muzakit/ui";

import { useAuthStore } from "@/features/auth/store/useAuthStore";

const authStore = useAuthStore();
</script>

<template>
  <div>Home</div>

  <VButton
    text="logout"
    @click="authStore.logout"
  />
</template>
