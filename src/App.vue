<script setup>
import { RouterLink, RouterView } from "vue-router";
import { mapState } from "pinia";
import { UserStore } from "@/stores/user";
</script>

<template>
  <header>
    <div class="wrapper">
      <nav>
        <RouterLink to="/" v-if="authenticated">Home</RouterLink>
        <RouterLink to="/Accounts" v-if="authenticated">Konten</RouterLink>
        <RouterLink to="/Users" v-if="authenticated">User</RouterLink>
        <RouterLink to="/Roles" v-if="authenticated">Rollen</RouterLink>
        <RouterLink to="/registration1" v-if="!authenticated">Register</RouterLink>
        <RouterLink to="/logout" v-if="authenticated">Logout</RouterLink>
        <RouterLink to="/login" v-else>Login</RouterLink>
      </nav>
    </div>
  </header>
  <RouterView/>
</template>

<script>
export default {
  name: "App",
  computed: {
    ...mapState(UserStore, ["authenticated"]),
  },
};
</script>
<style scoped>
header {
  background-color: var(--color-heading);
  color: var(--color-text);
  display: block;
  margin-bottom: 0.5em;
}

nav {
  flex-wrap: wrap;
  display: flex;
  font-size: larger;
  font-weight: bold;
}

nav a.router-link-exact-active {
}

nav a.router-link-exact-active:hover {
}

nav a {
  border-left: 1px solid;
}

nav a:first-of-type {
  border: 0;
}
</style>
