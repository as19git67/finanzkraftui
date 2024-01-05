<template>
  <div class="login-form">
    <h1>Login</h1>
    <hr>
    <div class="login-grid">
      <label class="user" for="username">Username:</label>
      <input v-model="email" class="user" id="username" name="Username" />
      <label class="pass" for="password">Passwort:</label>
      <input
        type="password"
        v-model="password"
        class="pass"
        id="password"
        name="Password"
      />
      <button
        @click="loginClicked()"
        :disabled="
          !email || email.length < 8 || !password || password.length < 8
        "
        class="btn btn-login"
      >
        Login
      </button>
      <hr class="divider" />
      <router-link
        class="register-router-link"
        to="/registration1"
        v-slot="{ navigate }"
      >
        <button class="btn btn-register" @click="navigate" role="link">
          Registrieren
        </button>
      </router-link>
    </div>
  </div>
</template>

<script>
import router from "@/router/index";
import { UserStore } from "@/stores/user";
import { mapActions, mapStores, mapState } from "pinia";

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
          router.replace("/");
        })
        .catch((error) => {
          this.error = error.message;
        });
    },
  },
  mounted() {
    this.error = null;
  },
};
</script>

<style scoped>
.login-form {
  border: 1px solid mediumvioletred;
  margin-top: 1em;
  padding: 1em;
}

.login-grid {
  margin-top: 1em;
  display: grid;
  gap: 1em;
  grid-template-columns: 1fr 2fr;
  grid-template-rows: 1fr 1fr;
  grid-template-areas:
    "label-user      input-user"
    "label-pass      input-pass"
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
</style>