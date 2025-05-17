<template>
  <div class="page transaction-new-view">
    <div class="section">
      <div class="title">Neue Buchung eingeben:</div>
      <div class="label-value in-row">
        <input class="value currency" type="text" inputmode="decimal" v-model="transactionAmountText" @blur="onBlur" @focus="onFocus"
               placeholder="Betrag in 0,01€"/>
      </div>
    </div>
    <div class="section">
      <div class="label-value in-row">
        <input class="value" type="text" v-model="transactionText" placeholder="Name"/>
      </div>
    </div>
    <div class="section">
      <div class="label-value in-row">
        <button v-for="(item, index) in shortcuts" :key="item.id" :id="item.id"
              class="chiclet" @click="clickedShortcut(item.id)">{{item.name}}
        </button>
      </div>
    </div>
    <div class="section">
      <div class="label-value in-row">
        <select class="category-selection" name="categories" id="categories">
          <option value="" disabled selected>Kategorie wählen:</option>
          <option value="k1">Essen</option>
          <option value="k2">Restaurant</option>
          <option value="k3">Mobilität:ÖPNV</option>
          <option value="k4">Urlaub</option>
        </select>
      </div>
    </div>
    <div class="section">
      <div class="label-value in-row">
        <button class="action btn btn--is-primary">Heute</button>
        <button class="action btn btn--is-secondary">Gestern</button>
        <button class="action btn btn--is-secondary">Anderes Datum</button>
      </div>
    </div>
    <div v-if="error" class="section">
      <div class="error">{{ error }}</div>
    </div>
    <div class="section">
      <div class="btn-save">
        <button :disabled="!dirty" @click="saveTransaction" class="action btn btn--is-primary">
          Speichern
        </button>
      </div>
    </div>

  </div>
</template>


<script setup>
</script>

<script>
import {mapActions, mapState, mapStores} from 'pinia';
import {UserStore} from '@/stores/user';
import router from '@/router';
import _ from 'lodash';
import {DateTime} from 'luxon';
import {TransactionStore} from '@/stores/transactions';
import {PreferencesStore} from '@/stores/preferences';
import {MasterDataStore} from '@/stores/masterdata';

export default {
  name: 'TransactionNewView',
  components: {},
  data() {
    return {
      transactionAmountText: '',
      transactionText: this.transactionText,
      transactionNotes: this.transactionNotes,
      transactionPayee: this.transactionPayee,
      categoryId: this.categoryId,
      transaction: this.transaction,
      error: this.error,
      updateData: this.updateData,
      shortcuts: this.shortcuts,
    };
  },
  watch: {
  },
  computed: {
    dirty() {
      const keyCount = Object.keys(this.updateData).length;
      if (keyCount === 1 && this.updateData.confirmed) {
        return false;
      }
      return keyCount > 0;
    },
    ...mapStores(UserStore, MasterDataStore, PreferencesStore),
    ...mapState(UserStore, ['authenticated']),
    ...mapState(PreferencesStore, ['newTransactionPresets']),
    ...mapState(MasterDataStore, ['categories']),
  },
  methods: {
    ...mapActions(TransactionStore, ['addTransaction']),
    ...mapActions(PreferencesStore, ['getNewTransactionPresets']),
    ...mapActions(MasterDataStore, ['getCategoryById', 'getCategories']),
    ...mapActions(UserStore, ["setNotAuthenticated"]),
    async loadDataFromServer() {
      this.error = "";
      this.loading = true;
      try {
        const promises = [];
        promises.push(this.getNewTransactionPresets());
        promises.push(this.getCategories());
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
    currencyStringToNumber(currencyString) {
      // Get the user's locale
      const userLocale = navigator.language || navigator.userLanguage || 'de-DE';

      // Remove any currency symbols and whitespace
      const cleanedString = currencyString.trim().replace(/^[^\d-]+/, '').replace(/[^\d.,\-]+$/, '');

      // Create a NumberFormat instance for parsing
      const numberFormat = new Intl.NumberFormat(userLocale);

      // Get the formatting options to determine decimal and group separators
      const formatParts = numberFormat.formatToParts(1234.5);
      const decimalSeparator = formatParts.find(part => part.type === 'decimal')?.value || '.';
      const groupSeparator = formatParts.find(part => part.type === 'group')?.value || ',';

      // Replace group separators and normalize decimal separator
      const normalizedString = cleanedString
          .replace(new RegExp(`\\${groupSeparator}`, 'g'), '')
          .replace(decimalSeparator, '.');

      // Parse the string to a number
      const number = parseFloat(normalizedString);

      // Check if the result is a valid number
      if (isNaN(number)) {
        throw new Error('Invalid number format');
      }

      return number/100;
    },
    clickedShortcut(e) {
      console.log(e.target.id);
    },
    onFocus(e) {
      const value = e.target.value;
      console.log(String(value));
      e.target.value = value ? this.currencyStringToNumber(value) : '';
    },
    onBlur(e) {
      const currency = 'EUR';
      const value = e.target.value;

      const options = {
        maximumFractionDigits: 2,
        currency: currency,
        style: "currency",
        currencyDisplay: "symbol"
      };

      e.target.value = (value || value === 0)
          ? this.currencyStringToNumber(value).toLocaleString(undefined, options)
          : '';
    },
    async saveTransaction() {
      this.updateData.confirmed = true;
      if (await this.handleDataChanged()) {
        this.goToTransactionList();
      }
    },
    async handleDataChanged() {
      this.error = undefined;
      this.updateData.id = this.transactionId;
      if (this.updateData.category_id !== undefined) {
        // update also the category_name, but it is only used in the transactions list and is
        // not really being updated, because it is retrieved via joining Fk_Category
        this.updateData.category_name = this.getCategoryById(this.updateData.category_id).full_name;
      }
      const result = await this.addTransaction(this.updateData);
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

      this.transaction = _.extend(this.transaction, this.updateData);
      this.updateData = {};
      return true;
    },
  },
  created() {
    this.updateData = {};
    this.transaction = {};
    this.categoryId = 0;
    this.shortcuts = [
      {id: 1, name: 'Bäckerei', categoryId: 1, tags: ['Urlaub', '2025 Köln']},
      {id: 1, name: 'Metzgerei', categoryId: 2, tags: []},
    ];
  },
  async mounted() {
    this.error = undefined;
    this.loading = false;
    await this.loadDataFromServer();
  },

};
</script>

<style scoped>
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
.transaction-new-view {
  gap: 1em;
}

.transaction-new-view .btn-save {
  padding-inline: 0.5em;
  display: flex;
  justify-content: center;
}
.transaction-new-view .btn-save button {
  width: 100%;
  font-size: larger;
}
</style>
