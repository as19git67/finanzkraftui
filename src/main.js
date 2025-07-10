import { Settings as DateTimeSettings } from 'luxon';
import {createApp} from "vue";
import PrimeVue from 'primevue/config';
import { de } from "primelocale/js/de.js";
import {definePreset} from "@primeuix/themes";
import Aura from '@primeuix/themes/aura';
import App from "./App.vue";
import router from "./router";
import {createPinia} from 'pinia';
import axios from 'axios';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import Fluid from 'primevue/fluid';
import Button from 'primevue/button';
import ToggleButton from "primevue/togglebutton";
import ToggleSwitch from 'primevue/toggleswitch';
import InputText from "primevue/inputtext"
import InputNumber from "primevue/inputnumber"
import InputGroup from 'primevue/inputgroup';
import InputGroupAddon from 'primevue/inputgroupaddon';
import FloatLabel from "primevue/floatlabel";
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import AutoComplete from 'primevue/autocomplete';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import DatePicker from 'primevue/datepicker';
import Chip from 'primevue/chip';
import Textarea from 'primevue/textarea';
import Popover from 'primevue/popover';
import "primeicons/primeicons.css";
import "./assets/main.scss";

DateTimeSettings.defaultLocale = 'de-DE';

let originUrl = new URL(location.origin);
const baseServerUrlFromConfig = import.meta.env.VITE_APP_API_BASE_URL;

axios.defaults.withCredentials = true;
if (baseServerUrlFromConfig) {
  axios.defaults.baseURL = baseServerUrlFromConfig;
} else {
  axios.defaults.baseURL = originUrl.origin;
}

function calculateViewport() {
  return {
    width: window.visualViewport.width,
    height: window.visualViewport.height,
    visual: {
      width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
      height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0),
    }
  };
}

// function setViewPortStyleSheet() {
//   const vp = calculateViewport();
//   const sheet = new CSSStyleSheet();
//   sheet.replaceSync(`:root { --100vvw: ${vp.visual.width}px; --100vvh: ${vp.visual.height}px; --100vw: ${vp.width}px; --100vh: ${vp.height}px;}`);
//   document.adoptedStyleSheets = [sheet];
// }
//
// window.visualViewport.addEventListener('resize', () => {
//   setViewPortStyleSheet()
// });
//
// setViewPortStyleSheet();

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

const MyPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: 'var(--eggplant)',
      100: 'var(--pale-dogwood)',
      200: 'var(--hot-pink)',
      300: 'var(--amaranth-pink)',
      400: 'var(--feldgrau)',
      500: 'var(--asparagus)',
      600: 'var(--sea-green)',
      700: 'var(--sgbus-green)',
      800: 'var(--picton-blue)',
      900: 'var(--linen)',
      950: 'white'
    },
  },
  components: {
    button: {
      colorScheme: {
        light: {
          root: {
            info: {
              background: 'var(--picton-blue)',
              border: 'var(--picton-blue)',
              color: 'white',
              hoverBackground: 'var(--feldgrau)',
              hoverBorder: 'var(--feldgrau)',
              hoverColor: 'white',
              activeBackground: 'var(--sea-green)',
              activeBorder: 'var(--sea-green)',
              activeColor: 'white',
            }
          }
        }
      }
    },
    chip: {
      colorScheme: {
        light: {
          root: {
            background: 'var(--asparagus)',
            color: 'white',
          }
        }
      }
    },
  },
});

app.use(PrimeVue, {
  theme: {
    preset: MyPreset
  },
  locale: de
});
app.use(ConfirmationService);
app.use(ToastService);
app.component('Toast', Toast);
app.component('ConfirmDialog', ConfirmDialog);
app.component('AutoComplete', AutoComplete);
app.component('Fluid', Fluid);
app.component('Button', Button);
app.component('ToggleButton', ToggleButton);
app.component('ToggleSwitch', ToggleSwitch);
app.component('InputText', InputText);
app.component('Textarea', Textarea);
app.component('InputIcon', InputIcon);
app.component('IconField', IconField);
app.component('InputNumber', InputNumber);
app.component('FloatLabel', FloatLabel);
app.component('Select', Select);
app.component('MultiSelect', MultiSelect);
app.component('DatePicker', DatePicker);
app.component('Chip', Chip);
app.component('Popover', Popover);
app.component('InputGroup', InputGroup);
app.component('InputGroupAddon', InputGroupAddon);

app.mount("#app");
