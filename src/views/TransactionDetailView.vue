<template>
  <div class="page">
    <div class="section">
      <div class="top-links">
        <a v-if="!dirty" class="action" @click="router.back">
          < Zurück
        </a>
        <button v-if="dirty" @click="cancelChanges" class="action btn btn--is-secondary">Abbrechen
        </button>
        <button :disabled="!dirty" @click="saveTransaction" class="action btn btn--is-primary">
          Speichern
        </button>
      </div>
    </div>

    <div v-if="error" class="section">
      <div class="error">{{ error }}</div>
    </div>

    <div class="section">
      <div v-if="transaction" class="label-value in-row">
        <div v-if="editName" class="value">
          <input class="detail-value" type="text" v-model="transactionPayee" placeholder="Name">
          <button @click="switchOffEditName" class="btn-icon-only" aria-label="Edit">
            <IconTick/>
          </button>
        </div>
        <div class="value" v-else>
          {{ transactionPayee ? transactionPayee : transaction.t_entry_text }}
          <button v-if="!transaction.t_entry_text" @click="switchToEditName" class="btn-icon-only"
                  aria-label="Edit">
            <IconEdit/>
          </button>
        </div>
        <button v-if="transaction.confirmed" class="btn-icon-only" aria-label="markiere ungesehen"
                @click="markUnconfirmed()">
          <IconEyeOK class="icon-seen"/>
        </button>
      </div>
    </div>
    <div class="section">
      <div class="label-value in-row">
        <span v-if="transaction.category_name">{{ transaction.category_name }}</span>
        <span v-if="!transaction.category_name">Kategorie wählen</span>
          <button class="btn-icon-only" aria-label="Kategorie auswählen" @click="selectCategory">
            <IconEdit/>
          </button>
      </div>
      <div class="label-value in-column">
        <div class="label">Notiz:</div>
        <textarea class="value" v-model="transactionNotes"></textarea>
      </div>
      <div v-if="transaction.t_text" class="label-value in-column">
        <div class="label">Text:</div>
        <div class="value">{{ transaction.t_text }}</div>
      </div>
      <div v-if="transaction.currency_id" class="label-value in-row">
        <div class="label">Betrag:</div>
        <div class="value">{{
            `${new Intl.NumberFormat(undefined, {
              style: 'currency',
              currency: transaction.currency_id
            }).format(transaction.t_amount)}`
          }}
        </div>
      </div>
      <div v-if="transaction.t_value_date" class="label-value in-row">
        <div class="label">Datum:</div>
        <div class="value">
          {{ DateTime.fromISO(transaction.t_value_date).toLocaleString(DateTime.DATE_HUGE) }}
        </div>
      </div>
      <div v-if="amazonOrderId" class="label-value in-row">
        <div class="label">Amazon Bestellung:</div>
        <a class="value" target="_blank"
           :href="`https://www.amazon.de/gp/your-account/order-details?ie=UTF8&orderID=${amazonOrderId}`">{{
            amazonOrderId
          }}</a>
      </div>
      <div class="label-value in-row">
        <div class="label">Konto:</div>
        <div class="value">{{ transaction.account_name }}</div>
      </div>
      <div v-if="transaction.t_payeePayerAcctNo" class="label-value in-row">
        <div class="label">Zahlungsempfänger:</div>
        <div class="value">{{ transaction.t_payeePayerAcctNo }}</div>
      </div>
      <div v-if="transaction.t_EREF" class="label-value in-row">
        <div class="label">EREF:</div>
        <div class="value">{{ transaction.t_EREF }}</div>
      </div>
      <div v-if="transaction.t_CRED" class="label-value in-row">
        <div class="label">Gläubiger:</div>
        <div class="value">{{ transaction.t_CRED }}</div>
      </div>
      <div v-if="transaction.t_MREF" class="label-value in-row">
        <div class="label">Mandatsreferenz:</div>
        <div class="value">{{ transaction.t_MREF }}</div>
      </div>
      <div class="label-value in-row">
        <div class="label">Buchungsart:</div>
        <div class="value">{{
            transaction.t_entry_text ? transaction.t_entry_text : 'Nicht angegeben'
          }}
        </div>
      </div>
    </div>
    <div class="section">
      <div v-if="transaction" class="detail-links">
        <router-link class="action" replace :to="{ path:'/', name: 'home'}">
          Tags bearbeiten
        </router-link>
      </div>
      <div v-if="transaction" class="detail-links">
        <router-link class="action" replace
                     :to="{ name: 'TransactionRules', state: { ruleSetId: transaction.rule_set_id }, meta: { ruleSetId: transaction.rule_set_id } }">
          Regeln <span v-if="transaction.rule_set_id">({{ transaction.rule_set_name }})</span>
        </router-link>
      </div>
    </div>
    <div class="section">
      <div class="detail-links">
      </div>
    </div>
  </div>
  <div v-if="showConfirmDialog" class="confirm">
    <div class="confirm-backdrop"></div>
    <div class="dialog confirm-dialog confirm--yes-no">
      <span class="confirm-text">{{ confirmText }}</span>
      <div class="btn-group">
        <button class="btn btn-confirm" @click="confirmDialogButtonClicked('yes')">Ja</button>
        <button class="btn btn-confirm btn--is-primary" v-focus
                @click="confirmDialogButtonClicked('no')">Nein
        </button>
      </div>
    </div>
  </div>
  <div class="dialog-from-side" :class="{ 'dialog-slided' : showCategorySelectionDialog }">
    <CategorySelectionView show-transaction="true" :category-preselection="categoryPreselection" @close="categorySelectionDialogButtonClicked"/>
  </div>
</template>


<script setup>
import IconEdit from "@/components/icons/IconEdit.vue";
import IconTick from "@/components/icons/IconTick.vue";
import IconEyeOK from "@/components/icons/IconEyeOK.vue";
import CategorySelectionView from "@/views/CategorySelectionView.vue";

defineProps({
  transactionId: {type: String},
});
</script>

<script>
import {mapActions, mapState, mapStores} from "pinia";
import {UserStore} from "@/stores/user";
import router from "@/router";
import _ from "lodash";
import {DateTime} from "luxon";
import {TransactionStore} from "@/stores/transactions";
import {MasterDataStore} from "@/stores/masterdata";

export default {
  name: "TransactionDetailView",
  components: {},
  data() {
    return {
      transactionNotes: this.transactionNotes,
      transactionPayee: this.transactionPayee,
      categoryId: this.categoryId,
      transaction: this.transaction,
      error: this.error,
      updateData: this.updateData,
      showConfirmDialog: false,
      showCategorySelectionDialog: false,
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
    async handleDataChanged() {
      this.error = undefined;
      this.updateData.id = this.transactionId;
      if (this.updateData.category_id !== undefined) {
        // update also the category_name, but it is only used in the transactions list and is
        // not really being updated, because it is retrieved via joining Fk_Category
        this.updateData.category_name = this.getCategoryById(this.updateData.category_id).full_name;
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
    this.categoryId = 0;
  },
  async mounted() {
    this.error = undefined;
    this.loading = true;

    // cancel the debounced dataChanged function in case of leaving before save
    /*
        router.beforeEach(async (to, from, next) => {
          if (from.name === 'TransactionDetail') {
            if (to.name === 'home') {
              const keyCount = Object.keys(this.updateData).length;
              if (keyCount === 1 && this.updateData.confirmed) {
                this.dataChanged.cancel();
              } else {
                this.dataChanged();
                this.dataChanged.flush();
              }
            }
          }
          next();
        });
    */

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

    this.categoryId = this.transaction.category_id;
    this.transactionNotes = this.transaction.t_notes;
    this.transactionPayee = this.transaction.t_payee;
    if (!this.transaction.t_payee && !this.transaction.t_entry_text) {
      this.editName = true;
    }
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

<style scoped>
.action.action--is-disabled {
  color: var(--as-color-complement-5);
}

.transaction-details {
  display: flex;
  flex-direction: column;
  flex: 1 1 100%;
  width: 100%;
  align-items: flex-start;
  margin-top: 0.5em;
}

.transaction-details.details {
  display: flex;
  width: 100%;
}

.transaction-details.title {
  display: flex;
  flex-direction: column;
  font-size: 16px;
  font-weight: bold;
}

.transaction-details.payee {
  display: flex;
  flex-direction: row;
  font-size: 16px;
  font-weight: bold;
  align-items: center;
  word-wrap: anywhere;
}

.transaction-details .detail-wrapper {
  display: flex;
  flex: 1 1 auto;
}

.transaction-details .detail-value {
  flex: 1 1 auto;
  display: flex;
  flex-direction: row;
  align-items: center;
}

.transaction-details.category {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.transaction-details.details-row {
  flex-direction: row;
  align-content: space-between;
  column-gap: 1em;
}

.transaction-details.details-column {
  flex-direction: column;
}

.transaction-details.details-column > .details-row-left {
  justify-content: flex-start;
  font-weight: bold;
}

.transaction-details.details-column > .details-row-right {
  justify-content: flex-start;
}

.transaction-details.details-column > .details-row-right.transaction-details-text {
  white-space: normal;
  text-align: start;
}

.transaction-details.details-column > textarea {
  display: flex;
  width: 100%;
}

.transaction-details.details-row.details-row-single-column {
  flex-direction: column;
}

.transaction-details.details-row > div {
  display: block;
  overflow-x: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.transaction-details.details-row > .details-row-left {
  justify-content: flex-start;
  flex: 1 0 4em;
  font-weight: bold;
}

.transaction-details.details-row > .details-row-right {
  justify-content: flex-end;
}

.transaction-details.details-row > .details-row-right.transaction-details-text {
  white-space: normal;
  text-align: end;
}
</style>
