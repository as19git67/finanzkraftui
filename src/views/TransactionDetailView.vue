<template>
  <div v-if="error" class="error">{{ error }}</div>
  <div v-else>
    <div class="top-links">
      <router-link class="action" :to="{ path:'/', name: 'home'}" >
        < Zurück
      </router-link>
    <router-link class="action" :to="{ path:'/', name: 'home'}">
      Bearbeiten
    </router-link>
    </div>

    <div v-if="transaction" class="transaction-details all">
      <div class="transaction-details title">
        <div class="transaction-details payee">
          <div>
            {{transaction.payee ? transaction.payee : transaction.entryText}}
          </div>
          <button v-if="transaction.confirmed" class="btn-icon-only" aria-label="Markiere ungesehen" @click="markUnconfirmed()">
            <IconEyes class="icon-seen"/>
          </button>
        </div>
        <div v-if="transaction.categoryName" class="transaction-details category">
          <span>{{transaction.categoryName}}</span>
          <router-link class="action" :to="{ path:'/', name: 'home'}">
            <button class="btn-icon-only" aria-label="Edit"><IconEdit/></button>
          </router-link>
        </div>
      </div>
      <div v-if="transaction.currencyId" class="transaction-details details">
        <div class="transaction-details details-row">
          <div class="details-row-left">Betrag:</div>
          <div class="details-row-right">{{`${new Intl.NumberFormat(undefined, {style: 'currency', currency: transaction.currencyId}).format(transaction.amount)}`}}</div>
        </div>
        <div v-if="transaction.valueDate" class="transaction-details details-row">
          <div class="details-row-left">Datum:</div>
          <div class="details-row-right">{{ DateTime.fromISO(transaction.valueDate).toLocaleString(DateTime.DATE_HUGE) }}</div>
        </div>
        <div v-if="transaction.text" class="transaction-details details-row">
          <div class="details-row-left">Text:</div>
          <div class="details-row-right transaction-details-text">{{ transaction.text }}</div>
        </div>
        <div class="transaction-details details-row details-row-single-column">
          <div class="">Notiz:</div>
          <textarea v-model="transaction.notes"></textarea>
        </div>
        <br>
        <div class="transaction-details details-column">
          <div class="details-row-left">Konto:</div>
          <div class="details-row-right">{{ transaction.accountName }}</div>
        </div>
        <div v-if="transaction.t_payeePayerAcctNo" class="transaction-details details-column">
          <div class="details-row-left">Zahlungsempfänger:</div>
          <div class="details-row-right">{{ transaction.payeePayerAcctNo }}</div>
        </div>
        <div class="transaction-details details-column">
          <div class="details-row-left">Buchungsart:</div>
          <div class="details-row-right">{{ transaction.entryText ? transaction.entryText : 'Nicht angegeben' }}</div>
        </div>
        <div v-if="transaction" class="transaction-details details-row detail-links">
          <router-link class="action" :to="{ path:'/', name: 'home'}">
            Tags bearbeiten
          </router-link>
        </div>
        <div v-if="transaction" class="transaction-details details-row detail-links">
          <router-link class="action" :to="{ name: 'TransactionRules', state: { ruleSetId: transaction.ruleSetId }, meta: { ruleSetId: transaction.ruleSetId } }">
            Regeln <span v-if="transaction.ruleSetId">({{transaction.ruleSetName}})</span>
          </router-link>
        </div>
      </div>
      <div class="transaction-details history">

      </div>
    </div>

    <p v-if="actionError" class="error">{{ actionError }}</p>
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
      transaction: this.transaction,
      error: this.error,
      actionError: this.actionError,
      updateData: this.updateData,
    };
  },
  watch: {
    notes: async function (val, oldVal) {
      if (oldVal === undefined || this.transaction === undefined) {
        return;
      }
      this.updateData.t_notes = val;
      this.updateData.confirmed = true;
      this.dataChanged();
    },
  },
  computed: {
    notes() {
      return  this.transaction?.t_notes;
    },
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
    async handleDataChanged() {
      this.actionError = undefined;
      this.updateData.id = this.transactionId;
      const result = await this.updateTransaction(this.updateData);
      if (result.status === 200) {
        this.transaction = _.extend(this.transaction, this.updateData);
        this.updateData = {};
      } else {
        this.actionError = result.message;
      }
    },
    markUnconfirmed() {
      this.updateData.confirmed = false;
      this.dataChanged();
      this.dataChanged.flush();
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
    if (!this.updateData.confirmed) {
      this.updateData.confirmed = true;
      this.dataChanged();
    }
  },
};
</script>

<style scoped>
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
