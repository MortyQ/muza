<script lang="ts" setup>
import { ref } from "vue";

import { VButton, VCard, VInput } from "@muzakit/ui";
import { useTheme } from "@muzakit/utils";

const { theme, toggleTheme } = useTheme();

const test = ref("");
</script>

<template>
  <div
    class="min-h-screen bg-background text-foreground flex flex-col items-center
  justify-center gap-6 p-8"
  >
    <div
      class="bg-surface border border-border rounded-2xl p-8 w-full
    max-w-sm flex flex-col gap-4 shadow-sm"
    >
      <VInput
        v-model="test"
        icon="lucide:cloud-sun"
        name="Test"
      />
      <h1 class="text-2xl font-bold text-foreground">
        Muzakit Starter
      </h1>
      <p class="text-foreground-secondary text-sm">
        Workspace links: ✅<br>
      </p>

      <div class="flex items-center justify-between pt-2">
        <span class="text-sm text-foreground-muted">Current theme:
          <strong class="text-foreground">{{ theme }}</strong></span>
        <VButton
          variant="negative"
          @click="toggleTheme"
        >
          Toggle theme
        </VButton>
      </div>
    </div>

    <VCard size="xl">
      <form
        class="flex flex-col gap-4"
      >
        <VInput
          icon="lucide:mail"
          name="Email"
          type="email"
        />
        <VInput
          icon="lucide:lock"
          name="Password"
          type="password"
        />
        <div class="login-form__forgot">
          <VButton
            text="Forgot password?"
            variant="link"
          />
        </div>
        <VButton
          class="w-full"
          text="Sign In"
          type="submit"
        />
      </form>
    </VCard>
  </div>
</template>
