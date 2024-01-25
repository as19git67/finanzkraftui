<template>
  <h1>Buchungen
    <span v-if="loading">laden...</span>
    <span v-if="incompleteTransactionList">(es gibt mehr Ergebnisse als dargestellt)</span>
  </h1>
  <form v-on:submit.prevent v-on:keyup.enter="searchTransactions"
        class="transaction-filter form">
    <div class="form-component">
      <label for="accountFilter">Bankkonten:</label>
      <select name="accountFilter" id="accountFilter" v-model="accountFilter"
              @change="accountChanged">
        <option v-for="item of accountList" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select>
    </div>
    <div class="form-component">
      <label for="dateFilter">Zeitspanne:</label>
      <select name="dateFilter" id="dateFilter" v-model="dateFilter"
              @change="dateFilterChanged">
        <option v-for="item of timespanList" :key="item.id" :value="item.id">{{
            item.name
          }}
        </option>
      </select>
    </div>
    <div class="form-component">
      <input type="search" autofocus v-model="searchTerm" placeholder="Suchbegriff">
      <button @click="searchTransactions" class="btn btn--is-primary">Suchen</button>
    </div>
  </form>
  <table v-if="transactions.length">
    <thead>
    <tr>
      <th>Datum</th>
      <th>Text</th>
      <th class="right-aligned">Betrag</th>
      <th>Konto</th>
    </tr>
    </thead>
    <tbody>
    <tr v-for="(item, index) of transactions" :key="item" :class="{ 'alternate-row-background': index % 2 }">
      <td>{{ DateTime.fromISO(item.valueDate).toLocaleString() }}</td>
      <td class="td-text">
        <div class="td-text-item">{{ item.text }}</div>
        <div class="td-text-item item--is-category">{{ item.categoryName }}</div>
        <div class="td-text-item item--is-notes">{{ item.notes }}</div>
      </td>
      <td class="right-aligned nowrap">
        {{ `${new Intl.NumberFormat(undefined, {style: 'currency', currency: item.currencyId}).format(item.amount)}` }}
      </td>
      <td class="nowrap">{{ item.accountName }}</td>
    </tr>
    </tbody>
  </table>
  <p v-else>Keine Buchungen vom Server geladen</p>
</template>

<script>
import {DateTime} from "luxon";
import {mapActions, mapState, mapStores} from "pinia";
import {UserStore} from "@/stores/user";
import {MasterDataStore} from "@/stores/masterdata";
import {TransactionStore} from "@/stores/transactions";
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
      accountFilter: this.accountFilter,
      timespanList: this.timespanList,
      dateFilter: this.dateFilter,
    };
  },
  computed: {
    ...mapStores(UserStore),
    ...mapStores(AccountStore),
    ...mapStores(TransactionStore),
    ...mapStores(MasterDataStore),
    ...mapState(UserStore, ["authenticated"]),
    ...mapState(TransactionStore, ["transactions", "incompleteTransactionList", "maxTransactions"]),
    ...mapState(AccountStore, ["accounts"]),
    ...mapState(MasterDataStore, ["timespans"]),
  },
  methods: {
    ...mapActions(MasterDataStore, ["getTimespans"]),
    ...mapActions(TransactionStore, ["getTransactions"]),
    ...mapActions(AccountStore, ["getAccounts"]),
    searchTransactions() {
      this.fillTransactions();
    },
    accountChanged() {
      this.fillTransactions();
    },
    dateFilterChanged() {
      const tsInfos = this.timespans.filter((item) => {
        return item.id === this.dateFilter;
      });
      if (tsInfos.length > 0) {
        this.dateFilterTo = undefined;
        const tsInfo = tsInfos[0];
        switch (tsInfo.fromRuleNo) {
        case 1: // months back
          const noMonth = parseInt(tsInfo.fromRuleAttribute);
          this.dateFilterFrom = DateTime.now().minus({months: noMonth}).toISO();
          break;
        case 2: // this year
          const currentYear = DateTime.now().year;
          this.dateFilterFrom = DateTime.fromObject(
              {year: currentYear, month: 1, day: 1}).toISO();
          break;
        case 3: // last year
          const lastYear = DateTime.now().minus({years: 1}).year;
          this.dateFilterFrom = DateTime.fromObject({year: lastYear, month: 1, day: 1}).toISO();
          this.dateFilterTo = DateTime.fromObject({
            year: lastYear, month: 12, day: 31, hour: 23, minute: 59,
            second: 59
          }).toISO();
          break;
        case 4: // given year
          const year = parseInt(tsInfo.fromRuleAttribute);
          this.dateFilterFrom = DateTime.fromObject({year: year, month: 1, day: 1}).toISO();
          this.dateFilterTo = DateTime.fromObject({
            year: year, month: 12, day: 31, hour: 23, minute: 59,
            second: 59
          }).toISO();
          break;
        default:
          this.dateFilterFrom = undefined;
        }
      } else {
        this.dateFilterFrom = undefined;
        this.dateFilterTo = undefined;
      }
      this.fillTransactions();
    },
    async fillTransactions() {
      this.error = "";
      this.loading = true;
      try {
        this._updateAccountsWhereIn();
        const promises = [];
        promises.push(this.getAccounts());
        promises.push(this.getTimespans());
        promises.push(this.getTransactions({
          maxItems: this.maxTransactions + 10, searchTerm: this.searchTerm,
          accountsWhereIn: this.accountsWhereIn, dateFilterFrom: this.dateFilterFrom,
          dateFilterTo: this.dateFilterTo,
        }));
        const results = await Promise.all(promises);
        this.loading = false;
        let mustAuthenticate = false;
        let not_ok = false;
        results.forEach((result) => {
          switch(result) {
            case 401:
            case 404:
              mustAuthenticate = true;
              break;
            case 200:
              break;
            default:
              not_ok = true;
          }
        });
        if (mustAuthenticate || not_ok) {
          router.replace("/login");
          return;
        }
        this._fillAccountList();
        this._fillTimespanList();
      } catch (ex) {
        this.error = ex.message;
        this.loading = false;
      }
    },
    _fillTimespanList() {
      this.timespanList = this.timespans.map((tsInfo) => {
        if (this.dateFilter === undefined) {
          this.dateFilter = tsInfo.id;
        }
        return { id: tsInfo.id, name: tsInfo.name };
      });
    },
    _fillAccountList() {
      const accountGroups = [
        {id: "g1", name: "Alle"},
        {id: "g2", name: "Martinas Konten"},
        {id: "g3", name: "Antons Konten"},
        {id: "g4", name: "Sparkonten"},
        {id: "g5", name: "Geschlossene Konten"},
      ]
      this.accountList = accountGroups.concat(this.accounts.filter((account) => {
        return account.closedAt === null;
      }));
      this.accountsWhereIn = [];
    },
    _updateAccountsWhereIn: function () {
      const filter = this.accountFilter;
      if (!isNaN(filter)) {
        const accountId = parseInt(filter);
        if (accountId) {
          this.accountsWhereIn = [accountId];
        } else {
          this.accountsWhereIn = [];
        }
      }
    },
  },
  mounted() {
    this.error = null;
    this.loading = false;
    this.searchTerm = '';
    this.accountList = [];
    this.accountFilter = 'g1';
    this.accountsWhereIn = [];
    this.dateFilterFrom = undefined;
    this.dateFilterTo = undefined;
    this.fillTransactions();
  },
};
</script>

<style scoped>
.td-text {
  display: flex;
  flex-direction: column;
}
.item--is-category {
  font-size: 0.8em;
  overflow-x: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.item--is-notes {
  font-size: 0.8em;
  overflow-x: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
