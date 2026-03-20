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

const submit = async () => {
  const isValid = await v$.value.$validate();

  if (!isValid) return;
  await authStore.login(form);
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
    <div class="login-form__forgot">
      <VButton
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
.login-form__forgot {
  display: flex;
  justify-content: flex-end;
  margin-top: -0.5rem;
}
</style>
