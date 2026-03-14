<script lang="ts" setup>
import { reactive } from "vue";

import { VInput } from "@muzakit/ui";

const form = reactive({
  name: "",
  password: "",
  confirmPassword: "",
});
</script>

<template>
  <div class="flex flex-col gap-4">
    <div>
      Register
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
    <VInput
      v-model="form.confirmPassword"
      icon="lucide:lock"
      name="Confirm Password"
      type="password"
    />
  </div>
</template>
