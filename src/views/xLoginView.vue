<template>
  <div class="login-form dialog">
    <h1>Finanzkraft Login</h1>
    <hr class="divider-hr"/>
    <form class="login-grid" v-on:submit.prevent v-on:keyup.enter="loginClicked">
      <label class="user" for="username">Username:</label>
      <input v-focus v-model="email" class="user" id="username" name="Username"/>
      <label class="pass" for="password">Passwort:</label>
      <input type="password" v-model="password" class="pass" id="password" name="Password"/>
      <div class="error-message">{{error}}</div>
      <button @click="loginClicked()" class="btn btn-login"
              :disabled="!email || email.length < 8 || !password || password.length < 8">Login
      </button>
      <hr class="divider divider-hr"/>
      <button class="btn btn-register" @click="navigateToRegister" role="link">Registrieren</button>
    </form>
  </div>
</template>

<script>
import router from "@/router/index";
import {UserStore} from "@/stores/user";
import {mapActions, mapStores, mapState} from "pinia";

export default {
  name: "LoginView",
  data() {
    return {
      error: this.error,
      email: this.email,
      password: this.password,
    };
  },
  computed: {
    ...mapStores(UserStore),
    ...mapState(UserStore, ["authenticated", "user"]),
  },
  methods: {
    ...mapActions(UserStore, ["loginBasic"]),
    loginClicked() {
      this.error = "";
      this.loginBasic(this.email, this.password)
      .then(() => {
        router.replace({name: 'home'});
      })
      .catch((error) => {
        if (error.response.data) {
          this.error = error.response.data;
        } else {
          this.error = error.message;
        }
      });
    },
    navigateToRegister() {
      router.replace({name: 'Registration1'})
    }
  },
  mounted() {
    this.error = null;
    if(this.authenticated) {
      router.replace({name: 'home'});
    }
  },
};
</script>

<style scoped>

.login-grid {
  margin-top: 1em;
  display: grid;
  gap: 1em;
  grid-template-columns: 1fr 2fr;
  grid-template-rows: 1fr 1fr;
  grid-template-areas:
    "label-user      input-user"
    "label-pass      input-pass"
    "error-message   error-message"
    "button-login    button-login"
    "divider         divider"
    "button-register button-register";
}

.user label {
  grid-area: label-user;
}

.user input {
  grid-area: input-user;
}

.pass label {
  grid-area: label-pass;
}

.pass input {
  grid-area: input-pass;
}

.error-message {
  grid-area: error-message;
  width: auto;
  font-weight: bold;
  color: var(--color-text-error);
}

.btn-login {
  grid-area: button-login;
  width: auto;
}

.btn-register {
  grid-area: button-register;
  width: auto;
}

.btn {
  justify-self: center;
  min-width: 100px;
}

.divider {
  grid-area: divider;
}

.divider-hr {
  border-style: solid;
  color: var(--color-border);
}
</style>
