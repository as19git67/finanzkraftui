<script setup>
defineProps({
  accountId: { type: String },
});
</script>

<script>
import {DateTime} from 'luxon';
import {mapActions, mapState, mapStores} from 'pinia';
import router from '@/router';
import _ from 'lodash';
import {UserStore} from '@/stores/user';
import {TransactionStore} from '@/stores/transactions';
import {PreferencesStore} from '@/stores/preferences';
import {MasterDataStore} from '@/stores/masterdata';
import {AccountStore} from "@/stores/accounts";

export default {
  name: 'TransactionNewView',
  components: {},
  data() {
    return {
      accountName: this.accountName,
      filteredCategories: this.filteredCategories,
      isSpending: true,
      transactionAmount: this.transactionAmount,
      transactionText: this.transactionText,
      transactionDate: this.transactionDate,
      transactionCategory: this.transactionCategory,
      transactionNotes: this.transactionNotes,
      transactionPayee: this.transactionPayee,
      error: this.error,
      shortcuts: this.shortcuts,
    };
  },
  watch: {
    // transactionAmountText: function(val, oldVal) {
    //   this.transactionAmount = this.currencyStringToNumber(val);
    // },
  },
  computed: {
    ...mapStores(UserStore, MasterDataStore, PreferencesStore, AccountStore),
    ...mapState(UserStore, ['authenticated']),
    ...mapState(AccountStore, ["accounts"]),
    ...mapState(PreferencesStore, ['newTransactionPresets']),
    ...mapState(MasterDataStore, ['categories']),
    saveEnabled() {
      return this.transactionAmount && this.transactionText && this.transactionDate && this.transactionCategory;
    },
    transactionDateFormatted() {
      if (this.transactionDate) {
        return DateTime.fromISO(this.transactionDate).toRelativeCalendar();
      } else {
        return '';
      }
    },
  },
  methods: {
    ...mapActions(TransactionStore, ['addTransaction']),
    ...mapActions(PreferencesStore, ['getNewTransactionPresets']),
    ...mapActions(MasterDataStore, ['getCategoryById', 'getCategories']),
    ...mapActions(UserStore, ['setNotAuthenticated']),
    ...mapActions(AccountStore, ["getAccounts", "getAccountById"]),
    searchCategory(event) {
      if (!event.query.trim().length) {
        this.filteredCategories = [...this.categories];
      } else {
        this.filteredCategories = this.categories.filter((category) => {
          return category.full_name.toLowerCase().indexOf(event.query.toLowerCase()) >= 0;
        });
      }
    },
    async loadDataFromServer() {
      this.error = '';
      this.loading = true;
      try {
        const promises = [];
        promises.push(this.getAccounts(true));
        promises.push(this.getNewTransactionPresets());
        promises.push(this.getCategories(true));
        const results = await Promise.all(promises);
        this.loading = false;
        let mustAuthenticate = false;
        let notAuthorized = false;
        let not_ok = false;
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
      } catch (ex) {
        this.error = ex.message;
        this.loading = false;
      }
    },
    // currencyStringToNumber(currencyString) {
    //   // Get the user's locale
    //   const userLocale = navigator.language || navigator.userLanguage || 'de-DE';
    //
    //   // Remove any currency symbols and whitespace
    //   const cleanedString = currencyString.trim().replace(/^[^\d-]+/, '').replace(/[^\d.,\-]+$/, '');
    //
    //   // Create a NumberFormat instance for parsing
    //   const numberFormat = new Intl.NumberFormat(userLocale);
    //
    //   // Get the formatting options to determine decimal and group separators
    //   const formatParts = numberFormat.formatToParts(1234.5);
    //   const decimalSeparator = formatParts.find(part => part.type === 'decimal')?.value || '.';
    //   const groupSeparator = formatParts.find(part => part.type === 'group')?.value || ',';
    //
    //   // Replace group separators and normalize decimal separator
    //   const normalizedString = cleanedString.replace(new RegExp(`\\${groupSeparator}`, 'g'), '').
    //       replace(decimalSeparator, '.');
    //
    //   // Parse the string to a number
    //   const number = parseFloat(normalizedString);
    //
    //   // Check if the result is a valid number
    //   if (isNaN(number)) {
    //     throw new Error('Invalid number format');
    //   }
    //
    //   return number / 100;
    // },
    async saveTransaction() {
      this.error = undefined;
      const transactionData = {
        t_amount: this.transactionAmount,
        t_notes: this.transactionNotes,
        t_payee: this.transactionPayee,
        t_value_date: this.transactionDate,
        t_text: this.transactionText,
        t_category_id: this.transactionCategory.id,
        idAccount: parseInt(this.accountId),
      }
      const result = await this.addTransaction(transactionData);
      let not_ok = false;
      let mustAuthenticate = false;
      let status = result.status;
      switch (status) {
        case 401:
          mustAuthenticate = true;
          break;
        case 403:
          this.error = 'Die Berechtigung zum Speichern einer neuen Buchung fehlt.';
          not_ok = true;
          break;
        case 200:
          break;
        default:
          not_ok = true;
      }
      if (mustAuthenticate) {
        this.error = 'Benutzer muss angemeldet sein';
        return false;
      }
      if (not_ok) {
        if (!this.error) {
          this.error = result.message;
        }
        return false;
      }
      return true;
    },
    setDateYesterday() {
      this.transactionDate = DateTime.now().plus({days: -1});
    },
    setDateToday() {
      this.transactionDate = DateTime.now();
    },
  },
  async mounted() {
    try {
      await this.loadDataFromServer();
      this.account = await this.getAccountById(parseInt(this.accountId));
      this.accountName = this.account.name;
    } catch (ex) {
      this.error = ex.message;
      this.loading = false;
    }
  },
  created() {
    this.error = undefined;
    this.loading = false;
    this.transactionAmount = 0;
    this.transactionDate = DateTime.now();
    this.filteredCategories = [];
    this.shortcuts = [
      {id: 1, name: 'Bäckerei', categoryId: 1, tags: ['Urlaub', '2025 Köln']},
      {id: 1, name: 'Metzgerei', categoryId: 2, tags: []},
    ];
  },
};
</script>

<template>
  <div class="page page--is-transaction-new-view">
    <div class="page--header">
      <div class="title">Neue Buchung für {{accountName}} eingeben:</div>
    </div>
    <div class="page--content">
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputNumber id="idTransactionAmount" locale="de-DE"
                       inputmode="decimal" currency="EUR"
                       mode="currency" v-model=transactionAmount variant="filled" size="large"/>
          <label for="idTransactionAmount">Betrag</label>
        </FloatLabel>
        <ToggleButton v-model="isSpending" onLabel="Ausgabe" offLabel="Einnahme" onIcon="pi pi-minus"
                      offIcon="pi pi-plus" />
      </div>
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputText id="idTransactionText" class="value" v-model=transactionText variant="filled"
                     size="small"></InputText>
          <label for="idTransactionText">Name</label>
        </FloatLabel>
      </div>
      <div class="page--content--row">
        <Button v-for="(item, index) in shortcuts" :key="item.id" :id="item.id" @click="clickedShortcut(item.id)"
                :label="item.name" severity="info" rounded size="small"/>
      </div>
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <AutoComplete id="catSelection" class="transactionCategorySelection" v-model="transactionCategory" optionLabel="full_name"
                        :suggestions="filteredCategories" @complete="searchCategory" />
          <label for="catSelection">Kategorie</label>
        </FloatLabel>
      </div>
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputText id="transactionDateFormatted" v-model=transactionDateFormatted readonly
                     variant="filled"></InputText>
          <label for="transactionDateFormatted">Datum</label>
        </FloatLabel>
      </div>
      <div class="page--content--row">
          <Button size="small" @click="setDateToday" label="Heute"></Button>
          <Button size="small" severity="secondary" @click="setDateYesterday">Gestern</Button>
          <Button size="small" severity="secondary">Anderes Datum</Button>
      </div>
      <div class="page--content--row" v-if="error">
        <div class="error">{{ error }}</div>
      </div>
    </div>
    <div class="page--footer footer--is-sticky">
      <div class="btn-save">
        <Button label="Speichern" :disabled="!saveEnabled" @click="saveTransaction" size="large">
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.transactionCategorySelection {
  display: flex;
  flex-grow: 1;
  flex-basis: 100%;
  width: 100%;
}

.transactionCategorySelection > * {
  display: flex;
  flex-grow: 1;
  flex-basis: 100%;
  width: 100%;
}

.page--footer .btn-save {
  display: flex;
  flex-direction: row;
  justify-content: center;
  flex: 1 1 auto;
}

.page--footer .btn-save button {
  flex-grow: 1;
}

.value.currency {
  font-size: x-large;
}

.chiclet {
  padding-inline: 6px;
  padding-block: 3px;
  background-color: gold;
  border-width: 0;
  border-radius: 4px;
}

.category-selection {
  display: flex;
  width: 100%;
  padding-block: 3px;
  font-size: medium;
}

.xpage--is-transaction-new-view {
  gap: 1em;
}

.xpage--is-transaction-new-view .btn-save {
  display: flex;
  justify-content: center;
}

.xpage--is-transaction-new-view .btn-save button {
  width: 100%;
}
</style>
