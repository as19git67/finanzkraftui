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
      selectAllOrNoting: this.selectAllOrNoting,
      isMultiSelectMode: this.isMultiSelectMode,
      selectionListShown: this.selectionListShown,
      accountName: this.accountName,
      accountBalance: this.accountBalance,
      accountBalanceDateStr: this.accountBalanceDateStr,
      currencyStr: this.currencyStr,
      timespanList: this.timespanList,
      dateFilter: this.dateFilter,
      transactionsByDate: this.transactionsByDate,
      accountTypeIsCash: this.accountTypeIsCash,
      searchTermInput: '',
      transactionsCount: this.transactionsCount,
      amountSumStr: this.amountSumStr,
      isFiltered: this.isFiltered,
      transactionsSelected: this.transactionsSelected,
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
      'searchTerm',
      'selectedTransactions',
    ]),
    ...mapState(AccountStore, ['accounts']),
    ...mapState(MasterDataStore, ['timespans']),
    isSelectionIndeterminate() {
      return this.transactionsSelected.length > 0 &&
        this.transactionsSelected.length < this.transactions.length;
    },
  },
  watch: {
    'transactionsSelected.length': function (val, oldVal) {
      this.selectAllOrNoting = this.transactionsSelected.length === this.transactions.length;
      if (this.transactionsSelected.length === 0) {
        this.selectionListShown = false;
      }
    },
    selectionListShown: function (val, oldVal) {
      // can't implement show here, because show needs the event
      if (!val && this.multiSelectPopover?.value) {
        this.multiSelectPopover.value.hide();
      }
    }
  },
  methods: {
    ...mapActions(MasterDataStore, ['getTimespans', 'getCurrencies', 'getCurrencyDetails', 'getTags', 'getTagById']),
    ...mapActions(TransactionStore, ['getTransactions', 'setLastScrollTop', 'clearTransactions', 'setSearchTerm', 'setSelectedTransactions']),
    ...mapActions(AccountStore, ['getAccounts', 'getAccountById']),
    ...mapActions(UserStore, ['setNotAuthenticated']),
    navigateToAddTransaction() {
      router.push({name: 'AddTransaction', params: {accountId: this.idAccount}});
    },
    navigateBack() {
      router.back();
    },
    onSelectAllOrNotingChanged(event) {
      if (this.selectAllOrNoting) {
        this.selectAll();
      } else {
        this.clearSelection();
      }
    },
    toggleSelectionList(event) {
      this.selectionListShown = !this.selectionListShown;
      const popover = this.multiSelectPopover.value;
      if (this.selectionListShown) {
        popover.show(event);
      }
    },
    toggleMultiSelectMode(event) {
      this.isMultiSelectMode = !this.isMultiSelectMode;
    },
    selectAll() {
      this.transactionsSelected = [];
      this.transactions.forEach((item) => {
        item.selected = true;
        this.transactionsSelected.push(item);
      });
      this.setSelectedTransactions(this.transactionsSelected);
      this.updateTransactionCount();
      this.calculateIsFiltered();
      this.calculateSumAmountOfFiltered();
    },
    clearSelection() {
      this.transactionsSelected = [];
      this.transactions.forEach((item) => {
        item.selected = false;
      });
      this.setSelectedTransactions(this.transactionsSelected);
      this.updateTransactionCount();
      this.calculateIsFiltered();
    },
    batchSetCategory() {
      router.push({name: 'BatchSetCategory'});
    },
    batchSetTags() {
      router.push({name: 'BatchSetTags'});
    },
    removeItemFromSelectionList(item) {
      item.selected = false;
      this.updateTransactionSelection(item);
      this.updateTransactionCount();
      this.calculateIsFiltered();
      this.calculateSumAmountOfFiltered();
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
      this.isFiltered = false;
      try {
        this._updateAccountsWhereIn();
        const promises = [];
        promises.push(this.getAccounts(true));
        promises.push(this.getTags());
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
    calculateIsFiltered() {
      // calculate isFiltered: if a search term, date filter or selection of transactions exist, assume the list is filtered
      if (this.searchTerm || this.dateFilterFrom || this.dateFilterTo || this.transactionsSelected.length > 0) {
        this.isFiltered = true;
      } else {
        this.isFiltered = false;
      }
    },
    calculateSumAmountOfFiltered() {
      // calculate sum of filtered or selected (if at least one transaction is selected) transactions
      const s = this.transactions.reduce((sum, item) => {
        if (this.transactionsSelected.length > 0) {
          if (item.selected) {
            return sum + parseFloat(item.t_amount);
          }
          return sum;
        }
        return sum + parseFloat(item.t_amount);
      }, 0);

      // format sum as currency
      this.amountSumStr = new Intl.NumberFormat(DateTimeSettings.defaultLocale, {
        style: 'currency',
        currency: this.currency ? this.currency : 'EUR',
      }).format(s);
    },
    updateTransactionCount() {
      if (this.transactionsSelected.length > 0) {
        this.transactionsCount = this.transactionsSelected.length;
      } else {
        this.transactionsCount = this.transactions.length;
      }
    },
    updateTransactionSelection(item) {
      if (item.selected) {
        this.transactionsSelected.push(item);
      } else {
        const index = this.transactionsSelected.indexOf(item);
        if (index > -1) {
          this.transactionsSelected.splice(index, 1);
        }
      }
      this.setSelectedTransactions(this.transactionsSelected);
    },
    async prepareDataForList() {
      this.transactionsSelected = [];
      const previouslySelected = this.selectedTransactions;
      for (let i = 0; i < this.transactions.length; i++) {
        const t = this.transactions[i];
        if (previouslySelected.find(p => p.t_id === t.t_id)) {
          t.selected = true;
          this.transactionsSelected.push(t);
        }
      }
      this.isMultiSelectMode = this.transactionsSelected.length > 0;
      this.transactionsCount = this.transactions.length;
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
      this.updateTransactionCount();
      this.calculateIsFiltered();
      this.calculateSumAmountOfFiltered();

      this._fillTimespanList();
      this._buildTransactionsPerDate();
    },
    _buildTransactionsPerDate() {
      const transactionsOfDate = {};
      this.transactions.forEach((t) => {
        // concatenate tags
        t.tagsStr = t.tagIds ? t.tagIds.reduce((acc, id) => {
          const tagInfo = this.getTagById(id);
          if (tagInfo) {
            if (acc.length > 0) {
              acc += ', ';
            }
            acc += '#' + tagInfo.tag;
          }
          return acc;
        }, '') : undefined;

        t.tags = t.tagIds ? t.tagIds.map((id) => {
          const tagInfo = this.getTagById(id);
          if (tagInfo) {
            return tagInfo.tag;
          }
          return '?';
        }) : [];

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

      this.updateTransactionSelection(item);
      this.updateTransactionCount();
      this.calculateIsFiltered();
      this.calculateSumAmountOfFiltered();
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
    this.multiSelectPopover = useTemplateRef('multiSelectPopover');
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
      const list = document.querySelector('.table-scroll');
      list.scrollTop = this.lastScrollTop;
    }
  },
  created() {
    this.transactionsSelected = [];
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
    this.selectAllOrNoting = false;
    this.isMultiSelectMode = false;
    this.selectionListShown = false;
    this.transactionsCount = 0;
    this.amountSumStr = '';
    this.isFiltered = false;
  },
};

</script>
<template>
  <div class="page page--is-transactions-list-view">
    <div class="page--header">
      <div class="page--title title__with-buttons">
        <Button v-if="searchTermInput" @click="navigateBack" icon="pi pi-angle-left"></Button>
        <Button v-else label="Zurück" @click="navigateBack" size="large"></Button>
        <span v-if="loading">Buchungen laden...</span>
        <span v-if="!loading" class="element--is-grow element--is-centered">{{ accountName }}</span>
        <div class="element-as-columns" v-if="isFiltered">
          <span class="element--is-grow">&sum;: {{ amountSumStr }}</span>
          <span class="element--is-grow is-de-emphasized">{{ transactionsCount }} Buchungen</span>
        </div>
        <div class="element-as-columns" v-else>
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
        <Button :disabled="transactionsSelected.length === 0" @click="toggleSelectionList" :icon="selectionListShown ? 'pi pi-list-check' : 'pi pi-list'" :severity="selectionListShown ? 'info' : null" aria-label="Ausgewählte einblenden"/>
        <Button @click="toggleMultiSelectMode" :icon="isMultiSelectMode ? 'pi pi-pen-to-square' : 'pi pi-check-square'" :severity="isMultiSelectMode ? 'info' : null"/>
        <Popover ref="multiSelectPopover" class="multi-select-popover">
          <div class="multi-select-popover__wrapper">
            <div class="multi-select-popover__header">
              Ausgewählte Buchungen:
            </div>
            <div class="multi-select-popover__content">
              <div class="multi-select-popover__content__item" v-for="(item, index) in transactionsSelected" :key="item.t_id" :id="'transaction-' + item.t_id">
                <div class="multi-select-popover__content__item__main">
                  <div>{{item.payeeShortened}}</div>
                  <div>{{item.textShortened}}</div>
                </div>
                <div class="multi-select-popover__content__item__suffix">
                  <Button icon="pi pi-times-circle" variant="text" size="small" aria-label="Selection aufheben" @click="removeItemFromSelectionList(item)"/>
                </div>
              </div>
            </div>
          </div>
        </Popover>
      </div>
      <div v-if="isMultiSelectMode" class="page--title title__with-buttons">
        <div class="title--action-buttons">
          <Checkbox v-model="selectAllOrNoting"
                    @change="onSelectAllOrNotingChanged($event)" size="small" :indeterminate="isSelectionIndeterminate" binary/>
          <span>{{transactionsSelected.length}} ausgewählt</span>
        </div>
        <div class="title--action-buttons">
          <Button severity="secondary" icon="pi pi-folder" aria-label="Kategorie setzen" @click="batchSetCategory"
                  :disabled="transactionsSelected.length === 0"/>
          <Button severity="secondary" icon="pi pi-tag" aria-label="Tag setzen" @click="batchSetTags"
                  :disabled="transactionsSelected.length === 0"/>
        </div>
      </div>
    </div>
    <div class="page--content table-scroll" @scroll="tableScroll">
      <div class="page--content--row">
        <div class="data--list data--list--grouped" v-if="transactionsByDate.length">
          <div class="data--list__group" v-for="(trOfDate, index) in transactionsByDate" :key="trOfDate">
            <div class="data--list__date-header data--list__date-header--sticky">{{ trOfDate.valueDateStr }}</div>
            <div v-if="isMultiSelectMode" class="data--list__item"
                 v-for="(item, index) in trOfDate.transactions" :key="item.t_id"
                 :id="'transaction-' + item.t_id" :class="{'alternate-row-background': index % 2 }">
              <div class="data--list__prefix">
                <Checkbox v-if="isMultiSelectMode" v-model="item.selected" @click="onSelectionClicked"
                          @change="onSelectionChange($event, item)" size="small" binary/>
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
                <div class="data--list__line" v-if="item.tagsStr">
                  <span v-for="(tag, index) of item.tags" :key="tag" >
                    <Chip class="element--is-chip" :label="tag" :title="tag"/>
                  </span>
                </div>
                <div class="data--list__line" v-if="item.t_notes">{{ item.t_notes }}</div>
              </div>
              <div class="data--list__right">
                <span :class="{'data--list__line--bold': item.unseen }">{{ item.amountStr }}</span>
              </div>
            </div>
            <router-link  v-else class="data--list__item" append
                         :to="{ path:'/transaction/:transactionId', name: 'TransactionDetail',  params: { transactionId: item.t_id }}"
                         v-for="(item, index) in trOfDate.transactions" :key="item.t_id"
                         :id="'transaction-' + item.t_id" :class="{'alternate-row-background': index % 2 }">
              <div class="data--list__prefix">
                <span v-if="item.unseen" class="data--list__prefix-icon pi pi-circle-fill"></span>
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
                <div class="data--list__line" v-if="item.tagsStr">
                  <span v-for="(tag, index) of item.tags" :key="tag" >
                    <Chip class="element--is-chip" :label="tag" :title="tag"/>
                  </span>
                </div>
                <div class="data--list__line" v-if="item.t_notes">{{ item.t_notes }}</div>
              </div>
              <div class="data--list__right">
                <span :class="{'data--list__line--bold': item.unseen }">{{ item.amountStr }}</span>
              </div>
            </router-link>
          </div>
        </div>
        <div v-else class="row--item.row--item--is-grow row--item--is-centered">
          <div v-if="loading" class="row--item--is-centered progress">
            <progress-spinner strokeWidth="4" fill="transparent" animationDuration="1s"></progress-spinner></div>
          <div v-else class="row--item--is-centered row--item--is-emphasized empty-message">Keine Ergebnisse</div>
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
.multi-select-popover__wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  align-items: center;
  width: 250px;
}
.multi-select-popover__header {
  display: flex;
  flex-direction: row;
  gap: 1em;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
.multi-select-popover__header > div {
  display: flex;
  flex-direction: row;
  gap: 0.5em;
}
.multi-select-popover__content {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background-color: var(--data-list-border-color);
  max-width: 250px;
  overflow-y: auto;
  max-height: 70vH;
}
.multi-select-popover__content__item {
  display: flex;
  flex-direction: row;
  gap: 0.25em;
  background-color: var(--data-list-header-background-color);
  width: 100%;
}
.multi-select-popover__content__item__main {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  overflow: hidden;
  gap: 0.125em;
}
.multi-select-popover__content__item__main > div {
  font-size: 0.7em;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
.multi-select-popover__content__item__main > div:first-child {
  font-size: 1em;
}
.multi-select-popover__content__item__suffix {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}
.data--list__prefix-icon {
  font-size: 0.5em;
  color: var(--p-primary-color);
}
.progress {
  --p-progressspinner-color-one: var(--sgbus-green);
  --p-progressspinner-color-two: var(--sgbus-green);
  --p-progressspinner-color-three: var(--sgbus-green);
  --p-progressspinner-color-four: var(--sgbus-green);
}

.progress,
.empty-message {
  display: flex;
  height: 50vh;
  min-height: 10em;
  align-content: center;
}
</style>