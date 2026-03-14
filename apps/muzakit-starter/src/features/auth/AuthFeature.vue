<script lang="ts" setup>
import { VButton, VTab, VCard, VAnimatedBackground } from "@muzakit/ui";
import { useTheme } from "@muzakit/utils";

import LoginForm from "./components/LoginForm.vue";
import RegisterForm from "./components/RegisterForm.vue";

const { theme, toggleTheme } = useTheme();

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
      <div class="flex items-center justify-between pt-2">
        <span class="text-sm text-foreground-muted">Current theme:
          <strong class="text-foreground">{{ theme }}</strong></span>
        <VButton
          icon="lucide:cloud-sun"
          @click="toggleTheme"
        >
          Toggle theme
        </VButton>
      </div>
    </v-card>
  </div>
</template>
