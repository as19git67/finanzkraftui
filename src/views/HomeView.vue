<template>
  <div class="page page--has-no-overflow">
    <div class="section">
      <h1 class="title"><span v-if="!loading">{{ transactions.length }}</span> Buchungen
        <span v-if="loading">laden...</span>
      </h1>

      <form class="label-value-group in-row transaction-filter" v-on:submit.prevent
            v-on:keyup.enter="searchTransactions">
        <div class="label-value in-row">
          <label class="label" for="accountFilter">Bankkonten:</label>
          <select class="value" name="accountFilter" id="accountFilter" v-model="accountFilter"
                  @change="accountChanged">
            <option v-for="item of accountList" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
        </div>
        <div class="label-value in-row">
          <label class="label" for="dateFilter">Zeitspanne:</label>
          <select class="value" name="dateFilter" id="dateFilter" v-model="dateFilter"
                  @change="dateFilterChanged">
            <option v-for="item of timespanList" :key="item.id" :value="item.id">{{
                item.name
              }}
            </option>
          </select>
        </div>
        <div class="label-value in-row">
          <input class="value" type="search" autofocus v-model="searchTerm" placeholder="Suchbegriff">
          <button class="btn btn--is-primary" @click="searchTransactions">Suchen</button>
        </div>
      </form>
    </div>
    <div class="section section--is-scrollable transaction-list" @scroll="tableScroll">
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
                <tr v-for="(item, index) in trOfDate.transactions" :key="item.t_id" :id="'transaction-' + item.t_id"
                    class="transaction-details" :class="{'alternate-row-background': index % 2 }">
                  <td class="transaction-text">
                    <router-link class="transaction-data action"
                                 :to="{ path:'/transaction/:transactionId', name: 'TransactionDetail', params: { transactionId: item.t_id }}">
                      <div class="td-text-item" :class="{'tr-not-confirmed': !item.confirmed }">
                        {{
                          item.t_payee ? item.t_payee : item.textShortened ? item.textShortened : item.t_entry_text
                        }}
                      </div>
                      <div class="td-text-item item--is-category">{{ item.category_name }}</div>
                      <div class="td-text-item item--is-text">{{ item.t_payee ? item.textShortened : '' }}</div>
                      <div class="td-text-item item--is-notes">{{ item.t_notes }}</div>
                    </router-link>
                  </td>
                  <td class="transaction-amount">
                    <router-link class="action"
                                 :to="{ path:'/transaction/:transactionId', name: 'TransactionDetail', params: { transactionId: item.t_id }}">
                      {{
                        `${new Intl.NumberFormat(undefined, {
                          style: 'currency',
                          currency: item.currency_id
                        }).format(item.t_amount)}`
                      }}
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

    </div>
    <div class="section">
      <div class="footer" v-if="!transactionsByDate.length"><span v-if="!loading">Keine Buchungen vom Server geladen</span></div>
      <div class="footer" v-if="incompleteTransactionList">Hinweis: es gibt mehr Ergebnisse als dargestellt</div>
    </div>
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
    ...mapState(TransactionStore, ["transactions", "incompleteTransactionList", "maxTransactions", "lastScrollTop"]),
    ...mapState(AccountStore, ["accounts"]),
    ...mapState(MasterDataStore, ["timespans"]),
  },
  created() {
    this.transactionsByDate = [];
    this.error = null;
    this.loading = false;
    this.searchTerm = '';
    this.accountList = [];
    this.accountFilter = 'g1';
    this.accountsWhereIn = [];
    this.dateFilterFrom = undefined;
    this.dateFilterTo = undefined;
  },
  async mounted() {
    if (this.transactions.length) {
      await this.prepareDataForList();
    } else {
      await this.loadDataFromServer();
    }
    if (this.lastScrollTop) {
      const list = document.querySelector('.transaction-list');
      list.scrollTop = this.lastScrollTop;
    }
  },
  methods: {
    ...mapActions(MasterDataStore, ["getTimespans"]),
    ...mapActions(TransactionStore, ["getTransactions", "setLastScrollTop"]),
    ...mapActions(AccountStore, ["getAccounts"]),
    tableScroll(ev) {
      this.setLastScrollTop(ev.srcElement.scrollTop);
    },
    searchTransactions() {
      this.loadDataFromServer();
    },
    accountChanged() {
      this.loadDataFromServer();
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
      this.loadDataFromServer();
    },
    async loadDataFromServer() {
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
          switch (result) {
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
        await this.prepareDataForList();
      } catch (ex) {
        this.error = ex.message;
        this.loading = false;
      }
    },
    async prepareDataForList() {
      this._fillAccountList();
      this._fillTimespanList();
      this._buildTransactionsPerDate();
    },
    _buildTransactionsPerDate() {
      const transactionsOfDate = {};
      this.transactions.forEach((t) => {
        const tDate = t.t_value_date;
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
            return b.t_id - a.t_id;
          }),
        }
      });
      //console.log(JSON.toString(this.transactionsByDate));
    },
    _fillTimespanList() {
      this.timespanList = this.timespans.map((tsInfo) => {
        if (this.dateFilter === undefined) {
          this.dateFilter = tsInfo.id;
        }
        return {id: tsInfo.id, name: tsInfo.name};
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
};
</script>

<style scoped>
.section.transaction-list {
  margin-top: 0.5em;
}
</style>
