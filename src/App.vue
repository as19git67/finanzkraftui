<script setup>
import { RouterLink, RouterView } from "vue-router";
import { mapState } from "pinia";
import { UserStore } from "@/stores/user";
import IconFinance from "@/components/icons/IconFinance.vue";
import IconRuleSettings from "@/components/icons/IconRuleSettings.vue";
import IconBankAccounts from "@/components/icons/IconBankAccounts.vue";
import IconUserManagement from "@/components/icons/IconUserManagement.vue";
import IconRoles from "@/components/icons/IconRoles.vue";
import IconLogout from "@/components/icons/IconLogout.vue";
import IconAdd from "@/components/icons/IconAdd.vue";
</script>

<template>
  <header v-if="authenticated">
    <div class="wrapper">
      <nav>
        <RouterLink to="/" v-if="authenticated" title="Buchungsliste"><IconFinance class="nav-icon"/></RouterLink>
        <RouterLink to="/RuleSets" v-if="authenticated && menuPermissions['admin.rules']" title="Regeln"><IconRuleSettings class="nav-icon"/></RouterLink>
        <RouterLink to="/Accounts" v-if="authenticated && menuPermissions['admin.accounts']" title="Bankkonten"><IconBankAccounts class="nav-icon"/></RouterLink>
        <RouterLink to="/addTransaction" v-if="authenticated" title="neue Buchung hinzufügen" class="nav-link--is-large"><IconAdd class="nav-icon"/></RouterLink>
        <RouterLink to="/Users" v-if="authenticated && menuPermissions['admin.users']" title="Benutzerverwaltung"><IconUserManagement class="nav-icon"/></RouterLink>
        <RouterLink to="/Roles" v-if="authenticated && menuPermissions['admin.roles']" title="Benutzerrollen"><IconRoles class="nav-icon"/></RouterLink>
        <RouterLink to="/logout" v-if="authenticated" title="ausloggen"><IconLogout class="nav-icon"/></RouterLink>
      </nav>
    </div>
  </header>
  <RouterView/>
</template>

<script>
export default {
  name: "App",
  computed: {
    ...mapState(UserStore, ["authenticated", "menuPermissions"]),
  },
};
</script>
<style scoped>
header {
  background-color: var(--color-heading);
  color: var(--color-text);
  display: block;
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
  display: flex;
  align-items: center;
  justify-content: center;
  transition: 0.4s;
  padding: 12px;
  width: 60px;
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
  width: 48px;
  height: 48px;
}
</style>
