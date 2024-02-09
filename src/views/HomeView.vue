<template>
  <h1><span v-if="!loading">{{transactions.length}}</span> Buchungen
    <span v-if="loading">laden...</span>
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

  <table class="all-transactions-table" v-if="transactionsByDate.length">
    <tbody>
    <template v-for="(trOfDate, index) in transactionsByDate" :key="trOfDate">
      <tr class="transaction-date">
        <td>{{ DateTime.fromISO(trOfDate.valueDate).toLocaleString() }}</td>
      </tr>
      <tr>
        <td>
          <table class="transaction-details-table">
            <tbody>
              <tr v-for="(item, index) in trOfDate.transactions" :key="item" class="transaction-details" :class="{'alternate-row-background': index % 2 }">
                  <td class="transaction-text">
                    <router-link class="action" :to="{ path:'/transaction/:transactionId', name: 'TransactionDetail', params: { transactionId: item.id }}">
                      <div>
                        <div class="td-text-item" :class="{'tr-not-processed': !item.processed }">{{ item.payee ? item.payee : item.textShortened ? item.textShortened : item.entryText }}</div>
                        <div class="td-text-item item--is-category">{{ item.categoryName }}</div>
                        <div class="td-text-item item--is-text">{{ item.payee ? item.textShortened : '' }}</div>
                        <div class="td-text-item item--is-notes">{{ item.notes }}</div>
                      </div>
                    </router-link>
                  </td>
                  <td class="transaction-amount">
                    <router-link class="action" :to="{ path:'/transaction/:transactionId', name: 'TransactionDetail', params: { transactionId: item.id }}">
                      {{ `${new Intl.NumberFormat(undefined, {style: 'currency', currency: item.currencyId}).format(item.amount)}` }}
                    </router-link>
                  </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </template>
    </tbody>
  </table>
  <p v-else>Keine Buchungen vom Server geladen</p>
  <div v-if="incompleteTransactionList">
    <hr>
    <h4>Hinweis: es gibt mehr Ergebnisse als dargestellt</h4>
  </div>
</template>

<script>
import {DateTime} from "luxon";
import {mapActions, mapState, mapStores} from "pinia";
import {UserStore} from "@/stores/user";
import {MasterDataStore} from "@/stores/masterdata";
import {TransactionStore} from "@/stores/transactions";
import router from "@/router";
import {AccountStore} from "@/stores/accounts";
import IconEdit from "@/components/icons/IconEdit.vue";

export default {
  name: "Home",
  components: {IconEdit},
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
      transactionsByDate: this.transactionsByDate,
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
  created() {
    this.transactionsByDate = [];
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
        this._buildTransactionsPerDate();
      } catch (ex) {
        this.error = ex.message;
        this.loading = false;
      }
    },
    _buildTransactionsPerDate() {
      const transactionsOfDate = {};
      this.transactions.forEach((t) => {
        const tDate = t.valueDate;
        if (transactionsOfDate[tDate] === undefined) {
          transactionsOfDate[tDate] = [];
        }
        transactionsOfDate[tDate].push(t);
      });
      const transactionDatesSorted = Object.keys(transactionsOfDate).toSorted((a, b) => {
        const aDate = DateTime.fromISO(a);
        const bDate = DateTime.fromISO(b);
        if (aDate > bDate) return -1;
        if (bDate < aDate) return 1;
        return 0;
      });
      this.transactionsByDate = transactionDatesSorted.map((tDate) => {
        return {
          valueDate: tDate,
          transactions: transactionsOfDate[tDate].toSorted((a, b) => {
            return b.id - a.id;
          }),
        }
      });
      console.log(JSON.toString(this.transactionsByDate));
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
table {
  table-layout: fixed;
}

.transaction-date {
  background-color: #1f91a1;
  color: white;
}
.transaction-date td {
  font-weight: bold;
}
.transaction-details-table {
  width: 100%;
}
.tr-not-processed {
  font-weight: bold;
}
.transaction-text > div {
  display: flex;
  flex-direction: column;
  flex: 1 1 100%;
}
.transaction-text > .action {
  display: block;
}
.transaction-text .td-text-item {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow-x: hidden;
}
.transaction-amount {
  white-space: nowrap;
  text-align: end;
  width: 8em;
  overflow-x: hidden;
  text-overflow: ellipsis;
}
.item--is-category {
  font-size: 0.8em;
  overflow-x: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.item--is-text {
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
