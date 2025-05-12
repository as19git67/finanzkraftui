<template>
  <div class="page">
    <div class="section">
      <div class="title">Neue Buchung eingeben:</div>
      <div class="label-value in-row">
        <input class="value" type="text" v-model="transactionAmountCent" placeholder="Betrag in 0,01€"/>
        <span class="value">{{ transactionAmount }}</span>
      </div>
    </div>
    <div class="section">
      <div class="label-value in-row">
        <input class="value" type="text" v-model="transactionText" placeholder="Name"/>
      </div>
    </div>
    <div class="section">
      <div class="label-value in-row">
        <span class="chiclet">Bäcker</span>
        <span class="chiclet">Feuerwehr</span>
        <span class="chiclet">Döner</span>
        <span class="chiclet">Eisdiele</span>
        <span class="chiclet">Metzgerei</span>
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
      <div class="bottom-links">
        <button v-if="dirty" @click="cancelChanges" class="action btn btn--is-secondary">Abbrechen
        </button>
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
import {MasterDataStore} from '@/stores/masterdata';

export default {
  name: 'TransactionNewView',
  components: {},
  data() {
    return {
      transactionAmountCent: '',
      transactionAmount: 0,
      transactionNotes: this.transactionNotes,
      transactionPayee: this.transactionPayee,
      categoryId: this.categoryId,
      transaction: this.transaction,
      error: this.error,
      updateData: this.updateData,
    };
  },
  watch: {
    transactionAmountCent: function(newVal, oldVal) {
      this.transactionAmount = new Intl.NumberFormat('de-DE', {style: 'currency', currency: 'EUR'}).format(
          newVal / 100);
      console.log(this.transactionAmount);
    },
    transactionNotes: function(val, oldVal) {
      if (oldVal === undefined || this.transaction === undefined) {
        return;
      }
      this.updateData.t_notes = val;
      this.transaction.t_notes = val;
    },
    categoryId: function(val, oldVal) {
      if (oldVal === undefined || this.transaction === undefined) {
        return;
      }
      if (this.transaction.category_id === val) {
        return;
      }
      this.updateData.category_id = val;
      this.transaction.category_id = val;
      if (val && this.categories.length > 0) {
        this.transaction.category_name = this.getCategoryById(val).full_name;
      } else {
        this.transaction.category_name = '';
      }
    },
    transactionPayee: function(val, oldVal) {
      if (oldVal === undefined || this.transaction === undefined) {
        return;
      }
      if (this.transaction.t_payee === val) {
        return;
      }
      this.updateData.t_payee = val;
    },
  },
  computed: {
    dirty() {
      const keyCount = Object.keys(this.updateData).length;
      if (keyCount === 1 && this.updateData.confirmed) {
        return false;
      }
      return keyCount > 0;
    },
    ...mapStores(UserStore, MasterDataStore),
    ...mapState(UserStore, ['authenticated']),
    ...mapState(MasterDataStore, ['categories']),
  },
  methods: {
    ...mapActions(TransactionStore, ['addTransaction']),
    ...mapActions(MasterDataStore, ['getCategoryById', 'getCategories']),
    goToTransactionList() {
      router.replace({name: 'home'});
    },
    async cancelChanges() {
      this.confirmText = 'Änderungen verwerfen und zurück zur Liste?';
      this.showConfirmDialog = true;
      const res = await new Promise((resolve, reject) => {
        this.dialogResolve = resolve;
      });
      switch (res) {
        case 'yes':
          this.goToTransactionList();
          break;
        case 'no':
          break;
      }
    },
    confirmDialogButtonClicked(btnId) {
      this.showConfirmDialog = false;
      this.dialogResolve(btnId);
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
  },
  async mounted() {
    this.error = undefined;
    this.loading = true;

    const promises = [];
    promises.push(this.getCategories());
    const results = await Promise.all(promises);
    this.loading = false;

    let mustAuthenticate = false;
    let not_ok = false;
    results.forEach((result, index) => {
      let status = result;
      if (_.isObject(result)) {
        status = result.status;
      }
      switch (status) {
        case 401:
          mustAuthenticate = true;
          break;
        case 403:
          this.error = 'Die Berechtigung zum Laden der Kategorien fehlt.';
          not_ok = true;
          break;
        case 200:
          break;
        default:
          not_ok = true;
      }
    });
    if (mustAuthenticate || not_ok) {
      this.transaction = {};
    }
    if (mustAuthenticate) {
      router.replace('/login');
      return;
    }
    if (not_ok) {
      return;
    }

    const selectedCategory = parseInt(router.currentRoute.value.query.selectedCategory);
    if (selectedCategory) {
      // back from category selection
      this.categoryId = selectedCategory;
    } else {
      this.categoryId = this.transaction.category_id;
    }
  },
};
</script>

<style scoped>
  .chiclet {
    padding-inline: 0.25em;
    background-color: gold;
    border-radius: 4px;
  }
  .category-selection {
    display: flex;
    width: 100%;
    padding-block: 3px;
    font-size: medium;
  }
</style>
