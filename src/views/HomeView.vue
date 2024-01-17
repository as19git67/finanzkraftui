<template>
  <h1>Buchungen
    <span v-if="loading">laden...</span>
    <span v-if="incompleteTransactionList">(es gibt mehr Ergebnisse als dargestellt)</span>
  </h1>
  <form v-on:submit.prevent v-on:keyup.enter="searchTransactions" class="transaction-filter form form--is-right">
    <input type="search" autofocus v-model="searchTerm" placeholder="Suchbegriff">
    <button @click="searchTransactions" class="btn btn--is-primary">Suchen</button>
  </form>
<div class="form">
  <select multiple name="allAccounts">
    <option v-for="item of accountList" :key="item.id" >{{ item.name}}</option>
  </select>
</div>
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
      <tr v-for="(item, index) of transactions" :key="item" :class="{ 'alternate-row-background': index % 2 }">
        <td>{{ DateTime.fromISO(item.valueDate).toLocaleString() }}</td>
        <td>{{ item.text }}</td>
        <td class="right-aligned nowrap">
          {{ `${new Intl.NumberFormat(undefined, { style: 'currency', currency: item.currencyId }).format(item.amount)}` }}
        </td>
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
import {AccountStore} from "@/stores/accounts";

export default {
  name: "Home",
  data() {
    return {
      DateTime: DateTime,
      error: this.error,
      loading: this.loading,
      searchTerm: this.searchTerm,
      accountList: this.accountList,
    };
  },
  computed: {
    ...mapStores(UserStore),
    ...mapStores(AccountStore),
    ...mapStores(TransactionStore),
    ...mapState(UserStore, ["authenticated"]),
    ...mapState(TransactionStore, ["transactions", "incompleteTransactionList", "maxTransactions"]),
    ...mapState(AccountStore, ["accounts"]),
  },
  methods: {
    ...mapActions(TransactionStore, ["getTransactions"]),
    ...mapActions(AccountStore, ["getAccounts"]),
    searchTransactions() {
      this.fillTransactions(this.searchTerm);
    },
    fillTransactions(searchTerm) {
      this.error = "";
      this.loading = true;
      this.getTransactions({maxItems: this.maxTransactions + 10, searchTerm: searchTerm})
        .then((result) => {
          this.loading = false;
          switch (result) {
            case 200:
              if (this.accounts.length === 0) {
                this.fillAccounts()
              } else {
                this._fillAccountList();
              }
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
          this.loading = false;
        });
    },
    fillAccounts() {
      this.error = "";
      this.getAccounts()
          .then((result) => {
            switch (result) {
            case 200:
              this._fillAccountList();
              break; // all ok
            case 401:
              router.replace("/login");
              break;
            default:
              this.accountList = [];
              this.error = `Fehler beim Abrufen der Konten: ${result}`;
            }
          })
          .catch((error) => {
            this.accountList = [];
            this.error = error.message;
          });
    },
    _fillAccountList() {
      // this.accountListe = _.map(this.accounts, function(a) {
      //   return _.pick(a, 'id', 'name');
      // });
      const accountGroups = [
        { id: "g1", name: "Alle" },
        { id: "g2", name: "Martinas Konten" },
        { id: "g3", name: "Antons Konten" },
        { id: "g4", name: "Sparkonten" },
        { id: "g5", name: "Geschlossene Konten" },
      ]
      this.accountList = accountGroups.concat(this.accounts.filter((account) => {
        return account.closedAt === null;
      }));
      console.log(`${this.accountList.length} accounts in list`);
    },
  },
  mounted() {
    this.error = null;
    this.loading = false;
    this.searchTerm = '';
    this.accountList = [];
    this.fillTransactions();
  },
};
</script>

<style scoped>
</style>
