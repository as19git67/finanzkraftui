<template>
<h1>Accounts</h1>
  <table v-if="accounts.length">
    <thead>
      <tr>
        <th>Accounts</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="item of accounts" :key="item">
        <td>{{ item.name }}</td>
      </tr>
    </tbody>
  </table>
  <p v-else>Keine Accounts vom Server geladen</p>
</template>

<script>
import { mapActions, mapState, mapStores } from "pinia";
import { UserStore } from "@/stores/user";
import { AccountStore } from "@/stores/accounts";
import router from "@/router";

export default {
  name: "Home",
  data() {
    return {
      error: this.error,
    };
  },
  computed: {
    ...mapStores(UserStore),
    ...mapStores(AccountStore),
    ...mapState(UserStore, ["authenticated"]),
    ...mapState(AccountStore, ["accounts"]),
  },
  methods: {
    ...mapActions(AccountStore, ["getAccounts"]),
    fillAccounts() {
      this.error = "";
      this.getAccounts()
        .then((result) => {
          switch (result) {
            case 200:
              break; // all ok
            case 401:
              router.replace("/login");
              break;
            default:
              this.error = `Fehler beim Abrufen der Konten: ${result}`;
          }
        })
        .catch((error) => {
          this.error = error.message;
        });
    },
  },
  mounted() {
    this.error = null;
    this.fillAccounts();
  },
};
</script>

<style scoped>
th {
  font-weight: bold;
  text-align: start;
  border-bottom: 1px solid rebeccapurple;
}
</style>