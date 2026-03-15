<script lang="ts" setup>
import { VTab, VCard, VAnimatedBackground } from "@muzakit/ui";

import LoginForm from "./components/LoginForm.vue";
import RegisterForm from "./components/RegisterForm.vue";

const tabs = [
  { label: "Login", id: "login", icon: "lucide:log-in", component: LoginForm },
  { label: "Register", id: "register", icon: "lucide:user-plus", component: RegisterForm },
];
</script>

<template>
  <div
    class="min-h-screen bg-background text-foreground flex flex-col items-center
  justify-center gap-6 p-8"
  >
    <VAnimatedBackground
      :blob-count="20"
      :blob-radius="{min:50, max:100}"
      :blob-speed="2"
    />
    <v-card
      size="md"
      variant="translucent"
    >
      <h1 class="text-2xl font-bold text-foreground">
        Muzakit Starter
      </h1>
      <VTab
        :tabs="tabs"
      />
    </v-card>
  </div>
</template>
