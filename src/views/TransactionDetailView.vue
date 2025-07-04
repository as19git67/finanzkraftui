<script setup>
import {DateTime, Settings as DateTimeSettings} from "luxon";

defineProps({
  transactionId: {type: String},
});
</script>

<script>
import _ from 'lodash';
import router from '@/router';
import {mapActions, mapState, mapStores} from 'pinia';
import {UserStore} from '@/stores/user';
import {MasterDataStore} from '@/stores/masterdata';
import {DateTime, Settings as DateTimeSettings} from "luxon";
import {TransactionStore} from "@/stores/transactions";

export default {
  name: "TransactionDetailView",
  components: {},
  data() {
    return {
      transactionDate: this.transactionDate,
      transactionNotes: this.transactionNotes,
      transactionText: this.transactionText,
      transactionPayee: this.transactionPayee,
      transactionPayeeShortened: this.transactionPayeeShortened,
      transactionEntryText: this.transactionEntryText,
      transactionCategory: this.transactionCategory,
      filteredCategories: this.filteredCategories,
      transaction: this.transaction,
      error: this.error,
      updateData: this.updateData,
      categoryPreselection: 0,
      confirmText: '',
      editName: false,
      amazonOrderId: '',
    };
  },
  watch: {
    transactionNotes: function (val, oldVal) {
      if (oldVal === undefined || this.transaction === undefined) {
        return;
      }
      this.updateData.t_notes = val;
      this.transaction.t_notes = val;
    },
    categoryId: function (val, oldVal) {
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
    transactionPayee: function (val, oldVal) {
      if (oldVal === undefined || this.transaction === undefined) {
        return;
      }
      if (this.transaction.t_payee === val) {
        return;
      }
      this.updateData.t_payee = val;
    }
  },
  computed: {
    confirmed() {
      return this.transaction?.confirmed;
    },
    dirty() {
      const keyCount = Object.keys(this.updateData).length;
      if (keyCount === 1 && this.updateData.confirmed) {
        return false;
      }
      return keyCount > 0;
    },
    ...mapStores(UserStore, MasterDataStore),
    ...mapState(UserStore, ["authenticated"]),
    ...mapState(MasterDataStore, ["categories"]),
  },
  methods: {
    ...mapActions(TransactionStore,
        ["getTransaction", "updateTransaction", "setCurrentTransactionId"]),
    ...mapActions(MasterDataStore, ["getCategoryById", "getCategories"]),
    switchToEditName() {
      this.editName = true;
    },
    switchOffEditName() {
      this.editName = false;
    },
    goToTransactionList() {
      router.back();
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
    async selectCategory() {
      this.showCategorySelectionDialog = true;
      this.showTransaction = true;
      this.categoryPreselection = this.categoryId;
      const res = await new Promise((resolve, reject) => {
        this.dialogResolve = resolve;
      });
      switch (res.btnId) {
        case 'ok':
          this.categoryId = res.categoryId;
          break;
      }
    },
    categorySelectionDialogButtonClicked(btnId, categoryId) {
      this.showCategorySelectionDialog = false;
      this.dialogResolve({btnId: btnId, categoryId: categoryId});
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
    cancel() {
      router.back();
    },
    deleteTransaction() {

    },
    async handleDataChanged() {
      this.error = undefined;
      this.updateData.id = this.transactionId;
      if (this.updateData.category_id !== undefined) {
        this.updateData.category_id = this.transactionCategory.id;
        // update also the category_name, but it is only used in the transactions list and is
        // not really being updated, because it is retrieved via joining Fk_Category
        // this.updateData.category_name = this.getCategoryById(this.updateData.category_id).full_name;
      }
      const result = await this.updateTransaction(this.updateData);
      let not_ok = false;
      let mustAuthenticate = false;
      let status = result.status;
      switch (status) {
        case 401:
          mustAuthenticate = true;
          break;
        case 403:
          this.error = 'Die Berechtigung zum Ändern der Buchung fehlt.';
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
    async markUnconfirmed() {
      this.updateData.confirmed = false;
      await this.handleDataChanged();
    }
  },
  created() {
    this.dataChanged = _.debounce(this.handleDataChanged, 2000);
    this.updateData = {};
    this.transaction = {};
  },
  async mounted() {
    this.error = undefined;
    this.loading = true;

    if (!this.transactionId) {
      router.replace("/");
      return;
    }

    this.setCurrentTransactionId(this.transactionId);

    const promises = [];
    promises.push(this.getTransaction(this.transactionId));
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
          if (index === 0) {
            this.error = 'Die Berechtigung zum Laden der Buchung fehlt.';
          } else {
            if (this.error) {
              this.error += ' ';
            }
            this.error += 'Die Berechtigung zum Laden der Kategorien fehlt.'
          }
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
      router.replace("/login");
      return;
    }
    if (not_ok) {
      return;
    }

    this.transaction = {...(results[0].data)};

    this.transactionCategory = _.find(this.categories, (item) => {
      return item.id === this.transaction.category_id;
    });

    this.transactionDate = new Date(this.transaction.t_value_date);
    this.transactionNotes = this.transaction.t_notes;
    this.transactionText = this.transaction.t_text;
    this.transactionPayee = this.transaction.t_payee;
    this.transactionPayeeShortened = this.transaction.payeeShortened;
    this.transactionEntryText = this.transaction.t_entry_text;
    if (this.transaction.t_text && this.transaction.t_payee &&
        this.transaction.t_payee.startsWith('AMAZON')) {
      const matches = this.transaction.t_text.match(/(\d{3}\-\d{7}\-\d{7})/);
      if (matches.length > 0) {
        this.amazonOrderId = matches[0];
      } else {
        this.amazonOrderId = '';
      }
    }
    if (!this.transaction.confirmed) {
      this.transaction.confirmed = true;
      this.updateData.confirmed = true;
      this.dataChanged();
    }
  },
};
</script>

<template>
  <div class="page page--is-transaction-detail-view">
    <div class="page--header">
      <div class="page--title title__with-buttons">
        <Button label="Abbrechen" @click="cancel">
        </Button>
        Buchungsdetails
        <Button label="Speichern" :disabled="!dirty" @click="saveTransaction">
        </Button>
      </div>
    </div>
    <div class="page--content">
      <div class="page--content--row" v-if="transactionPayeeShortened">
        <div class="row--item row--item--is-centered row--item--is-emphasized" title="{{transactionPayee}}">{{transactionPayeeShortened}}</div>
      </div>
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <AutoComplete id="catSelection" v-model="transactionCategory"
                        optionLabel="full_name"
                        dropdown size="small"
                        :suggestions="filteredCategories" @complete="searchCategory" />
          <label for="catSelection">Kategorie</label>
        </FloatLabel>
      </div>
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputText id="idTransactionNotes" v-model="transactionNotes"></InputText>
          <label for="idTransactionNotes">Notiz</label>
        </FloatLabel>
      </div>
      <div class="page--content--row">
        <div class="page--content--row__inline">
          <FloatLabel variant="in" class="row--item row--item--is-grow">
            <InputNumber id="idTransactionAmount" locale="de-DE"
                         inputmode="decimal" currency="EUR"
                         mode="currency" v-model="transaction.t_amount"
                         variant="filled" readonly size="large"/>
            <label for="idTransactionAmount">Betrag</label>
          </FloatLabel>
        </div>
      </div>
      <div class="page--content--row">
        <div class="page--content--row__inline">
          <FloatLabel variant="in" class="row--item row--item--is-grow">
            <DatePicker v-model="transactionDate" inputId="transactionDate" showIcon readonly
                        iconDisplay="input"
                        variant="filled"/>
            <label for="transactionDate">Buchungsdatum</label>
          </FloatLabel>
        </div>
      </div>

      <div class="page--content--row" v-if="transactionEntryText">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputText id="idTransactionEntryText" v-model="transactionEntryText" variant="filled"
                     readonly/>
          <label for="idTransactionEntryText">Buchungstyp</label>
        </FloatLabel>
      </div>
      <div class="page--content--row" v-if="transactionText">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <Textarea id="idTransactionText" v-model="transactionText" variant="filled"
                     readonly size="small" autoResize></Textarea>
          <label for="idTransactionText">Text</label>
        </FloatLabel>
      </div>
      <div class="page--content--row" v-if="transaction.t_MREF">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputText id="idTransactionMREF" v-model="transaction.t_MREF" variant="filled"
                     readonly size="small"/>
          <label for="idTransactionMREF">Mandatsreferenz</label>
        </FloatLabel>
      </div>

      <div v-if="amazonOrderId" class="page--content--row">
        <div class="row--item">
          <Button as="a"
                  label="Bestellung in Amazon anzeigen"
                  :href="`https://www.amazon.de/gp/your-account/order-details?ie=UTF8&orderID=${amazonOrderId}`"
                  target="_blank" rel="noopener" />
        </div>
      </div>

      <div class="page--content--row" v-if="transaction.account_name">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputText id="idTransactionAccountName" v-model="transaction.account_name" variant="filled"
                     readonly size="small"/>
          <label for="idTransactionAccountName">Konto</label>
        </FloatLabel>
      </div>
      <div class="page--content--row" v-if="transaction.t_payeePayerAcctNo">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputText id="idTransactionPayeePayeeAcctNo" v-model="transaction.t_payeePayerAcctNo" variant="filled"
                     readonly size="small"/>
          <label for="idTransactionPayeePayeeAcctNo">Zahlungsempfänger</label>
        </FloatLabel>
      </div>
      <div class="page--content--row" v-if="transaction.t_EREF">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputText id="idTransactionEREF" v-model="transaction.t_EREF" variant="filled"
                     readonly size="small"/>
          <label for="idTransactionEREF">ERef</label>
        </FloatLabel>
      </div>
      <div class="page--content--row" v-if="transaction.t_CRED">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputText id="idTransactionCRED" v-model="transaction.t_CRED" variant="filled"
                     readonly size="small"/>
          <label for="idTransactionCRED">Lieferant</label>
        </FloatLabel>
      </div>
      <div class="page--content--row" v-if="transaction">
        <router-link class="action" replace :to="{ path:'/', name: 'home'}">Tags bearbeiten</router-link>
      </div>
      <div class="page--content--row" v-if="transaction">
        <router-link class="action" replace
                     :to="{ name: 'TransactionRules', state: { ruleSetId: transaction.rule_set_id }, meta: { ruleSetId: transaction.rule_set_id } }">
          Regeln <span v-if="transaction.rule_set_id">({{ transaction.rule_set_name }})</span>
        </router-link>
      </div>
      <div class="page--content--row" v-if="error">
        <div class="error">{{ error }}</div>
      </div>
      <div class="page--content--row">
        <div class="row--item row--item--is-centered">
          <Button label="Löschen" severity="danger" @click="deleteTransaction" size="large"/>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
