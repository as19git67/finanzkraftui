<template>
  <h1>Konten</h1>
  <table v-if="accounts.length">
    <thead>
    <tr>
      <th>Name</th>
      <th>IBAN</th>
      <th>Währung</th>
    </tr>
    </thead>
    <tbody>
    <tr v-for="(item, index) of accounts" :key="item" :class="{ 'account-closed': !!item.closedAt, 'table-light': index % 2 }">
      <td>{{ item.name }}</td>
      <td>{{ item.iban }}</td>
      <td>{{ item.currencyName }}</td>
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
td {
  font-family: "Verdana";
}
.account-closed {
  color: lavender;
}
.table-light {
  background-color: aliceblue;
}
</style>
