import { computed, toValue, type MaybeRefOrGetter } from "vue";

export const usePasswordStrength = (password: MaybeRefOrGetter<string>) => {
  const passwordStrength = computed(() => {
    const pwd = toValue(password);
    if (pwd.length === 0) return { strength: 0, label: "", color: "" };

    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[^a-zA-Z\d]/.test(pwd)) strength++;

    const labels = ["Weak", "Fair", "Good", "Strong"];
    const colors = ["text-error", "text-warning", "text-info", "text-success"];

    return {
      strength,
      label: labels[strength - 1] || "",
      color: colors[strength - 1] || "",
    };
  });

  return {
    passwordStrength,
  };
};
