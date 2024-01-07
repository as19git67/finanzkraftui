<script setup>
import { RouterLink, RouterView } from "vue-router";
import { mapState } from "pinia";
import { UserStore } from "@/stores/user";
</script>

<template>
  <header>

    <div class="wrapper">
      <nav>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/logout" v-if="authenticated">Logout</RouterLink>
        <RouterLink to="/login" v-else>Login</RouterLink>
        <RouterLink to="/Users">Users</RouterLink>
        <RouterLink to="/Roles">Roles</RouterLink>
        <RouterLink to="/registration1">Register</RouterLink>
        <RouterLink to="/about">About</RouterLink>
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

header .wrapper nav {
}

nav {
  flex-wrap: wrap;
  display: flex;
  padding: 0.25em;
  font-size: larger;
  font-weight: bold;
}

nav a.router-link-exact-active {
}

nav a.router-link-exact-active:hover {
}

nav a {
  border-left: 1px solid;
  padding-left: 1em;
}

nav a:first-of-type {
  border: 0;
}

@media (min-width: 1024px) {
  header {
  }

  header .wrapper {
  }

  nav {
  }
}
</style>
