<script setup>
defineProps({
  accountId: {type: String},
});
</script>

<script>
import {DateTime, Settings as DateTimeSettings} from 'luxon';
import router from '@/router';
import {mapActions, mapState, mapStores} from 'pinia';
import {UserStore} from '@/stores/user';
import {AccountStore} from '@/stores/accounts';
import {TransactionStore} from '@/stores/transactions';
import {MasterDataStore} from '@/stores/masterdata';

export default {
  name: 'TransactionListView',
  data() {
    return {
      error: this.error,
      loading: this.loading,
      accountName: this.accountName,
      accountBalance: this.accountBalance,
      accountBalanceDateStr: this.accountBalanceDateStr,
      currencyStr: this.currencyStr,
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
    ...mapState(UserStore, ['authenticated']),
    ...mapState(TransactionStore, ['transactions', 'incompleteTransactionList', 'maxTransactions', 'lastScrollTop']),
    ...mapState(AccountStore, ['accounts']),
    ...mapState(MasterDataStore, ['timespans']),
  },
  methods: {
    ...mapActions(MasterDataStore, ['getTimespans', 'getCurrencies', 'getCurrencyDetails']),
    ...mapActions(TransactionStore, ['getTransactions', 'setLastScrollTop', 'clearTransactions']),
    ...mapActions(AccountStore, ['getAccounts', 'getAccountById']),
    ...mapActions(UserStore, ['setNotAuthenticated']),
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
              second: 59,
            }).toISO();
            break;
          case 4: // given year
            const year = parseInt(tsInfo.fromRuleAttribute);
            this.dateFilterFrom = DateTime.fromObject({year: year, month: 1, day: 1}).toISO();
            this.dateFilterTo = DateTime.fromObject({
              year: year, month: 12, day: 31, hour: 23, minute: 59,
              second: 59,
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
      this.error = '';
      this.loading = true;
      try {
        this._updateAccountsWhereIn();
        const promises = [];
        promises.push(this.getAccounts(true));
        promises.push(this.getCurrencies(true));
        promises.push(this.getTimespans());
        promises.push(this.getTransactions({
          maxItems: this.maxTransactions + 10, searchTerm: this.searchTerm,
          accountsWhereIn: this.accountsWhereIn, dateFilterFrom: this.dateFilterFrom,
          dateFilterTo: this.dateFilterTo,
        }));
        const results = await Promise.all(promises);
        this.loading = false;
        let mustAuthenticate = false;
        let notAuthorized = false;
        let not_ok = false;
        results.forEach((result) => {
          switch (result) {
            case 403:
              notAuthorized = true;
              break;
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
          this.setNotAuthenticated();
          router.replace({name: 'login'});
          return;
        }
        if (notAuthorized) {
          router.replace({name: 'notAuthorized'});
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
      if (this.accountsWhereIn.length === 0) {
        this.accountName = 'Alle Transaktionen';
      } else if (this.accountsWhereIn.length === 1) {
        const account = await this.getAccountById(this.accountsWhereIn[0]);
        const currencyDetails = this.getCurrencyDetails(account.currency);
        this.accountName = account.name;
        this.accountBalance = account.balance;
        this.accountBalanceDateStr = account.balanceDate ? DateTime.fromISO(account.balanceDate).toLocaleString() : '';
        this.currency = currencyDetails ? currencyDetails.id : 'EUR';
        this.currencyStr = currencyDetails ? currencyDetails.short : '';
      } else {
        this.accountName = 'Transaktionen mehrerer Konten';
      }
      this._fillTimespanList();
      this._buildTransactionsPerDate();
    },
    _buildTransactionsPerDate() {
      const transactionsOfDate = {};
      this.transactions.forEach((t) => {
        const tDateShortStr = DateTime.fromISO(t.t_value_date).toISODate();
        if (transactionsOfDate[tDateShortStr] === undefined) {
          transactionsOfDate[tDateShortStr] = [];
        }
        t.amountStr = new Intl.NumberFormat(DateTimeSettings.defaultLocale, {
          style: 'currency',
          currency: this.currency,
        }).format(t.t_amount);
        transactionsOfDate[tDateShortStr].push(t);
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
          valueDateStr: DateTime.fromISO(tDate).toLocaleString(),
          transactions: transactionsOfDate[tDate].toSorted((a, b) => {
            return b.t_id - a.t_id;
          }),
        };
      });
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
        // {id: "g1", name: "Alle"},
        // {id: "g2", name: "Martinas Konten"},
        // {id: "g3", name: "Antons Konten"},
        // {id: "g4", name: "Sparkonten"},
        // {id: "g5", name: "Geschlossene Konten"},
      ];
      this.accountList = accountGroups.concat(this.accounts.filter((account) => {
        return account.closedAt === null;
      }));
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
  async mounted() {
    if (this.accountId !== undefined) {
      this.accountFilter = this.accountId;
    }
    if (this.accountId !== undefined) {
      this.clearTransactions(); // always load the transactions
    }
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
  created() {
    this.transactionsByDate = [];
    this.error = null;
    this.loading = false;
    this.accountName = '';
    this.accountBalance = 0;
    this.accountBalanceDateStr = '';
    this.currencyStr = '';
    this.searchTerm = '';
    this.accountList = [];
    this.accountFilter = 'g1';
    this.accountsWhereIn = [];
    this.dateFilterFrom = undefined;
    this.dateFilterTo = undefined;
  },
};

</script>
<template>
  <div class="page page--is-transaction-new-view">
    <div class="page--header">
      <span v-if="loading">Buchungen laden...</span>
      <span v-if="!loading" class="element--is-grow">{{ accountName }}: {{ accountBalance }}{{ currencyStr }}</span>
      <span v-if="!loading" class="element--is-right-aligned">{{ accountBalanceDateStr }}</span>
    </div>
    <div class="page--content">
      <div class="page--content--row">
        <div class="data--list data--list--grouped" @scroll="tableScroll">
          <div class="data--list__group" v-for="(trOfDate, index) in transactionsByDate" :key="trOfDate">
            <div class="data--list__date-header data--list__date-header--sticky">{{ trOfDate.valueDateStr }}</div>
            <div class="data--list__item" v-for="(item, index) in trOfDate.transactions" :key="item.t_id"
                 :id="'transaction-' + item.t_id" :class="{'alternate-row-background': index % 2 }">
                <div class="data--list__left">
                  <div class="data--list__line">
                    <span>
                      {{item.t_payee ? item.t_payee : item.textShortened ? item.textShortened : item.t_entry_text }}
                    </span>
                  </div>
                </div>
                <div class="data--list__right">
                  <span>{{ item.amountStr }}</span>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>