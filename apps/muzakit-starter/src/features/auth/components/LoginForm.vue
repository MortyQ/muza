<script lang="ts" setup>
import { reactive } from "vue";

import { VInput } from "@muzakit/ui";

const form = reactive({
  name: "",
  password: "",
});
</script>

<template>
  <div class="flex flex-col gap-4">
    <div>
      Login
    </div>
    <VInput
      v-model="form.name"
      icon="lucide:cloud"
      name="Name"
    />
    <VInput
      v-model="form.password"
      icon="lucide:lock"
      name="Password"
      type="password"
    />
  </div>
</template>
