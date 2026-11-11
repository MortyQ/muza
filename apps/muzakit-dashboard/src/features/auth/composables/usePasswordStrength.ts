import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from "vue";

interface PasswordStrength {
  /** 0 for an empty password, then 1 (weak) to 4 (strong) */
  strength: number
  label: string
}

export const usePasswordStrength = (
  password: MaybeRefOrGetter<string>,
): { passwordStrength: ComputedRef<PasswordStrength> } => {
  const passwordStrength = computed<PasswordStrength>(() => {
    const pwd = toValue(password);
    if (pwd.length === 0) return { strength: 0, label: "" };

    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[^a-zA-Z\d]/.test(pwd)) strength++;

    const labels = ["Weak", "Fair", "Good", "Strong"];

    return {
      strength,
      label: labels[strength - 1] ?? "",
    };
  });

  return {
    passwordStrength,
  };
};
