import "./styles/tokens.css";

export { default as VButton } from "./components/base/VButton.vue";
export { default as VIcon } from "./components/base/VIcon.vue";
export { default as VTag, type TagVariant, type TagColor, type TagSize } from "./components/base/VTag.vue";
export { default as VInput } from "./components/inputs/VInput.vue";
export { default as VTab } from "./components/layout/VTab.vue";
export { default as VFloating } from "./components/overlay/VFloating.vue";
export { default as VToaster } from "./components/feedback/VToaster.vue";

export { useToast } from "./composables/useToast";

export type { FieldValidation } from "./types/validation";

declare module "vue" {
  export interface GlobalComponents {
    VButton: typeof import("./components/base/VButton.vue").default
    VIcon: typeof import("./components/base/VIcon.vue").default
    VTag: typeof import("./components/base/VTag.vue").default
    VInput: typeof import("./components/inputs/VInput.vue").default
    VTab: typeof import("./components/layout/VTab.vue").default
    VFloating: typeof import("./components/overlay/VFloating.vue").default
    VToaster: typeof import("./components/feedback/VToaster.vue").default
  }
}
