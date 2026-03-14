<script lang="ts" setup>
import { VButton, VTab, VFloating, VTag, useToast, VCard, VLoader, VAnimatedBackground } from "@muzakit/ui";
import { useTheme } from "@muzakit/utils";

import LoginForm from "@/features/auth/components/LoginForm.vue";
import RegisterForm from "@/features/auth/components/RegisterForm.vue";

const { theme, toggleTheme } = useTheme();
const { success, error } = useToast();

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
    <div class="flex gap-4">
      <VButton
        text="Test Toast Success"
        variant="positive"
        @click="success('Success Toast Error')"
      />
      <VButton
        text="Test Toast Error"
        variant="negative"
        @click="error('Error Toast Error')"
      />
      <VLoader class="text-primary" />
    </div>
    <VFloating>
      <template #trigger>
        <VButton text="Test Floating" />
      </template>
      <template #content>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        Sed do eiusmod tempor incididunt ut
      </template>
    </VFloating>
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

    <div class="flex flex-wrap gap-2 w-full max-w-sm items-center">
      <VTag
        color="primary"
        icon="lucide:zap"
        label="Solid Primary"
        size="xs"
        variant="solid"
      />
      <VTag
        color="success"
        icon="lucide:check"
        label="Solid Success"
        size="sm"
        variant="solid"
      />
      <VTag
        color="error"
        icon="lucide:x"
        label="Solid Error"
        size="xs"
        variant="solid"
      />
      <VTag
        color="warning"
        icon="lucide:alert-triangle"
        label="Solid Warning"
        size="md"
        variant="solid"
      />
      <VTag
        color="info"
        label="Solid Info"
        size="sm"
        variant="solid"
      />
      <VTag
        color="neutral"
        label="Solid Neutral"
        size="xs"
        variant="solid"
      />

      <VTag
        color="primary"
        label="Soft Primary"
        size="md"
        variant="soft"
      />
      <VTag
        color="success"
        icon="lucide:check-circle"
        label="Soft Success"
        size="xs"
        variant="soft"
      />
      <VTag
        color="error"
        label="Soft Error"
        size="sm"
        variant="soft"
      />
      <VTag
        color="warning"
        label="Soft Warning"
        size="xs"
        variant="soft"
      />
      <VTag
        color="info"
        label="Soft Info"
        size="md"
        variant="soft"
      />
      <VTag
        color="gray"
        label="Soft Gray"
        size="sm"
        variant="soft"
      />

      <VTag
        color="primary"
        label="Outline Primary"
        size="sm"
        variant="outline"
      />
      <VTag
        color="success"
        label="Outline Success"
        size="xs"
        variant="outline"
      />
      <VTag
        color="error"
        icon="lucide:ban"
        label="Outline Error"
        size="md"
        variant="outline"
      />
      <VTag
        color="warning"
        label="Outline Warning"
        size="xs"
        variant="outline"
      />
      <VTag
        color="info"
        label="Outline Info"
        size="sm"
        variant="outline"
      />
      <VTag
        color="neutral"
        label="Outline Neutral"
        size="xs"
        variant="outline"
      />

      <VTag
        color="primary"
        label="Ghost Primary"
        size="xs"
        variant="ghost"
      />
      <VTag
        color="success"
        label="Ghost Success"
        size="md"
        variant="ghost"
      />
      <VTag
        color="error"
        label="Ghost Error"
        size="xs"
        variant="ghost"
      />
      <VTag
        color="warning"
        icon="lucide:flame"
        label="Ghost Warning"
        size="sm"
        variant="ghost"
      />
      <VTag
        color="info"
        label="Ghost Info"
        size="xs"
        variant="ghost"
      />
      <VTag
        color="gray"
        label="Ghost Gray"
        size="md"
        variant="ghost"
      />
    </div>
  </div>
</template>
