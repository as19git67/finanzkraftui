<script setup>
import { RouterLink, RouterView } from "vue-router";
import {UserStore} from "@/stores/user";
import IconFinance from "@/components/icons/IconFinance.vue";
import IconRuleSettings from "@/components/icons/IconRuleSettings.vue";
import IconBriefcase from "@/components/icons/IconBriefcase.vue";
import IconBankAccounts from "@/components/icons/IconBankAccounts.vue";
import IconUserManagement from "@/components/icons/IconUserManagement.vue";
import IconRoles from "@/components/icons/IconRoles.vue";
import IconLogout from "@/components/icons/IconLogout.vue";
import {onMounted, watch, computed, ref} from "vue";
import router from "@/router";

defineOptions({
  name: 'App',
});

const userStore = UserStore();

const authenticated = computed(() => userStore.isAuthenticated);
const menuPermissions = computed(() => userStore.menuPermissions);


watch(authenticated, (newVal) => {
  if (!newVal) {
    router.replace({name: 'login'});
  }
});

onMounted(async () => {
});

function logout() {
  userStore.logout();
}
</script>

<template>
  <header v-if="authenticated">
    <div class="wrapper">
      <nav>
        <RouterLink to="/" v-if="authenticated && menuPermissions['user.accounts']" title="Buchungsliste"><IconFinance class="nav-icon"/></RouterLink>
        <RouterLink to="/RuleSets" v-if="authenticated && menuPermissions['admin.rules']" title="Regeln"><IconRuleSettings class="nav-icon"/></RouterLink>
        <RouterLink to="/Accounts" v-if="authenticated && menuPermissions['admin.accounts']" title="Bankkonten"><IconBriefcase class="nav-icon"/></RouterLink>
        <RouterLink to="/Bankcontacts" v-if="authenticated && menuPermissions['admin.onlinebanking']" title="Online Banking"><IconBankAccounts class="nav-icon"/></RouterLink>
        <RouterLink to="/Users" v-if="authenticated && menuPermissions['admin.users']" title="Benutzerverwaltung"><IconUserManagement class="nav-icon"/></RouterLink>
        <RouterLink to="/Roles" v-if="authenticated && menuPermissions['admin.roles']" title="Benutzerrollen"><IconRoles class="nav-icon"/></RouterLink>
        <Button v-if="authenticated" title="ausloggen" link @click="logout"><IconLogout class="nav-icon"/></Button>
      </nav>
    </div>
  </header>
  <RouterView/>
</template>

<style scoped>
header {
  background-color: var(--app-menu-color-background);
  color: var(--app-menu-color-text);
  display: block;
}

nav {
  flex-wrap: wrap;
  display: flex;
  justify-content: space-between;
  font-size: larger;
  font-weight: bold;
}

nav a.router-link-exact-active {
}

nav a.router-link-exact-active:hover {
}

nav a,
nav button {
  border-radius: 0;
  border-left: 1px solid var(--eggplant);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: 0.4s;
  flex: 1 1 auto;
  padding-block: 0.25em;
  color: var(--app-menu-color-text);
}

nav button:not(:disabled):hover {
  border-left-color: var(--eggplant);
}

nav a:first-of-type {
  border: 0;
}

.nav-icon {
  width: 24px;
  height: 24px;
}

nav a.nav-link--is-large {
  padding: 0;
}

nav a.nav-link--is-large .nav-icon {
  width: 42px;
  height: 42px;
}
</style>
