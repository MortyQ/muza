import "./styles/tokens.css";

export { default as VButton } from "./components/base/VButton.vue";
export { default as VInput } from "./components/inputs/VInput.vue";

export type { FieldValidation } from "./types/validation";

declare module "vue" {
  export interface GlobalComponents {
    VButton: typeof import("./components/base/VButton.vue").default
    VInput: typeof import("./components/inputs/VInput.vue").default
  }
}
