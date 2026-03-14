import { createApp } from "vue";

import { createApi } from "@ametie/vue-muza-use";
import { createPinia } from "pinia";

import { useToast } from "@muzakit/ui";

import { myAxios } from "@/shared/config/axios";

import App from "./App.vue";
import "./assets/main.css";
import { router } from "./routes";

const { error } = useToast();

// Create Vue app instance
const app = createApp(App);

// Install plugins
const pinia = createPinia();
app.use(pinia);
app.use(router);

app.use(createApi({
  axios: myAxios,
  onError: (errorMessage) => {
    if (errorMessage.message === "Token is expired"
      || errorMessage.message === "Token is invalid") return;
    error(errorMessage.message);
  },
}));

app.mount("#app");
