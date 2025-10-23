<script setup>
import {DateTime, Settings as DateTimeSettings} from 'luxon';
import _ from 'lodash';
import {computed, onMounted, ref, useTemplateRef, watch} from 'vue';
import {UserStore} from '@/stores/user';
import {AccountStore} from '@/stores/accounts';
import {TransactionStore} from '@/stores/transactions';
import {MasterDataStore} from '@/stores/masterdata';
import {useRouter} from "vue-router";

const props = defineProps({
  accountId: {type: Array},
  givenSearchTerm: {type: String},
});

defineOptions({
  name: 'TransactionListView'
});

const router = useRouter();
const userStore = UserStore();
const accountStore = AccountStore();
const transactionStore = TransactionStore();
const masterDataStore = MasterDataStore();

const multiSelectPopover = useTemplateRef('multiSelectPopover')

const error = ref('');
const loading = ref(false);
const selectAllOrNoting = ref(false);
const isMultiSelectMode = ref(false);
const isSearchMode = ref(false);
const selectionListShown = ref(false);
const accountName = ref('');
const accountBalance = ref(0);
const accountBalanceDateStr = ref('');
const currencyStr = ref('');
const timespanList = ref([]);
const dateFilter = ref(null);
const transactionsByDate = ref([]);
const accountTypeIsCash = ref(false);
const searchTermInput = ref('');
const transactionsSelected = ref([]);
const filterSelectedCategories = ref([]);

let dateFilterFrom;
let dateFilterTo;
let accountsWhereIn = [];
let idAccount;
let currency;

const transactions = computed(() => transactionStore.transactions);
const incompleteTransactionList = computed(() => transactionStore.incompleteTransactionList);
const maxTransactions = computed(() => transactionStore.maxTransactions);
const lastScrollTop = computed(() => transactionStore.lastScrollTop);
const searchTerm = computed(() => transactionStore.searchTerm);
const searchCategories = computed(() => transactionStore.searchCategories);
const searchDateFilter = computed(() => transactionStore.searchDateFilter);
const selectedTransactions = computed(() => transactionStore.selectedTransactions);
const timespans = computed(() => masterDataStore.timespans);
const categories = computed(() => masterDataStore.categories);

const isSelectionIndeterminate = computed(() => {
  return transactionsSelected.value.length > 0 &&
      transactionsSelected.value.length < transactions.value.length;
});

const severityForSearchToggleButton = computed(() => {
    if (isFiltered.value) {
      return 'warn';
    }
    if (isSearchMode.value) {
      return 'info';
    }
    return null;
});

const isFiltered = computed(() => {
  // calculate isFiltered: if a search term, date filter or selection of transactions exist, assume the list is filtered
  return !!(searchTerm.value || dateFilterFrom || dateFilterTo || transactionsSelected.value?.length > 0 || filterSelectedCategories.value?.length > 0);
});

const amountSumStr = computed(() => {
  // calculate sum of filtered or selected (if at least one transaction is selected) transactions
  const s = transactions.value.reduce((sum, item) => {
    if (transactionsSelected.value.length > 0) {
      if (item.selected) {
        return sum + parseFloat(item.t_amount);
      }
      return sum;
    }
    return sum + parseFloat(item.t_amount);
  }, 0);

  // format sum as currency
  return new Intl.NumberFormat(DateTimeSettings.defaultLocale, {
    style: 'currency',
    currency: currency ? currency : 'EUR',
  }).format(s);

});

const transactionsCount = computed(() => {
  if (transactionsSelected.value.length > 0) {
    return transactionsSelected.value.length;
  } else {
    return transactions.value.length;
  }
});

watch(dateFilter, (newVal) => {
  _updateDateFilter();
  searchTransactions();
});

watch(filterSelectedCategories, newVal => {
  searchTransactions();
});

watch(transactionsSelected, (newVal) => {
  selectAllOrNoting.value = transactionsSelected.value.length === transactions.value.length;
  if (transactionsSelected.value.length === 0) {
    selectionListShown.value = false;
  }
});

watch(selectionListShown, (newVal) => {
  // can't implement show here, because show needs the event
  if (!newVal && multiSelectPopover.value) {
    multiSelectPopover.value.hide();
  }
});

function selectAll() {
  transactionsSelected.value = [];
  transactions.value.forEach((item) => {
    item.selected = true;
    transactionsSelected.value.push(item);
  });
  transactionStore.setSelectedTransactions(transactionsSelected.value);
}

function clearSelection() {
  transactionsSelected.value = [];
  transactions.value.forEach((item) => {
    item.selected = false;
  });
  transactionStore.setSelectedTransactions(transactionsSelected.value);
}

async function loadDataFromServer() {
  error.value = '';
  loading.value = true;
  try {
    // _updateDateFilter();
    _updateAccountsWhereIn();
    const promises = [];
    promises.push(accountStore.getAccounts(true));
    promises.push(masterDataStore.getTags());
    promises.push(masterDataStore.getCategories());
    promises.push(masterDataStore.getCurrencies(true));
    promises.push(masterDataStore.getTimespans());
    promises.push(transactionStore.getTransactions({
      maxItems: maxTransactions.value + 10,
      searchTerm: searchTerm.value,
      categoriesWhereIn: searchCategories.value,
      accountsWhereIn: accountsWhereIn,
      dateFilterFrom: dateFilterFrom,
      dateFilterTo: dateFilterTo,
    }));
    const results = await Promise.all(promises);
    loading.value = false;
    let mustAuthenticate = false;
    let notAuthorized = false;
    let not_ok = false;
    let message = '';
    results.forEach((result) => {
      let status = result;
      if (_.isObject(result)) {
        status = result.status;
      }
      switch (status) {
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
          if (!message) {
            message = result.message;
          }
      }
    });
    if (mustAuthenticate) {
      userStore.setNotAuthenticated();
      await router.replace({name: 'login'});
      return;
    }
    if (notAuthorized) {
      await router.replace({name: 'notAuthorized'});
      return;
    }
    if (not_ok) {
      error.value = message;
      return;
    }
    await prepareDataForList();
  } catch (ex) {
    error.value = ex.message;
    loading.value = false;
  }
}

async function searchTransactions() {
  transactionStore.setSearchTerm(searchTermInput.value);
  transactionStore.setSearchCategories(filterSelectedCategories.value);
  transactionStore.setSearchDateFilter(dateFilter.value);
  await loadDataFromServer();
}

function updateTransactionSelection(item) {
  if (item.selected) {
    transactionsSelected.value.push(item);
  } else {
    const index = transactionsSelected.value.indexOf(item);
    if (index > -1) {
      transactionsSelected.value.splice(index, 1);
    }
  }
  transactionStore.setSelectedTransactions(transactionsSelected.value);
}

async function prepareDataForList() {
  transactionsSelected.value = [];
  for (let i = 0; i < transactions.value.length; i++) {
    const t = transactions.value[i];
    if (selectedTransactions.value.find(p => p.t_id === t.t_id)) {
      t.selected = true;
      transactionsSelected.value.push(t);
    }
  }
  isMultiSelectMode.value = transactionsSelected.value.length > 0;
  if (accountsWhereIn.length === 0) {
    accountName.value = 'Alle Transaktionen';
  } else if (accountsWhereIn.length === 1) {
    const account = accountStore.getAccountById(accountsWhereIn[0]);
    const currencyDetails = masterDataStore.getCurrencyDetails(account.currency);
    idAccount = account.id;
    accountName.value = account.name;
    accountBalance.value = account.balance;
    accountBalanceDateStr.value = account.balanceDate ? DateTime.fromISO(account.balanceDate).toLocaleString() : '';
    currency = currencyDetails ? currencyDetails.id : 'EUR';
    currencyStr.value = currencyDetails ? currencyDetails.short : '';
    accountTypeIsCash.value = account.type === 'cash';
  } else {
    accountName.value = 'Alle Buchungen';
  }

  _fillTimespanList();
  _buildTransactionsPerDate();
}

function _buildTransactionsPerDate() {
  const transactionsOfDate = {};
  transactions.value.forEach((t) => {
    // concatenate tags
    t.tagsStr = t.tagIds ? t.tagIds.reduce((acc, id) => {
      const tagInfo = masterDataStore.getTagById(id);
      if (tagInfo) {
        if (acc.length > 0) {
          acc += ', ';
        }
        acc += '#' + tagInfo.tag;
      }
      return acc;
    }, '') : undefined;

    t.tags = t.tagIds ? t.tagIds.map((id) => {
      const tagInfo = masterDataStore.getTagById(id);
      if (tagInfo) {
        return tagInfo.tag;
      }
      return '?';
    }) : [];

    const tDateShortStr = DateTime.fromISO(t.t_value_date).toISODate();
    if (transactionsOfDate[tDateShortStr] === undefined) {
      transactionsOfDate[tDateShortStr] = [];
    }
    if (accountsWhereIn.length > 1) {
      const account = accountStore.getAccountById(t.account_id);
      t.accountName = account.name;
      const currencyDetails = masterDataStore.getCurrencyDetails(t.account_id);
      const accountCurrency = currencyDetails ? currencyDetails.id : 'EUR';
      t.amountStr = new Intl.NumberFormat(DateTimeSettings.defaultLocale, {
        style: 'currency',
        currency: accountCurrency,
      }).format(t.t_amount);
    } else {
      t.amountStr = new Intl.NumberFormat(DateTimeSettings.defaultLocale, {
        style: 'currency',
        currency: currency,
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
  transactionsByDate.value = transactionDatesSorted.map((tDate) => {
    return {
      valueDate: tDate,
      valueDateStr: DateTime.fromISO(tDate).toLocaleString(),
      transactions: transactionsOfDate[tDate].toSorted((a, b) => {
        return b.t_id - a.t_id;
      }),
    };
  });
}

function _fillTimespanList() {
  timespanList.value = timespans.value.map((tsInfo) => {
    if (dateFilter.value === undefined) {
      dateFilter.value = tsInfo.id;
    }
    return {id: tsInfo.id, name: tsInfo.name};
  });
}

function _updateDateFilter() {
  const tsInfos = timespans.value.filter((item) => {
    return item.id === dateFilter.value?.id;
  });
  if (tsInfos.length > 0) {
    dateFilterTo = undefined;
    const tsInfo = tsInfos[0];
    switch (tsInfo.fromRuleNo) {
      case 1: // months back
        const noMonth = parseInt(tsInfo.fromRuleAttribute);
        dateFilterFrom = DateTime.now().minus({months: noMonth}).toISO();
        break;
      case 2: // this year
        const currentYear = DateTime.now().year;
        dateFilterFrom = DateTime.fromObject(
            {year: currentYear, month: 1, day: 1}).toISO();
        break;
      case 3: // last year
        const lastYear = DateTime.now().minus({years: 1}).year;
        dateFilterFrom = DateTime.fromObject({year: lastYear, month: 1, day: 1}).toISO();
        dateFilterTo = DateTime.fromObject({
          year: lastYear, month: 12, day: 31, hour: 23, minute: 59,
          second: 59,
        }).toISO();
        break;
      case 4: // given year
        const year = parseInt(tsInfo.fromRuleAttribute);
        dateFilterFrom = DateTime.fromObject({year: year, month: 1, day: 1}).toISO();
        dateFilterTo = DateTime.fromObject({
          year: year, month: 12, day: 31, hour: 23, minute: 59,
          second: 59,
        }).toISO();
        break;
      case 5: { // Month, starting at first of it + offset
        const monthOffset = parseInt(tsInfo.fromRuleAttribute);
        const targetDate = DateTime.now().plus({months: monthOffset});
        const from = DateTime.fromObject(
            {year: targetDate.year, month: targetDate.month, day: 1});
        dateFilterFrom = from.toISO();
        dateFilterTo = from.plus({months: 1}).minus({days: 1}).endOf('day').toISO();
        break;
      }
      case 6: { // current quarter, starting at first of it
        const quarterOffset = parseInt(tsInfo.fromRuleAttribute);
        const monthOffset = quarterOffset * 3;
        const currentDate = DateTime.now();
        const currentMonth = currentDate.month;
        let quarterStartMonth;

        // Determine the start month of the current quarter
        if (currentMonth <= 3) {
          quarterStartMonth = 1; // Q1: Jan-Mar
        } else if (currentMonth <= 6) {
          quarterStartMonth = 4; // Q2: Apr-Jun
        } else if (currentMonth <= 9) {
          quarterStartMonth = 7; // Q3: Jul-Sep
        } else {
          quarterStartMonth = 10; // Q4: Oct-Dec
        }

        // Set the date range for the quarter
        dateFilterFrom = DateTime.fromObject({
          year: currentDate.year,
          month: quarterStartMonth,
          day: 1
        }).plus({month: monthOffset}).toISO();

        // End of quarter (last day of the 3rd month)
        dateFilterTo = DateTime.fromObject({
          year: currentDate.year,
          month: quarterStartMonth + 2,
          day: 1
        })
            .plus({month: monthOffset})
            .plus({months: 1})
            .minus({days: 1})
            .endOf('day')
            .toISO();
        break;
      }
      case 7: { // Q1, Q2, Q3, Q4 of current year - depending on from
        // fromRuleAttribute should be 0 for Q1, 1 for Q2, 2 for Q3, 3 for Q4
        // negative values are allowed, e.g. -1 for last year's Q4
        const quarterOffset = parseInt(tsInfo.fromRuleAttribute);
        const currentYear = DateTime.now().year;

        // month to add to get to the first month of the quarter
        const monthOffset = (quarterOffset * 3);

        // Set first day of the specified quarter
        dateFilterFrom = DateTime.fromObject({
          year: currentYear,
          month: 1,
          day: 1
        }).plus({ months: monthOffset }).toISO();

        // Set last day of the specified quarter (last day of the 3rd month in the quarter)
        dateFilterTo = DateTime.fromObject({
          year: currentYear,
          month: 3, // Last month in the first quarter
          day: 1
        })
            .plus({ months: monthOffset })
            .plus({ months: 1 }) // Move to first day of next month
            .minus({ days: 1 })  // Go back to last day of the quarter
            .endOf('day')        // End of the day (23:59:59)
            .toISO();
        break;
      }
      default:
        dateFilterFrom = undefined;
    }
  } else {
    dateFilterFrom = undefined;
    dateFilterTo = undefined;
  }
}

function _updateAccountsWhereIn() {
  if (_.isArray(props.accountId)) {
    accountsWhereIn = props.accountId;
  } else {
    const parts = props.accountId.split(',');
    accountsWhereIn = [];
    parts.forEach((part) => {
      const accountId = parseInt(part);
      if (isNaN(accountId)) {
        return;
      }
      accountsWhereIn.push(accountId);
    });
  }
}

function onNavigateToAddTransaction() {
  router.push({name: 'AddTransaction', params: {accountId: idAccount}});
}

function onNavigateBack() {
  router.back();
}

function onSelectAllOrNotingChanged(event) {
  if (selectAllOrNoting.value) {
    selectAll();
  } else {
    clearSelection();
  }
}

function onToggleSelectionList(event) {
  selectionListShown.value = !selectionListShown.value;
  const popover = multiSelectPopover.value;
  if (selectionListShown.value) {
    popover.show(event);
  }
}

function onToggleMultiSelectMode(event) {
  isMultiSelectMode.value = !isMultiSelectMode.value;
}

function onSelectionChange(event, item) {
  event.stopPropagation();
  item.selected = event.target.checked;

  updateTransactionSelection(item);
}

function onSelectionClicked(event) {
  event.stopPropagation();
}

function onClearSearchTerm() {
  searchTermInput.value = '';
  searchTransactions();
}

async function onSearchTermKeyDown(event) {
  if (event.key === 'Enter') {
    await searchTransactions();
  }
}

function onTableScroll(ev) {
  transactionStore.setLastScrollTop(ev.srcElement.scrollTop);
}

function onDateFilterChanged() {
  // _updateDateFilter();
}

function onSearchTransactions() {
  searchTransactions();
}

function onBatchSetCategory() {
  router.push({name: 'BatchSetCategory'});
}

function onBatchSetTags() {
  router.push({name: 'BatchSetTags'});
}

function onRemoveItemFromSelectionList(item) {
  item.selected = false;
  updateTransactionSelection(item);
}

function onToggleSearch(event) {
  isSearchMode.value = !isSearchMode.value;
}

function onClearSearch() {
  searchTermInput.value = '';
  dateFilter.value = undefined;
  clearSelection();
  // _updateDateFilter();
  filterSelectedCategories.value = [];
  isSearchMode.value = false;
  searchTransactions();
}

onMounted(async () => {
  if (props.accountId !== undefined) {
    transactionStore.clearTransactions(); // always load the transactions
  }

  // pre-fill search criteria from store
  searchTermInput.value = searchTerm.value;
  filterSelectedCategories.value = searchCategories.value;
  dateFilter.value = searchDateFilter.value;

  await loadDataFromServer();

  if (lastScrollTop.value) {
    const list = document.querySelector('.table-scroll');
    list.scrollTop = lastScrollTop.value;
  }
});

</script>
<template>
  <div class="page page--is-transactions-list-view">
    <div class="page--header">
      <div class="page--title title__with-buttons">
        <Button @click="onNavigateBack" icon="pi pi-angle-left"></Button>
        <span v-if="loading && !isFiltered" class="element--is-grow element--is-centered">Buchungen laden...</span>
        <span v-if="!loading && !isFiltered" class="element--is-grow element--is-centered">{{ accountName }}</span>
        <div class="element-as-columns element--is-right-aligned" v-if="isFiltered">
          <span class="element--is-grow">&sum;: {{ amountSumStr }}</span>
          <span class="element--is-grow is-de-emphasized">{{ transactionsCount }} Buchungen</span>
        </div>
        <div class="element-as-columns element--is-right-aligned" v-else>
          <span v-if="!loading && accountBalance" class="element--is-grow">{{ accountBalance }}{{ currencyStr }}</span>
          <span v-if="!loading && accountBalanceDateStr"
                class="element--is-grow is-de-emphasized">{{ accountBalanceDateStr }}</span>
        </div>
        <Button v-if="accountTypeIsCash" @click="onNavigateToAddTransaction()" @keydown.enter="onNavigateToAddTransaction()"
                icon="pi pi-plus" variant="text" aria-label="Buchung hinzufügen"/>
        <Button @click="onToggleSearch" :icon="isSearchMode ? 'pi pi-filter-fill' : 'pi pi-filter'"
                :severity="severityForSearchToggleButton" aria-label="Suche einblenden"/>
        <Button :disabled="transactionsSelected.length === 0" @click="onToggleSelectionList"
                :icon="selectionListShown ? 'pi pi-list-check' : 'pi pi-list'"
                :severity="selectionListShown ? 'info' : null" aria-label="Ausgewählte einblenden"/>
        <Button @click="onToggleMultiSelectMode" :icon="isMultiSelectMode ? 'pi pi-pen-to-square' : 'pi pi-check-square'"
                :severity="isMultiSelectMode ? 'info' : null"/>
        <Popover ref="multiSelectPopover" class="multi-select-popover">
          <div class="multi-select-popover__wrapper">
            <div class="multi-select-popover__header">
              Ausgewählte Buchungen:
            </div>
            <div class="multi-select-popover__content">
              <div class="multi-select-popover__content__item" v-for="(item, index) in transactionsSelected"
                   :key="item.t_id" :id="'transaction-' + item.t_id">
                <div class="multi-select-popover__content__item__main">
                  <div v-if="item.payeeShortened">{{ item.payeeShortened }}</div>
                  <div v-if="item.textShortened">{{ item.textShortened }}</div>
                  <div v-if="item.t_notes">{{ item.t_notes }}</div>
                  <div v-if="item.t_entry_text && !item.t_notes && !item.textShortened && !item.payeeShortened">
                    {{ item.t_entry_text }}
                  </div>
                  <div v-if="item.category_name">{{ item.category_name }}</div>
                </div>
                <div class="multi-select-popover__content__item__suffix">
                  <Button icon="pi pi-times-circle" variant="text" size="small" aria-label="Selection aufheben"
                          @click="onRemoveItemFromSelectionList(item)"/>
                </div>
              </div>
            </div>
          </div>
        </Popover>
      </div>
      <div v-if="isSearchMode" class="page--title title__with-buttons">
        <div class="element-as-columns">
          <InputGroup>
            <InputText fluid placeholder="Text oder Betrag suchen" inputmode="text" enterKeyHint="search"
                       v-model="searchTermInput" class="element--is-grow"
                       @keydown="onSearchTermKeyDown"
                       autofocus></InputText>
            <InputGroupAddon>
              <Button severity="secondary" variant="text" icon="pi pi-times" title="Suchbegriff löschen"
                      @click="onClearSearchTerm"/>
            </InputGroupAddon>
          </InputGroup>
          <MultiSelect class="element--is-grow" id="categories" fluid filter showClear
                       v-model="filterSelectedCategories"
                       :options="categories" optionValue="id"
                       optionLabel="full_name" autoFilterFocus placeholder="Mögliche Kategorien auswählen"/>
          <Select :loading="loading" placeholder="Zeitspanne einschränken" class="element--is-grow" id="timespans" fluid
                  v-model="dateFilter" :options="timespanList"
                  optionLabel="name" showClear @change="onDateFilterChanged"/>
        </div>
        <div class="title--action-buttons title--action-buttons-vertical">
          <Button :severity="severityForSearchToggleButton" icon="pi pi-search" title="Suche ausführen"
                  @click="onSearchTransactions"/>
          <Button severity="secondary" icon="pi pi-times" title="Kriterien zurücksetzen" @click="onClearSearch"/>
        </div>
      </div>
      <div v-if="isMultiSelectMode" class="page--title title__with-buttons">
        <div class="title--action-buttons">
          <Checkbox v-model="selectAllOrNoting"
                    @change="onSelectAllOrNotingChanged($event)" size="small" :indeterminate="isSelectionIndeterminate"
                    binary/>
          <span>{{ transactionsSelected.length }} ausgewählt</span>
        </div>
        <div class="title--action-buttons">
          <Button severity="secondary" icon="pi pi-folder" aria-label="Kategorie setzen" @click="onBatchSetCategory"
                  :disabled="transactionsSelected.length === 0"/>
          <Button severity="secondary" icon="pi pi-tag" aria-label="Tag setzen" @click="onBatchSetTags"
                  :disabled="transactionsSelected.length === 0"/>
        </div>
      </div>
    </div>
    <div class="page--content table-scroll" @scroll="onTableScroll">
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
                  <span v-for="(tag, index) of item.tags" :key="tag">
                    <Chip class="element--is-chip" :label="tag" :title="tag"/>
                  </span>
                </div>
                <div class="data--list__line" v-if="item.t_notes">{{ item.t_notes }}</div>
              </div>
              <div class="data--list__right">
                <span :class="{'data--list__line--bold': item.unseen }">{{ item.amountStr }}</span>
              </div>
            </div>
            <router-link v-else class="data--list__item" append
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
                  <span v-for="(tag, index) of item.tags" :key="tag">
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
            <progress-spinner strokeWidth="4" fill="transparent" animationDuration="1s"></progress-spinner>
          </div>
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