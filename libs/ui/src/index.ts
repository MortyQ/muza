import "./styles/tokens.css";

export { default as VButton } from "./components/base/VButton.vue";

declare module "vue" {
  export interface GlobalComponents {
    VButton: typeof import("./components/base/VButton.vue").default
  }
}
