<template>
<h1>Buchungen
  <span v-if="incompleteTransactionList">(es gibt mehr Ergebnisse als dargestellt)</span></h1>
  <input v-model="searchTerm" placeholder="Suchbegriff"><button @click="searchTransactions">Suchen
</button>
  <table v-if="transactions.length">
    <thead>
      <tr>
        <th>Datum</th>
        <th>Text</th>
        <th class="right-aligned">Betrag</th>
        <th>Notiz</th>
        <th>Kategorie</th>
        <th>Konto</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(item, index) of transactions" :key="item" :class="{ 'table-light': index % 2 }">
        <td>{{ DateTime.fromISO(item.valueDate).toLocaleString() }}</td>
        <td>{{ item.text }}</td>
        <td class="right-aligned">{{ `${item.amount} ${item.currencyShort}` }}</td>
        <td>{{ item.notes }}</td>
        <td>{{ item.categoryName }}</td>
        <td>{{ item.accountName }}</td>
      </tr>
    </tbody>
  </table>
  <p v-else>Keine Buchungen vom Server geladen</p>
</template>

<script>
import { DateTime } from "luxon";
import { mapActions, mapState, mapStores } from "pinia";
import { UserStore } from "@/stores/user";
import { TransactionStore } from "@/stores/transactions";
import router from "@/router";

export default {
  name: "Home",
  data() {
    return {
      DateTime: DateTime,
      error: this.error,
      searchTerm: this.searchTerm,
    };
  },
  computed: {
    ...mapStores(UserStore),
    ...mapStores(TransactionStore),
    ...mapState(UserStore, ["authenticated"]),
    ...mapState(TransactionStore, ["transactions", "incompleteTransactionList", "maxTransactions"]),
  },
  methods: {
    ...mapActions(TransactionStore, ["getTransactions"]),
    searchTransactions() {
      this.fillTransactions(this.searchTerm);
    },
    fillTransactions(searchTerm) {
      this.error = "";
      this.getTransactions({maxItems: this.maxTransactions + 10, searchTerm: searchTerm})
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
    this.searchTerm = '';
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
td {
  font-family: "Verdana";
}
.right-aligned {
  text-align: end;
}
.table-light {
  background-color: aliceblue;
}
</style>
