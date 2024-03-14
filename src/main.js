import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { createPinia } from 'pinia'
import axios from 'axios'

import "./assets/main.css";

let originUrl = new URL(location.origin);
const baseServerUrlFromConfig = import.meta.env.VITE_APP_API_BASE_URL;

axios.defaults.withCredentials = true;
if (baseServerUrlFromConfig) {
  axios.defaults.baseURL = baseServerUrlFromConfig;
} else {
  axios.defaults.baseURL = originUrl.origin;
}

const pinia = createPinia();
const app = createApp(App);

app.directive('focus', {
  // When the bound element is mounted into the DOM...
  mounted(el) {
    // Focus the element
    el.focus();
  },
});

app.use(router);
app.use(pinia);
app.mount("#app");
