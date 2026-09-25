<script lang="ts" setup>
import { computed, reactive } from "vue";

import { useVuelidate } from "@vuelidate/core";
import { email, helpers, minLength, required } from "@vuelidate/validators";

import { VInput, VButton } from "@muzakit/ui";

import { useAuthStore } from "@/features/auth/store/useAuthStore";

const authStore = useAuthStore();

const form = reactive({
  email: "",
  password: "",
});

const rules = computed(() => ({
  email: {
    required: helpers.withMessage("Email is required", required),
    email: helpers.withMessage("Please enter a valid email", email),
  },
  password: {
    required: helpers.withMessage("Password is required", required),
    minLength: helpers.withMessage("Password must be at least 6 characters", minLength(6)),
  },
}));

const v$ = useVuelidate(rules, form);

// Read from the untracked `.env`, never committed: the button appears only
// where a test account has been configured.
const demoEmail = import.meta.env.VITE_DEMO_EMAIL;
const demoPassword = import.meta.env.VITE_DEMO_PASSWORD;
const hasDemoAccount = !!demoEmail && !!demoPassword;

const submit = async () => {
  const isValid = await v$.value.$validate();

  if (!isValid) return;
  await authStore.login(form);
};

const loginAsDemo = async () => {
  if (!demoEmail || !demoPassword) return;
  form.email = demoEmail;
  form.password = demoPassword;
  await submit();
};
</script>

<template>
  <form
    class="flex flex-col gap-4"
    @submit.prevent="submit"
  >
    <VInput
      v-model="form.email"
      :validation="v$.email"
      icon="lucide:mail"
      name="Email"
      type="email"
    />
    <VInput
      v-model="form.password"
      :validation="v$.password"
      icon="lucide:lock"
      name="Password"
      type="password"
    />
    <div class="login-form__links">
      <VButton
        v-if="hasDemoAccount"
        :disabled="authStore.initLoading"
        text="Log in as test user"
        variant="link"
        @click="loginAsDemo"
      />
      <VButton
        class="login-form__forgot"
        text="Forgot password?"
        variant="link"
      />
    </div>
    <VButton
      :loading="authStore.initLoading"
      class="w-full"
      text="Sign In"
      type="submit"
    />
  </form>
</template>

<style scoped>
.login-form__links {
  display: flex;
  align-items: center;
  margin-top: -0.5rem;
}

.login-form__forgot {
  margin-left: auto;
}
</style>
