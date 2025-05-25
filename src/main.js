import { createApp } from "vue";
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import App from "./App.vue";
import router from "./router";
import { createPinia } from 'pinia'
import axios from 'axios'
import Fluid from 'primevue/fluid';
import Button from "primevue/button"
import ToggleButton from "primevue/togglebutton"
import InputText from "primevue/inputtext"
import InputNumber from "primevue/inputnumber"
import FloatLabel from "primevue/floatlabel";
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import AutoComplete from 'primevue/autocomplete';
import "primeicons/primeicons.css";


import "./assets/main.css";
import NotAuthorizedView from "@/views/NotAuthorizedView.vue";

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
app.use(PrimeVue, {
  theme: {
    preset: Aura
  }
});
app.component('AutoComplete', AutoComplete);
app.component('Fluid', Fluid);
app.component('Button', Button);
app.component('ToggleButton', ToggleButton);
app.component('InputText', InputText);
app.component('InputIcon', InputIcon);
app.component('IconField', IconField);
app.component('InputNumber', InputNumber);
app.component('FloatLabel', FloatLabel);
app.mount("#app");
