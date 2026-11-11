<script lang="ts" setup>
import { VToaster } from "@muzakit/ui";
import { useTheme } from "@muzakit/utils";

import MasterLayout from "@/app/layouts/MasterLayout.vue";

// The theme is applied on the first useTheme() call, not when @muzakit/utils is imported, so the
// app root claims it before any layout renders.
useTheme();
</script>

<template>
  <MasterLayout />
  <VToaster />
</template>
