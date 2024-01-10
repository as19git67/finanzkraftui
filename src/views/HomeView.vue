<template>
<h1>Buchungen</h1>
  <table v-if="transactions.length">
    <thead>
      <tr>
        <th>Text</th>
        <th>Betrag</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="item of transactions" :key="item">
        <td>{{ item.text }}</td>
        <td>{{ item.amount }}</td>
      </tr>
    </tbody>
  </table>
  <p v-else>Keine Buchungen vom Server geladen</p>
</template>

<script>
import { mapActions, mapState, mapStores } from "pinia";
import { UserStore } from "@/stores/user";
import { TransactionStore } from "@/stores/transactions";
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
    ...mapStores(TransactionStore),
    ...mapState(UserStore, ["authenticated"]),
    ...mapState(TransactionStore, ["transactions"]),
  },
  methods: {
    ...mapActions(TransactionStore, ["getTransactions"]),
    fillTransactions() {
      this.error = "";
      this.getTransactions()
        .then((result) => {
          switch (result) {
            case 200:
              break; // all ok
            case 401:
            case 404:
              router.replace("/login");
              break;
            default:
              this.error = `Fehler beim Abrufen der Transaktionen: ${result}`;
          }
        })
        .catch((error) => {
          this.error = error.message;
        });
    },
  },
  mounted() {
    this.error = null;
    this.fillTransactions();
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
