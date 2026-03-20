<script lang="ts" setup>
import { computed, reactive } from "vue";

import { useApiPost } from "@ametie/vue-muza-use";
import { useVuelidate } from "@vuelidate/core";
import { email, helpers, minLength, required, sameAs } from "@vuelidate/validators";
import { useRouter } from "vue-router";

import { VInput, VButton, useToast } from "@muzakit/ui";

import { usePasswordStrength } from "@/features/auth/composables/usePasswordStrength";

const router = useRouter();
const { success } = useToast();

const form = reactive({
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
});

const { passwordStrength } = usePasswordStrength(() => form.password);

const rules = computed(() => ({
  name: {
    required: helpers.withMessage("Full name is required", required),
    minLength: helpers.withMessage("Name must be at least 2 characters", minLength(2)),
  },
  email: {
    required: helpers.withMessage("Email is required", required),
    email: helpers.withMessage("Please enter a valid email", email),
  },
  password: {
    required: helpers.withMessage("Password is required", required),
    minLength: helpers.withMessage("Password must be at least 8 characters", minLength(8)),
  },
  confirmPassword: {
    required: helpers.withMessage("Please confirm your password", required),
    sameAs: helpers.withMessage("Passwords do not match", sameAs(form.password)),
  },
}));

const v$ = useVuelidate(rules, form);

const { execute, loading } = useApiPost("/auth/register", {
  data: () => ({
    name: form.name,
    email: form.email,
    password: form.password,
  }),
  onSuccess: () => {
    success("Successfully registered");
    router.replace({ hash: "#tab-login" });
  },
});

const handleSubmit = async () => {
  const isValid = await v$.value.$validate();

  if (!isValid) return;
  await execute();
};
</script>

<template>
  <form
    class="flex flex-col gap-4"
    @submit.prevent="handleSubmit"
  >
    <VInput
      v-model="form.name"
      :validation="v$.name"
      icon="lucide:user"
      name="Name"
    />
    <VInput
      v-model="form.email"
      :validation="v$.email"
      icon="lucide:mail"
      name="Email"
      type="email"
    />
    <div>
      <VInput
        v-model="form.password"
        :validation="v$.password"
        icon="lucide:lock"
        name="Password"
        type="password"
      />
      <div
        class="flex gap-1 mt-1.5 px-0.5"
      >
        <div
          v-for="i in 4"
          :key="i"
          :class="{
            'bg-danger': i <= passwordStrength.strength && passwordStrength.strength === 1,
            'bg-warning': i <= passwordStrength.strength && passwordStrength.strength === 2,
            'bg-info': i <= passwordStrength.strength && passwordStrength.strength === 3,
            'bg-success': i <= passwordStrength.strength && passwordStrength.strength === 4,
            'bg-background': i > passwordStrength.strength
          }"
          class="h-1 flex-1 rounded-full transition-all duration-300"
        />
      </div>
    </div>
    <VInput
      v-model="form.confirmPassword"
      :validation="v$.confirmPassword"
      icon="lucide:lock"
      name="Confirm Password"
      type="password"
    />
    <VButton
      :loading="loading"
      class="w-full"
      text="Create Account"
      type="submit"
      variant="positive"
    />
  </form>
</template>
