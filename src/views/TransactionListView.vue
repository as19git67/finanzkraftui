<script setup>
defineProps({
  accountId: {type: Array},
  givenSearchTerm: {type: String},
});
</script>

<script>
import {DateTime, Settings as DateTimeSettings} from 'luxon';
import router from '@/router';
import _ from 'lodash';
import {useTemplateRef} from 'vue';
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
      multiSelect: this.multiSelect,
      accountName: this.accountName,
      accountBalance: this.accountBalance,
      accountBalanceDateStr: this.accountBalanceDateStr,
      currencyStr: this.currencyStr,
      timespanList: this.timespanList,
      dateFilter: this.dateFilter,
      transactionsByDate: this.transactionsByDate,
      accountTypeIsCash: this.accountTypeIsCash,
      searchTermInput: '',
    };
  },
  computed: {
    ...mapStores(UserStore),
    ...mapStores(AccountStore),
    ...mapStores(TransactionStore),
    ...mapStores(MasterDataStore),
    ...mapState(UserStore, ['authenticated']),
    ...mapState(TransactionStore, [
      'transactions',
      'incompleteTransactionList',
      'maxTransactions',
      'lastScrollTop',
      'searchTerm'
    ]),
    ...mapState(AccountStore, ['accounts']),
    ...mapState(MasterDataStore, ['timespans']),
  },
  methods: {
    ...mapActions(MasterDataStore, ['getTimespans', 'getCurrencies', 'getCurrencyDetails']),
    ...mapActions(TransactionStore, ['getTransactions', 'setLastScrollTop', 'clearTransactions', 'setSearchTerm']),
    ...mapActions(AccountStore, ['getAccounts', 'getAccountById']),
    ...mapActions(UserStore, ['setNotAuthenticated']),
    navigateToAddTransaction() {
      router.push({name: 'AddTransaction', params: {accountId: this.idAccount}});
    },
    navigateBack() {
      router.back();
    },
    toggleMultiSelect() {
      this.multiSelect = !this.multiSelect;
    },
    toggleSearch(event) {
      this.searchPopover.value.show(event);
    },
    clearSearch() {
      this.searchTermInput = '';
      this.searchTransactions();
    },
    async popoverKeyDown(event) {
      if (event.key === 'Enter') {
        await this.searchTransactions();
      }
    },
    closeSearch() {
      this.searchPopover.value.hide();
    },
    tableScroll(ev) {
      this.setLastScrollTop(ev.srcElement.scrollTop);
    },
    async searchTransactions() {
      this.setSearchTerm(this.searchTermInput);
      await this.loadDataFromServer();
      // if (this.transactions.length > 0) {
      //   this.searchPopover.value.hide();
      // }
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
      if (this.accountsWhereIn.length === 0) {
        this.accountName = 'Alle Transaktionen';
      } else if (this.accountsWhereIn.length === 1) {
        const account = this.getAccountById(this.accountsWhereIn[0]);
        const currencyDetails = this.getCurrencyDetails(account.currency);
        this.idAccount = account.id;
        this.accountName = account.name;
        this.accountBalance = account.balance;
        this.accountBalanceDateStr = account.balanceDate ? DateTime.fromISO(account.balanceDate).toLocaleString() : '';
        this.currency = currencyDetails ? currencyDetails.id : 'EUR';
        this.currencyStr = currencyDetails ? currencyDetails.short : '';
        this.accountTypeIsCash = account.type === 'cash';
      } else {
        this.accountName = 'Alle Buchungen';
      }
      this._fillTimespanList();
      this._buildTransactionsPerDate();
    },
    _buildTransactionsPerDate() {
      const transactionsOfDate = {};
      this.transactions.forEach((t) => {
        t.selected = false;
        const tDateShortStr = DateTime.fromISO(t.t_value_date).toISODate();
        if (transactionsOfDate[tDateShortStr] === undefined) {
          transactionsOfDate[tDateShortStr] = [];
        }
        if (this.accountsWhereIn.length > 1) {
          const account = this.getAccountById(t.account_id);
          t.accountName = account.name;
          const currencyDetails = this.getCurrencyDetails(t.account_id);
          const currency = currencyDetails ? currencyDetails.id : 'EUR';
          t.amountStr = new Intl.NumberFormat(DateTimeSettings.defaultLocale, {
            style: 'currency',
            currency: currency,
          }).format(t.t_amount);
        } else {
          t.amountStr = new Intl.NumberFormat(DateTimeSettings.defaultLocale, {
            style: 'currency',
            currency: this.currency,
          }).format(t.t_amount);
        }
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
    onSelectionClicked(event) {
      event.stopPropagation();
    },
    onSelectionChange(event, item) {
      event.stopPropagation();
      item.selected = event.target.checked;
    },
    _updateAccountsWhereIn: function() {
      if (_.isArray(this.accountId)) {
        this.accountsWhereIn = this.accountId;
      } else {
        const parts = this.accountId.split(',');
        this.accountsWhereIn = [];
        parts.forEach((part) => {
          const accountId = parseInt(part);
          if (isNaN(accountId)) {
            return;
          }
          this.accountsWhereIn.push(accountId);
        });
      }
    },
  },
  async mounted() {
    this.searchPopover = useTemplateRef('searchPopover');
    if (this.accountId !== undefined) {
      this.clearTransactions(); // always load the transactions
    }
    if (this.transactions.length) {
      await this.prepareDataForList();
    } else {
      await this.loadDataFromServer();
    }
    this.searchTermInput = this.searchTerm;
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
    this.accountTypeIsCash = false;
    this.accountBalanceDateStr = '';
    this.currencyStr = '';
    this.accountsWhereIn = [];
    this.dateFilterFrom = undefined;
    this.dateFilterTo = undefined;
    this.multiSelect = false;
  },
};

</script>
<template>
  <div class="page page--is-transactions-list-view">
    <div class="page--header">
      <div class="page--title title__with-buttons">
        <Button label="Zurück" @click="navigateBack" size="large">
        </Button>
        <span v-if="loading">Buchungen laden...</span>
        <span v-if="!loading" class="element--is-grow element--is-centered">{{ accountName }}</span>
        <div class="element-as-columns">
          <span v-if="!loading && accountBalance" class="element--is-grow">{{ accountBalance }}{{ currencyStr }}</span>
          <span v-if="!loading && accountBalanceDateStr"
                class="element--is-grow is-de-emphasized">{{ accountBalanceDateStr }}</span>
        </div>
        <Button v-if="accountTypeIsCash" @click="navigateToAddTransaction()" @keydown.enter="navigateToAddTransaction()"
                icon="pi pi-plus" variant="text" aria-label="Buchung hinzufügen" />
        <Button icon="pi pi-search" aria-label="Suche einblenden" @click="toggleSearch" :severity="searchTermInput ? 'warn' : null"/>
        <Popover ref="searchPopover" class="search-popover">
          <InputGroup>
            <InputText placeholder="Suchen" inputmode="search" enterKeyHint="search"
                       v-model="searchTermInput"
                       @keydown="popoverKeyDown"
                       autofocus
            ></InputText>
            <InputGroupAddon>
              <Button v-if="searchTermInput" icon="pi pi-times" severity="secondary" variant="text" @click="clearSearch"/>
              <Button icon="pi pi-search" severity="secondary" variant="text" @click="searchTransactions"/>
            </InputGroupAddon>
          </InputGroup>
          <Button icon="pi pi-times" aria-label="Schließen" @click="closeSearch"/>
        </Popover>
        <Button  @click="toggleMultiSelect" :icon="multiSelect ? 'pi pi-pen-to-square' : 'pi pi-check-square'" :severity="multiSelect ? 'info' : null"/>
      </div>
    </div>
    <div class="page--content">
      <div class="page--content--row">
        <div class="data--list data--list--grouped" @scroll="tableScroll" v-if="transactionsByDate.length">
          <div class="data--list__group" v-for="(trOfDate, index) in transactionsByDate" :key="trOfDate">
            <div class="data--list__date-header data--list__date-header--sticky">{{ trOfDate.valueDateStr }}</div>
            <div v-if="multiSelect">
              <div class="data--list__item"
                   v-for="(item, index) in trOfDate.transactions" :key="item.t_id"
                   :id="'transaction-' + item.t_id" :class="{'alternate-row-background': index % 2 }">
                <div class="data--list__prefix">
                  <Checkbox v-if="multiSelect" v-model="item.selected" @click="onSelectionClicked" @change="onSelectionChange($event, item)" size="small" binary/>
                </div>
                <div class="data--list__left">
                  <div class="data--list__line data--list__line--bold" v-if="item.payeeShortened">{{
                      item.payeeShortened
                    }}
                  </div>
                  <div class="data--list__line" v-if="item.textShortened">{{ item.textShortened }}</div>
                  <div class="data--list__line" v-if="item.t_entry_text">{{ item.t_entry_text }}</div>
                  <div class="data--list__line" v-if="item.accountName">{{ item.accountName }}</div>
                  <div class="data--list__line" v-if="item.category_name">{{ item.category_name }}</div>
                  <div class="data--list__line" v-if="item.t_notes">{{ item.t_notes }}</div>
                </div>
                <div class="data--list__right">
                  <span :class="{'data--list__line--bold': !item.confirmed }">{{ item.amountStr }}</span>
                </div>
              </div>
            </div>
            <router-link  v-else class="data--list__item" append
                         :to="{ path:'/transaction/:transactionId', name: 'TransactionDetail',  params: { transactionId: item.t_id }}"
                         v-for="(item, index) in trOfDate.transactions" :key="item.t_id"
                         :id="'transaction-' + item.t_id" :class="{'alternate-row-background': index % 2 }">
              <div class="data--list__prefix">
                <span v-if="!item.confirmed " class="data--list__prefix-icon pi pi-circle-fill"></span>
              </div>
              <div class="data--list__left">
                <div class="data--list__line data--list__line--bold" v-if="item.payeeShortened">{{
                    item.payeeShortened
                  }}
                </div>
                <div class="data--list__line" v-if="item.textShortened">{{ item.textShortened }}</div>
                <div class="data--list__line" v-if="item.t_entry_text">{{ item.t_entry_text }}</div>
                <div class="data--list__line" v-if="item.accountName">{{ item.accountName }}</div>
                <div class="data--list__line" v-if="item.category_name">{{ item.category_name }}</div>
                <div class="data--list__line" v-if="item.t_notes">{{ item.t_notes }}</div>
              </div>
              <div class="data--list__right">
                <span :class="{'data--list__line--bold': !item.confirmed }">{{ item.amountStr }}</span>
              </div>
            </router-link>
          </div>
        </div>
        <div v-else class="row--item.row--item--is-grow row--item--is-centered">
          <div class="row--item--is-centered row--item--is-emphasized empty-message">Keine Ergebnisse</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.search-popover .p-popover-content {
  display: flex;
  flex-direction: row;
  gap: 0.5em;
}
</style>

<style scoped>
.data--list__prefix-icon {
  font-size: 0.5em;
  color: var(--p-primary-color);
}

.empty-message {
  height: 50vh;
  min-height: 10em;
  align-content: center;
}
</style>