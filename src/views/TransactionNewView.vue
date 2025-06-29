<script setup>
defineProps({
  accountId: {type: String},
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
      filteredShortcuts: this.filteredShortcuts,
      isSpending: true,
      transactionAmount: this.transactionAmount,
      transactionText: this.transactionText,
      transactionDate: this.transactionDate,
      transactionCategory: this.transactionCategory,
      transactionNotes: this.transactionNotes,
      transactionPayee: this.transactionPayee,
      error: this.error,
    };
  },
  watch: {
    transactionText: function(val, oldVal) {
      this.filteredShortcuts = this.filterShortcuts(val);
    },
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
  },
  methods: {
    ...mapActions(TransactionStore, ['addTransaction']),
    ...mapActions(PreferencesStore, ['getNewTransactionPresets', 'addNewTransactionPresets', 'saveNewTransactionPresets']),
    ...mapActions(MasterDataStore, ['getCategoryById', 'getCategories']),
    ...mapActions(UserStore, ['setNotAuthenticated']),
    ...mapActions(AccountStore, ["getAccounts", "getAccountById"]),
    filterShortcuts(searchTerm) {
      return this.newTransactionPresets.filter(shortcut => {
        if (!searchTerm) {
          return true;
        }
        const st = searchTerm.trim().toLowerCase();
        const sc = shortcut.name.trim().toLowerCase();
        return sc.includes(st);
      });
    },
    searchCategory(event) {
      if (!event.query.trim().length) {
        this.filteredCategories = [...this.categories];
      } else {
        this.filteredCategories = this.categories.filter((category) => {
          return category.full_name.toLowerCase().indexOf(event.query.toLowerCase()) >= 0;
        });
      }
    },
    clickedShortcut(shortcut) {
      this.transactionText = shortcut.name;
      this.transactionCategory = this.categories.find(category => {
        return category.id === shortcut.categoryId;
      });
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
        this.filteredShortcuts = this.filterShortcuts();
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
      this.error = '';
      this.loading = false;
      this.transactionText = this.transactionText ? this.transactionText.trim() : null;
      this.transactionPayee = this.transactionPayee ? this.transactionPayee.trim() : null;
      this.transactionNotes = this.transactionNotes? this.transactionNotes.trim(): null;
      const transactionData = {
        t_amount: this.transactionAmount * (this.isSpending ? -1 : 1),
        t_notes: this.transactionNotes,
        t_payee: this.transactionPayee,
        t_value_date: this.transactionDate,
        t_text: this.transactionText,
        t_category_id: this.transactionCategory.id,
        idAccount: parseInt(this.accountId),
      }

      const s = this.newTransactionPresets.find(shortcut => {
        return shortcut.name === this.transactionText;
      });
      if (s) {
        s.categoryId = this.transactionCategory.id;
        s.lastUsed = new Date();
      } else {
        this.newTransactionPresets.push({
          name: this.transactionText,
          categoryId: this.transactionCategory.id,
          tags: [],
          lastUsed: new Date(),
        });
      }
      try {
        const promises = [];
        promises.push(this.addTransaction(transactionData));
        promises.push(this.saveNewTransactionPresets());
        const results = await Promise.all(promises);
        this.loading = false;
        let mustAuthenticate = false;
        let notAuthorized = false;
        let not_ok = false;
        results.forEach((result) => {
          if (mustAuthenticate || not_ok) {
            return; // skip further request results
          }
          let status = result;
          if (_.isObject(result)) {
            status = result.status;
          }
          switch (status) {
            case 403:
              this.error = 'Die Berechtigung zum Speichern einer neuen Buchung fehlt.';
              not_ok = true;
              break;
            case 401:
            case 404:
              mustAuthenticate = true;
              break;
            case 200:
              router.replace({name: 'home'});
              break;
            default:
              not_ok = true;
          }
        });
        if (mustAuthenticate) {
          this.setNotAuthenticated();
          await router.replace({name: 'login'});
          return;
        }
        if (notAuthorized) {
          await router.replace({name: 'notAuthorized'});
          return;
        }
        if (not_ok) {
          this.error = 'Fehler beim Speichern der Buchung.';
          console.log(result.message);
        }
      } catch (ex) {
        this.error = ex.message;
        this.loading = false;
      }
    },
    cancel() {
      router.replace({name: 'home'});
    },
    setDateYesterday() {
      this.transactionDate = DateTime.now().plus({days: -1}).toJSDate();
    },
    setDateToday() {
      this.transactionDate = DateTime.now().toJSDate();
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
    this.transactionAmount = undefined;
    this.transactionDate = DateTime.now().toJSDate();
    this.filteredCategories = [];
    this.shortcuts = [];
  },
};
</script>

<template>
  <div class="page page--is-transaction-new-view">
    <div class="page--header">
      <div class="title">Neue Buchung für {{ accountName }} eingeben:</div>
    </div>
    <div class="page--content">
      <div class="page--content--row">
        <div class="page--content--row__inline">
          <FloatLabel variant="in" class="row--item row--item--is-grow">
            <InputNumber id="idTransactionAmount" locale="de-DE"
                         inputmode="decimal" currency="EUR"
                         mode="currency" v-model=transactionAmount size="large"/>
            <label for="idTransactionAmount">Betrag</label>
          </FloatLabel>
          <ToggleButton v-model="isSpending" onLabel="Ausgabe" offLabel="Einnahme" onIcon="pi pi-minus"
                        offIcon="pi pi-plus" size="large"/>
        </div>
      </div>
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputText id="idTransactionText" class="value" v-model=transactionText size="small" autofocus clear></InputText>
          <label for="idTransactionText">Name</label>
        </FloatLabel>
      </div>
      <div class="page--content--row">
        <div class="page--content--row__inline page--content--row__inline--wrapped">
          <Button v-for="(item, index) in filteredShortcuts" :key="item.id" :id="item.id" @click="clickedShortcut(item)"
                  :label="item.name" severity="info" rounded size="small"/>
        </div>
      </div>
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <AutoComplete id="catSelection" class="transactionCategorySelection" v-model="transactionCategory"
                        optionLabel="full_name"
                        :suggestions="filteredCategories" @complete="searchCategory"/>
          <label for="catSelection">Kategorie</label>
        </FloatLabel>
      </div>
      <div class="page--content--row">
        <div class="page--content--row__inline">
          <FloatLabel variant="in" class="row--item row--item--is-grow">
            <DatePicker v-model="transactionDate" inputId="transactionDate" showIcon iconDisplay="input"
                        variant="filled"/>
            <label for="transactionDate">Buchungsdatum</label>
          </FloatLabel>
          <Button size="small" @click="setDateToday" label="Heute"></Button>
          <Button size="small" @click="setDateYesterday">Gestern</Button>
        </div>
      </div>
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputText id="idTransactionNotes" class="value" v-model=transactionNotes size="small" clear></InputText>
          <label for="idTransactionNotes">Notizen</label>
        </FloatLabel>
      </div>
      <div class="page--content--row" v-if="error">
        <div class="error">{{ error }}</div>
      </div>
    </div>
    <div class="page--footer footer--is-sticky">
      <Button label="Speichern" :disabled="!saveEnabled" @click="saveTransaction" size="large">
      </Button>
      <Button label="Abbrechen" @click="cancel" size="large">
      </Button>
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

.page--footer .p-button {
  display: flex;
  flex-direction: row;
  justify-content: center;
  flex: 1 1 auto;
}

.page--footer .p-button button {
  flex-grow: 1;
}
</style>
