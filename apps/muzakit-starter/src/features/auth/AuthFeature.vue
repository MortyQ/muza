<script lang="ts" setup>
import { VTab, VCard } from "@muzakit/ui";

import LoginForm from "./components/LoginForm.vue";
import RegisterForm from "./components/RegisterForm.vue";

const tabs = [
  { label: "Sign In", id: "login", icon: "lucide:log-in", component: LoginForm },
  { label: "Sign Up", id: "register", icon: "lucide:user-plus", component: RegisterForm },
];
</script>

<template>
  <div
    class="min-h-screen bg-background text-foreground flex flex-col items-center
  justify-center gap-6 p-8"
  >
    <v-card
      size="md"
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
