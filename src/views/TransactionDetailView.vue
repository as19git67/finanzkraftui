<template>
  <div v-if="error" class="error">{{ error }}</div>
  <div v-else>
    <div class="top-links">
      <button v-if="!dirty" @click="goToTransactionList" class="action btn btn--is-secondary">Zurück</button>
      <button v-if="dirty" @click="cancelChanges" class="action btn btn--is-secondary">Abbrechen</button>
      <button :disabled="!dirty" @click="saveTransaction" class="action btn btn--is-primary">Speichern</button>
    </div>

    <div v-if="transaction" class="transaction-details all">
      <div class="transaction-details title">
        <div class="transaction-details payee">
          <div>
            {{transaction.t_payee ? transaction.t_payee : transaction.t_entry_text}}
          </div>
          <button v-if="transaction.confirmed" class="btn-icon-only" aria-label="Markiere ungesehen" @click="markUnconfirmed()">
            <IconEyes class="icon-seen"/>
          </button>
        </div>
        <div v-if="transaction.category_name" class="transaction-details category">
          <span>{{transaction.category_name}}</span>
          <router-link class="action" :to="{ path:'/', name: 'home'}">
            <button class="btn-icon-only" aria-label="Edit"><IconEdit/></button>
          </router-link>
        </div>
      </div>
      <div v-if="transaction.currency_id" class="transaction-details details">
        <div class="transaction-details details-row">
          <div class="details-row-left">Betrag:</div>
          <div class="details-row-right">{{`${new Intl.NumberFormat(undefined, {style: 'currency', currency: transaction.currency_id}).format(transaction.t_amount)}`}}</div>
        </div>
        <div v-if="transaction.t_value_date" class="transaction-details details-row">
          <div class="details-row-left">Datum:</div>
          <div class="details-row-right">{{ DateTime.fromISO(transaction.t_value_date).toLocaleString(DateTime.DATE_HUGE) }}</div>
        </div>
        <div v-if="transaction.t_text" class="transaction-details details-row">
          <div class="details-row-left">Text:</div>
          <div class="details-row-right transaction-details-text">{{ transaction.t_text }}</div>
        </div>
        <div class="transaction-details details-row details-row-single-column">
          <div class="">Notiz:</div>
          <textarea v-model="transactionNotes"></textarea>
        </div>
        <br>
        <div class="transaction-details details-column">
          <div class="details-row-left">Konto:</div>
          <div class="details-row-right">{{ transaction.account_name }}</div>
        </div>
        <div v-if="transaction.t_payeePayerAcctNo" class="transaction-details details-column">
          <div class="details-row-left">Zahlungsempfänger:</div>
          <div class="details-row-right">{{ transaction.t_payeePayerAcctNo }}</div>
        </div>
        <div class="transaction-details details-column">
          <div class="details-row-left">Buchungsart:</div>
          <div class="details-row-right">{{ transaction.t_entry_text ? transaction.t_entry_text : 'Nicht angegeben' }}</div>
        </div>
        <div v-if="transaction" class="transaction-details details-row detail-links">
          <router-link class="action" :to="{ path:'/', name: 'home'}">
            Tags bearbeiten
          </router-link>
        </div>
        <div v-if="transaction" class="transaction-details details-row detail-links">
          <router-link class="action" :to="{ name: 'TransactionRules', state: { ruleSetId: transaction.rule_set_id }, meta: { ruleSetId: transaction.rule_set_id } }">
            Regeln <span v-if="transaction.rule_set_id">({{transaction.rule_set_name}})</span>
          </router-link>
        </div>
      </div>
      <div class="transaction-details history">

      </div>
    </div>

    <p v-if="actionError" class="error">{{ actionError }}</p>
  </div>
  <div v-if="showConfirmDialog" class="confirm">
    <div class="confirm-backdrop"></div>
    <div class="confirm-dialog confirm--yes-no">
      <span class="confirm-text">{{ confirmText }}</span>
      <div class="btn-group">
        <button class="btn btn-confirm" @click="confirmDialogButtonClicked('yes')">Ja</button>
        <button class="btn btn-confirm btn--is-primary" autofocus @click="confirmDialogButtonClicked('no')">Nein
        </button>
      </div>
    </div>
  </div>
</template>


<script setup>
import IconEdit from "@/components/icons/IconEdit.vue";
import IconEyes from "@/components/icons/IconEyes.vue";

defineProps({
  transactionId: { type: String },
});
</script>

<script>
import { mapActions, mapState, mapStores } from "pinia";
import { UserStore } from "@/stores/user";
import router from "@/router";
import _ from "lodash";
import {DateTime} from "luxon";
import {TransactionStore} from "@/stores/transactions";

export default {
  name: "TransactionDetailView",
  components: {},
  data() {
    return {
      transactionNotes: this.transactionNotes,
      transaction: this.transaction,
      error: this.error,
      actionError: this.actionError,
      updateData: this.updateData,
      showConfirmDialog: false,
      confirmText: '',
    };
  },
  watch: {
    transactionNotes: async function (val, oldVal) {
      if (oldVal === undefined || this.transaction === undefined) {
        return;
      }
      this.updateData.t_notes = val;
      this.transaction.t_notes = val;
    },
  },
  computed: {
    confirmed() {
      return  this.transaction?.confirmed;
    },
    dirty() {
      const keyCount = Object.keys(this.updateData).length;
      if (keyCount === 1 && this.updateData.confirmed) {
        return false;
      }
      return keyCount > 0;
    },
    ...mapStores(UserStore),
    ...mapState(UserStore, ["authenticated"]),
  },
  methods: {
    ...mapActions(TransactionStore, [ "getTransaction", "updateTransaction" ]),
    goToTransactionList() {
      router.replace('/');
    },
    async cancelChanges() {
      this.confirmText = 'Änderungen verwerfen und zurück zur Liste?';
      this.showConfirmDialog = true;
      const res = await new Promise((resolve, reject) => {
        this.dialogResolve = resolve;
      });
      switch(res) {
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
        router.back();
      }
    },
    async handleDataChanged() {
      this.actionError = undefined;
      this.updateData.id = this.transactionId;
      const result = await this.updateTransaction(this.updateData);
      if (result.status === 200) {
        this.transaction = _.extend(this.transaction, this.updateData);
        this.updateData = {};
        return true;
      } else {
        this.actionError = result.message;
        return false;
      }
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
    this.actionError = undefined;
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

    const promises = [];
    promises.push(this.getTransaction(this.transactionId));
    const results = await Promise.all(promises);
    this.loading = false;

    let mustAuthenticate = false;
    let not_ok = false;
    results.forEach((result) => {
      let status = result;
      if (_.isObject(result)) {
        status = result.status;
      }
      switch (status) {
        case 401:
          mustAuthenticate = true;
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
      router.replace("/");
      return;
    }

    this.transaction = {...(results[0].data)};
    this.transactionNotes = this.transaction.t_notes;
    if (!this.transaction.confirmed) {
      this.transaction.confirmed = true;
      this.updateData.confirmed = true;
      this.dataChanged();
    }
  },
};
</script>

<style scoped>
.confirm {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
}
.confirm .confirm-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  opacity: 0.5;
  background-color: var(--as-color-complement-0);
  z-index: 100;
}
.confirm .confirm-dialog {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--as-color-secondary-1-4);
  display: flex;
  align-items: center;
  justify-items: center;
  padding: 1em;
  z-index: 200;
}
.confirm-dialog.confirm--yes-no {
  flex-direction: column;
}
.confirm-dialog .confirm-text {
  margin-bottom: 1em;
}
.confirm-dialog .btn-group {
  display: flex;
  gap: 1em;
  flex-direction: row;
  width: 100%;
  justify-content: flex-end;
}

.form-component {
  width: 100%;
}
.form-component input {
  flex: 1 1 auto;
}

.top-links {
  display: flex;
  flex-direction: row;
  flex: 1 1 100%;
  margin-bottom: 1em;
  justify-content: space-between;
}

.top-links a {
  font-size: 16px;
  color: var(--as-color-secondary-2-4);
}

.detail-links a {
  font-size: 16px;
  color: var(--as-color-secondary-2-4);
  padding-top: 0.5em;
  padding-bottom: 0.5em;
}

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

.transaction-details.all {
  padding-left: 1em;
  padding-right: 1em;
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

.transaction-details.payee .icon-seen {
  margin-left: 0.5em;
  width: 14px;
  height: 14px;
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

.transaction-details.details-row > textarea {
  display: flex;
  width: 100%;
}
</style>
