<template>
  <div class="registration-form dialog">
    <h1>Neuen Finanzkraft Benutzer registrieren</h1>
    <hr class="divider-hr"/>
    <form class="registration-grid" v-on:submit.prevent v-on:keyup.enter="registerClicked">
      <label class="email" for="email">Email Adresse:</label>
      <input v-model="email" class="email" id="email" name="Email"/>
      <label class="pass" for="password">Passwort:</label>
      <input type="password" v-model="password" class="pass" id="password" name="Password"/>
      <label class="pass-repeat" for="password-repeat">Passwort wiederholen:</label>
      <input type="password" v-model="passwordRepeat" class="pass-repeat" id="password-repeat"
             name="Password wiederholen"/>
      <div v-if="error" class="error" v-text="error"/>

      <button @click="registerClicked()"
              :disabled="!email || email.length < 8 || !password || password.length < 8 || !passwordRepeat || passwordRepeat.length < 8"
              class="btn btn-register">
        Registrieren
      </button>
    </form>
  </div>
</template>

<script>
import router from "@/router/index";
import {UserStore} from "@/stores/user";
import {mapActions, mapStores, mapState} from "pinia";

export default {
  name: "RegistrationForm1",
  data() {
    return {
      error: this.error,
      email: this.email,
      password: this.password,
      passwordRepeat: this.passwordRepeat,
    };
  },
  computed: {
    ...mapStores(UserStore),
    ...mapState(UserStore, ["authenticated", "user"]),
  },
  methods: {
    ...mapActions(UserStore, ["registerNewUser"]),
    registerClicked() {
      this.error = "";
      this.registerNewUser(this.email, this.password)
      .then(() => {
        router.replace("/login");
      })
      .catch((error) => {
        if (error.response) {
          switch (error.response.status) {
            case 422:
              this.error = "Es existiert bereits ein Benutzerkonto mit der gleichen Email-Adresse."
              break;
          }
        } else {
          this.error = error.message;
        }
      });
    },
  },
  mounted() {
    this.error = null;
  },
};
</script>

<style scoped>
.registration-grid {
  margin-top: 1em;
  display: grid;
  align-items: center;
  gap: 1em;
  grid-template-columns: 1fr 2fr;
  grid-template-rows: 1fr 1fr;
  grid-template-areas:
    "label-email     input-email"
    "label-pass      input-pass"
    "label-pass-r    input-pass-r"
    "error           error"
    "button-register button-register";
}

label.email {
  grid-area: label-email;
}

input.email {
  grid-area: input-email;
}

label.pass {
  grid-area: label-pass;
}

input.pass {
  grid-area: input-pass;
}

label.pass-repeat {
  grid-area: label-pass-r;
}

input.pass-repeat {
  grid-area: input-pass-r;
}

.error {
  grid-area: error;
  color: red;
}

.btn-register {
  grid-area: button-register;
  width: auto;
}

.btn {
  justify-self: center;
  min-width: 100px;
}
</style>
