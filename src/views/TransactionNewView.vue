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
import {AccountStore} from '@/stores/accounts';

export default {
  name: 'TransactionNewView',
  components: {},
  data() {
    return {
      accountName: this.accountName,
      filteredCategories: this.filteredCategories,
      filteredPayees: this.filteredPayees,
      filteredShortcuts: this.filteredShortcuts,
      isSpending: true,
      amountRaw: '',
      transactionAmount: this.transactionAmount,
      transactionDate: this.transactionDate,
      transactionCategory: this.transactionCategory,
      transactionNotes: this.transactionNotes,
      transactionPayee: this.transactionPayee,
      transactionTags: this.transactionTags,
      transactionTagsList: this.transactionTagsList,

      error: this.error,
      labelSave: this.labelSave,
    };
  },
  watch: {
    transactionText: function(val, oldVal) {
      this.filteredShortcuts = this.filterShortcuts(val);
    },
    amountRaw: function(val, oldVal) {
      console.log('transactionAmount changed');
      this.transactionAmount = val;
    }
  },
  computed: {
    ...mapStores(UserStore, MasterDataStore, PreferencesStore, AccountStore),
    ...mapState(UserStore, ['authenticated']),
    ...mapState(AccountStore, ['accounts']),
    ...mapState(TransactionStore, ['transactions']),
    ...mapState(PreferencesStore, ['newTransactionPresets']),
    ...mapState(MasterDataStore, ['categories', 'tags']),
    saveEnabled() {
      return !this.loading && this.transactionAmount && (this.transactionNotes || this.transactionPayee) &&
          this.transactionDate && this.transactionCategory;
    },
  },
  methods: {
    ...mapActions(TransactionStore, ['getTransactions', 'addTransaction']),
    ...mapActions(PreferencesStore,
        ['getNewTransactionPresets', 'addNewTransactionPresets', 'saveNewTransactionPresets']),
    ...mapActions(MasterDataStore, ['getCategoryById', 'getCategories', 'getTags']),
    ...mapActions(UserStore, ['setNotAuthenticated']),
    ...mapActions(AccountStore, ['getAccounts', 'getAccountById']),
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
    searchPayee(event) {
      const searchTerm = event.query.trim().toLowerCase();
      if (!searchTerm.length) {
        this.filteredPayees = [...this.payees];
      } else {
        this.filteredPayees = this.payees.filter((payee) => {
          return payee.toLowerCase().indexOf(searchTerm) >= 0;
        });
      }
    },
    clickedShortcut(shortcut) {
      this.transactionPayee = shortcut.payee;
      this.transactionCategory = this.categories.find(category => {
        return category.id === shortcut.categoryId;
      });
    },
    extractPayees() {
      const p = {};
      this.transactions.forEach(transaction => {
        const payee = transaction.t_payee;
        if (payee) {
          const trimmed = payee.trim();
          p[trimmed] = trimmed;
        }
      });
      this.payees = Object.keys(p);
    },
    async loadDataFromServer() {
      this.error = '';
      this.loading = true;
      try {
        const promises = [];
        promises.push(this.getTags());
        promises.push(this.getAccounts(true));
        promises.push(this.getTransactions({accountsWhereIn: [parseInt(this.accountId)]}));
        promises.push(this.getNewTransactionPresets());
        promises.push(this.getCategories(true));
        const results = await Promise.all(promises);
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
        this.extractPayees();
        this.transactionTagsList = this.tags;
        this.loading = false;
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
      this.labelSave = 'speichern...';
      this.transactionPayee = this.transactionPayee ? this.transactionPayee.trim() : null;
      this.transactionNotes = this.transactionNotes ? this.transactionNotes.trim() : null;
      const selectedTagIds = this.transactionTags.toSorted();
      const transactionData = {
        t_amount: this.transactionAmount * (this.isSpending ? -1 : 1),
        t_notes: this.transactionNotes,
        t_payee: this.transactionPayee,
        t_value_date: this.transactionDate,
        t_category_id: this.transactionCategory.id,
        idAccount: parseInt(this.accountId),
        tagIds: selectedTagIds,
      };

      const s = this.newTransactionPresets.find(shortcut => {
        return shortcut.payee === this.transactionPayee;
      });
      if (s) {
        s.categoryId = this.transactionCategory.id;
        s.lastUsed = new Date();
      } else {
        if (this.transactionPayee) {
          this.transactionPayee = this.transactionPayee.trim();
          this.newTransactionPresets.push({
            payee: this.transactionPayee,
            categoryId: this.transactionCategory.id,
            tags: [],
            lastUsed: new Date(),
          });
        }
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
        this.labelSave = 'Speichern';
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
      this.account = this.getAccountById(parseInt(this.accountId));
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
    this.transactionTags = [];
    this.transactionTagsList = [];
    this.filteredPayees = [];
    this.labelSave = 'Speichern';
  },
};
</script>

<template>
  <div class="page page--is-transaction-new-view">
    <div class="page--header">
      <div class="page--title title__with-buttons">
        <Button label="Abbrechen" @click="cancel" size="large">
        </Button>
        Neu für {{ accountName }}
        <Button :label="labelSave" :disabled="!saveEnabled" @click="saveTransaction" size="large">
        </Button>
      </div>
    </div>
    <div class="page--content">
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <AutoComplete id="catSelection" class="transactionCategorySelection" v-model="transactionCategory"
                        optionLabel="full_name"
                        :suggestions="filteredCategories" @complete="searchCategory"/>
          <label for="catSelection">Kategorie</label>
        </FloatLabel>
      </div>
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <MultiSelect id="tags" fluid filter v-model="transactionTags" :options="transactionTagsList" optionValue="id"
                       optionLabel="tag" autoFilterFocus/>
          <label for="tags">Tags</label>
        </FloatLabel>
      </div>
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <AutoComplete id="payeeSelection" class="transactionPayeeSelection prevent-scroll"
                        v-model="transactionPayee"
                        :suggestions="filteredPayees" @complete="searchPayee"/>
          <label for="payeeSelection">
            <span v-if="isSpending">Zahlungsempfänger</span>
            <span v-else>Zahler</span>
          </label>
        </FloatLabel>
      </div>
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputText id="idTransactionNotes" v-model=transactionNotes size="small"
                     class="prevent-scroll"></InputText>
          <label for="idTransactionNotes">Notizen</label>
        </FloatLabel>
      </div>
      <div class="page--content--row">
        <div class="page--content--row__inline">
          <FloatLabel variant="in" class="row--item row--item--is-grow">
            <InputNumber id="idTransactionAmount" locale="de-DE"
                         inputmode="decimal" currency="EUR"
                         @input="(e) => (amountRaw = e.value)"
                         class="prevent-scroll"
                         mode="currency" v-model=transactionAmount size="large"/>
            <label for="idTransactionAmount">Betrag</label>
          </FloatLabel>
          <ToggleButton v-model="isSpending" onLabel="Ausgabe" offLabel="Einnahme" onIcon="pi pi-minus"
                        offIcon="pi pi-plus" size="large"/>
        </div>
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
        <div class="page--content--row__inline page--content--row__inline--wrapped">
          <div class="chips-container">
          <Button v-for="(item, index) in filteredShortcuts" :key="item.id" :id="item.id" @click="clickedShortcut(item)"
                  :label="item.payee" severity="info" rounded size="small"/>
          </div>
        </div>
      </div>
      <div class="page--content--row" v-if="error">
        <div class="error">{{ error }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.transactionCategorySelection,
.transactionPayeeSelection,
.transactionCategorySelection > *,
.transactionPayeeSelection > * {
  display: flex;
  flex-grow: 1;
  flex-basis: 100%;
  width: 100%;
}
</style>

<style>
.p-togglebutton-content {
  height: 100%;
}
</style>