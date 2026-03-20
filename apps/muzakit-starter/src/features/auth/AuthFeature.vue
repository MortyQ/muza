<script lang="ts" setup>
import { ref } from "vue";

import { VTab, VCard } from "@muzakit/ui";

import LoginForm from "./components/LoginForm.vue";
import RegisterForm from "./components/RegisterForm.vue";

const tabRef = ref<{ currentTabId: string } | null>(null);

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
      variant="translucent"
    >
      <div class="auth-brand">
        <div class="auth-brand__logo">
          M
        </div>
        <h1 class="auth-brand__title">
          Muzakit Starter
        </h1>
        <p class="auth-brand__subtitle">
          {{
            tabRef?.currentTabId === 'login'
              ? 'Welcome back. Sign in to continue.'
              : 'Create your account to get started.'
          }}
        </p>
      </div>
      <VTab
        ref="tabRef"
        :tabs="tabs"
      />
    </v-card>
  </div>
</template>

<style scoped>
.auth-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding-bottom: 1.5rem;
  text-align: center;
}

.auth-brand__logo {
  width: 48px;
  height: 48px;
  border-radius: var(--ui-radius-lg);
  background: linear-gradient(135deg, var(--ui-primary), var(--ui-primary-hover));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ui-primary-foreground);
  margin-bottom: 0.25rem;
  box-shadow: var(--ui-shadow-md);
}

.auth-brand__title {
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--ui-foreground);
  letter-spacing: -0.02em;
}

.auth-brand__subtitle {
  font-size: 0.875rem;
  color: var(--ui-foreground-muted);
  max-width: 260px;
  line-height: 1.5;
}
</style>
