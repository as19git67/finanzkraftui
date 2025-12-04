<script setup>
import {ref, onMounted, computed} from 'vue';
import {useRouter} from 'vue-router';
import {UserStore} from '@/stores/user';

defineOptions({
  name: 'LoginView'
});

const router = useRouter();
const userStore = UserStore();

const email = ref('');
const password = ref('');
const error = ref(null);
const isCMA = ref(false);

const authenticated = computed(() => userStore.authenticated);

const loginClicked = async () => {
  error.value = '';
  try {
    await userStore.loginBasic(email.value, password.value);
    router.replace({name: 'home'});
  } catch (err) {
    if (err.response?.data) {
      error.value = err.response.data;
    } else {
      error.value = err.message;
    }
  }
};

async function loginWithPasskeyClicked() {
  // 1. Get challenge from server (Relying Party)
  const challenge = await userStore.getLoginChallengeForWebAuth();
  // 2. Use existing public key credential to authenticate user
  const credentials = await navigator.credentials.get({
    mediation: 'conditional',
    publicKey: { challenge: challenge },
  })
  const loginOptions = buildLoginOptionsWith(credentials);
  const response = await userStore.verifyNewUserWebAuthnRegistration(loginOptions);
  if (response.status !== 200) {
    error.value = response.message || 'Fehler beim Anmelden mit Passkey';
    return;
  }
  await router.replace({name: 'home'});
}

function buildLoginOptionsWith(userCredentials) {

  let clientDataJSON;

  // if configured use configured origin by replacing it in clientData
  const baseServerUrlFromConfig = import.meta.env.VITE_APP_API_BASE_URL;

  if (baseServerUrlFromConfig) {
    // replace origin in debug mode
    const clientData = JSON.parse(new TextDecoder().decode(userCredentials.response.clientDataJSON));
    clientData.origin = baseServerUrlFromConfig;

    // convert back to arraybuffer
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(JSON.stringify(clientData));
    clientDataJSON = uint8Array.buffer;
  } else {
    clientDataJSON = userCredentials.response.clientDataJSON;
  }

  const body = {
    response: {
      clientDataJSON: base64url.encode(clientDataJSON),
      attestationObject: base64url.encode(userCredentials.response.attestationObject),
    },
  }

  if (userCredentials.response.getTransports) {
    body.response.transports = userCredentials.response.getTransports()
  }

  return body
}

onMounted(async () => {
  error.value = null;
  if (authenticated.value) {
    await router.replace({name: 'home'});
    return;
  }
  // check if conditional mediation is available
  isCMA.value = await window.PublicKeyCredential.isConditionalMediationAvailable();
});

</script>

<template>
  <div class="sign-in-container">
    <div class="sign-in-card">
      <div class="sign-in-title-container">
        <svg xmlns="http://www.w3.org/2000/svg" class="sign-in-svg" width="33" height="32" viewBox="0 0 33 32">
          <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M7.09219 2.87829C5.94766 3.67858 4.9127 4.62478 4.01426 5.68992C7.6857 5.34906 12.3501 5.90564 17.7655 8.61335C23.5484 11.5047 28.205 11.6025 31.4458 10.9773C31.1517 10.087 30.7815 9.23135 30.343 8.41791C26.6332 8.80919 21.8772 8.29127 16.3345 5.51998C12.8148 3.76014 9.71221 3.03521 7.09219 2.87829ZM28.1759 5.33332C25.2462 2.06 20.9887 0 16.25 0C14.8584 0 13.5081 0.177686 12.2209 0.511584C13.9643 0.987269 15.8163 1.68319 17.7655 2.65781C21.8236 4.68682 25.3271 5.34013 28.1759 5.33332ZM32.1387 14.1025C28.2235 14.8756 22.817 14.7168 16.3345 11.4755C10.274 8.44527 5.45035 8.48343 2.19712 9.20639C2.0292 9.24367 1.86523 9.28287 1.70522 9.32367C1.2793 10.25 0.939308 11.2241 0.695362 12.2356C0.955909 12.166 1.22514 12.0998 1.50293 12.0381C5.44966 11.161 11.0261 11.1991 17.7655 14.5689C23.8261 17.5991 28.6497 17.561 31.9029 16.838C32.0144 16.8133 32.1242 16.7877 32.2322 16.7613C32.2441 16.509 32.25 16.2552 32.25 16C32.25 15.358 32.2122 14.7248 32.1387 14.1025ZM31.7098 20.1378C27.8326 20.8157 22.5836 20.5555 16.3345 17.431C10.274 14.4008 5.45035 14.439 2.19712 15.1619C1.475 15.3223 0.825392 15.5178 0.252344 15.7241C0.250782 15.8158 0.25 15.9078 0.25 16C0.25 24.8366 7.41344 32 16.25 32C23.6557 32 29.8862 26.9687 31.7098 20.1378Z"
          />
        </svg>
        <div class="sign-in-title">
          <div class="sign-in-title-welcome">Willkommen bei Finanzkraft</div>
          <div class="sign-in-title-have-account">
            <span>Sie haben keinen Benutzer? </span>
            <Button asChild v-slot="slotProps" variant="link">
              <RouterLink class="sign-in-title-sign-up" :to="{ name: 'Registration1'}"
                          :class="slotProps.class">Registrieren
              </RouterLink>
            </Button>
          </div>
        </div>
      </div>
      <div class="sign-in-input-container">
        <div class="sign-in-input-fields" v-on:keyup.enter="loginClicked">
          <IconField>
            <InputIcon class="pi pi-user sign-in-input-icon"/>
            <InputText fluid type="text" class="sign-in-input" placeholder="Benutzername" v-focus v-model="email"/>
          </IconField>
          <IconField>
            <InputIcon class="pi pi-lock sign-in-input-icon"/>
            <InputText fluid type="password" class="sign-in-input" placeholder="Passwort" v-model="password"/>
          </IconField>
        </div>
        <Button label="Anmelden" :disabled="!email || email.length < 8 || !password || password.length < 8"
                @click="loginClicked()"/>
      </div>
      <Button label="Mit einem Passkey anmelden" :disabled="!isCMA" @click="loginWithPasskeyClicked()"/>
      <Button asChild v-slot="slotProps" variant="link">
        <RouterLink class="sign-in-forgot-password" to="/" :class="slotProps.class">Passwort vergessen?</RouterLink>
      </Button>
    </div>
  </div>
</template>

<style scoped>
:root {
  --spacing: 10px;
}

.sign-in-container {
  padding-inline: 8px;
  padding-block: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sign-in-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 42px;
  padding-inline: 70px;
  padding-block: 42px;
  width: 100%;
  max-width: 576px;
  backdrop-filter: blur(40px);
  border-radius: 16px;
  background-color: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.1);
}

.sign-in-title-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
  --p-button-link-color: white
}

.sign-in-svg {
  height: calc(var(--spacing) * 14);
  width: calc(var(--spacing) * 14);
}

.sign-in-svg path {
  fill: var(--p-primary-color);
}

.sign-in-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
}

.sign-in-title-welcome {
  text-align: center;
  font-size: 30px;
  line-height: 1.5;
  font-weight: 500;
  color: white;
}

.sign-in-title-have-account {
  text-align: center;
}

.sign-in-title-have-account > span {
  color: rgba(255, 255, 255, 0.8);
}

.sign-in-title-sign-up {
  text-decoration-line: underline;
}

.sign-in-title-sign-up:hover {
  color: rgba(255, 255, 255, 0.9);
}

.sign-in-input-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
  width: 100%;
}

.sign-in-input-fields {
  display: flex;
  flex-direction: column;
  gap: 21px;
  width: 100%;
}

</style>
