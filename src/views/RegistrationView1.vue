<script setup>
import {computed, onMounted, ref} from 'vue';
import {useRouter} from 'vue-router';
import {UserStore} from '@/stores/user';
import '../base64url';

defineOptions({
  name: 'RegistrationForm1'
});

const router = useRouter();
const userStore = UserStore();

const email = ref('');
const password = ref('');
const passwordRepeat = ref('');
const error = ref(null);

const passwordValidationMessage = computed(() => {
  if (password.value.length === 0) {
    return '';
  }
  if (password.value.length < 8) {
    return 'Das Passwort muss mindestens 8 Zeichen lang sein.';
  } else {
    let re = new RegExp('[a-z]');
    if (!re.test(password.value)) {
      return 'Das Passwort muss mindestens einen Kleinbuchstaben enthalten.';
    }
    re = new RegExp('[A-Z]');
    if (!re.test(password.value)) {
      return 'Das Passwort muss mindestens einen Grossbuchstaben enthalten.';
    }
    re = new RegExp('[0-9]');
    if (!re.test(password.value)) {
      return 'Das Passwort muss mindestens eine Zahl enthalten.';
    }
    re = new RegExp(/[@;:\-_#'+*?=)(\/&%$§"!^]/);
    if (!re.test(password.value)) {
      return 'Das Passwort muss mindestens ein Sonderzeichen enthalten.';
    }
    if (password.value !== passwordRepeat.value) {
      return 'Die Passwörter stimmen nicht überein.';
    } else {
      return '';
    }
  }
});

const userValidationMessage = computed(() => {
  if (email.value.length > 0) {
    let re = new RegExp(/[@]/);
    if (!re.test(email.value)) {
      return 'Die Email-Adresse ist ungültig.';
    }
    re = new RegExp(/[\.]/);
    if (!re.test(email.value)) {
      return 'Die Email-Adresse ist ungültig.';
    }
  } else {
    return '';
  }
});

async function createPublicKeyPairWith(challengeResponse) {
  const options = {
    publicKey: {
      rp: { name: 'finanzkraftpasskeys' },
      user: {
        id: base64url.decode(challengeResponse.user.id),
        name: challengeResponse.user.name,
        displayName: challengeResponse.user.name,
      },
      challenge: base64url.decode(challengeResponse.challenge),
      pubKeyCredParams: [
        {
          type: 'public-key',
          alg: -7, // ES256
        },
        {
          type: 'public-key',
          alg: -257, // RS256
        },
        {
          type: 'public-key',
          alg: -8, // Ed25519
        },
      ],
      authenticatorSelection: {
        userVerification: 'preferred',
      },
    },
  }

  return await navigator.credentials.create(options)
}

function buildLoginOptionsWith(userCredentials) {

  // if configured use configured origin by replacing it in clientData
  const baseServerUrlFromConfig = import.meta.env.VITE_APP_API_BASE_URL;
  if (baseServerUrlFromConfig) {

    // replace origin in debug mode
    const clientData = JSON.parse(new TextDecoder().decode(userCredentials.response.clientDataJSON));
    clientData.origin = baseServerUrlFromConfig;

    // convert back to arraybuffer
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(JSON.stringify(clientData));
    userCredentials.response.clientDataJSON = uint8Array.buffer;
  }

  const body = {
    response: {
      clientDataJSON: base64url.encode(userCredentials.response.clientDataJSON),
      attestationObject: base64url.encode(userCredentials.response.attestationObject),
    },
  }

  if (userCredentials.response.getTransports) {
    body.response.transports = userCredentials.response.getTransports()
  }

  return body
}

async function registerClicked() {
  error.value = '';
  try {
    const response = await userStore.registerNewUserForWebAuth(email.value, password.value);
    if (response.status === 200) {
      const challengeResponse = response.data
      const userCredentials = await createPublicKeyPairWith(challengeResponse);
      console.log('userCredentials', userCredentials);
      const loginOptions = buildLoginOptionsWith(userCredentials);
      const verifyResponse = await userStore.verifyNewUserWebAuthnRegistration(email.value, loginOptions);
    } else {
      error.value = response.message || 'Fehler bei der Registrierung';
    }
  } catch (ex) {
    if (ex.response) {
      switch (ex.response.status) {
        case 422:
          error.value = "Es existiert bereits ein Benutzerkonto mit der gleichen Email-Adresse."
          break;
      }
    } else {
      error.value = ex.message;
    }
  }
}

onMounted(async () => {
  error.value = '';
});
</script>

<template>
  <div class="sign-in-container">
    <div class="sign-in-card">
      <div class="sign-in-title-container">
        <div class="sign-in-title">
          <div class="sign-in-title-welcome">Willkommen bei Finanzkraft</div>
          <div class="sign-in-title-have-account">
            <span>Neuen Finanzkraft Benutzer registrieren? </span>
          </div>
        </div>
      </div>
      <div class="sign-in-input-container">
        <div class="sign-in-input-fields" v-on:keyup.enter="registerClicked">
          <IconField>
            <InputIcon class="pi pi-user sign-in-input-icon"/>
            <InputText fluid type="text" class="sign-in-input" placeholder="Benutzername" v-focus v-model="email"/>
          </IconField>
          <IconField>
            <InputIcon class="pi pi-lock sign-in-input-icon"/>
            <InputText fluid type="password" class="sign-in-input" placeholder="Passwort" v-model="password"/>
          </IconField>
          <IconField>
            <InputIcon class="pi pi-lock sign-in-input-icon"/>
            <InputText fluid type="password" class="sign-in-input" placeholder="Passwort wiederholen"
                       v-model="passwordRepeat"/>
          </IconField>
          <span v-if="userValidationMessage" class="error">{{ userValidationMessage }}</span>
          <span v-if="passwordValidationMessage" class="error">{{ passwordValidationMessage }}</span>
        </div>
        <Button label="Registrieren"
                :disabled="!email || email.length < 8 || !password || password.length < 8|| !passwordRepeat || passwordRepeat.length < 8 || password !== passwordRepeat"
                @click="registerClicked()"/>
      </div>
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
