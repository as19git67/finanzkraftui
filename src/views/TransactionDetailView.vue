<template>
  <div v-if="error" class="error">{{ error }}</div>
  <div v-else>
    <div class="top-links">
    <router-link class="action" :to="{ path:'/', name: 'home'}">
      < Zurück
    </router-link>
    <router-link class="action" :to="{ path:'/', name: 'home'}">
      Bearbeiten
    </router-link>
    </div>

    <div v-if="transaction" class="transaction-details all">
      <div class="transaction-details title">
        <div class="transaction-details payee">
          {{transaction.t_payee}}
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
          <div class="details-row-left">Betrag</div>
          <div class="details-row-right">{{`${new Intl.NumberFormat(undefined, {style: 'currency', currency: transaction.currency_id}).format(transaction.t_amount)}`}}</div>
        </div>
        <div v-if="transaction.t_value_date" class="transaction-details details-row">
          <div class="details-row-left">Datum</div>
          <div class="details-row-right">{{ DateTime.fromISO(transaction.t_value_date).toLocaleString(DateTime.DATE_HUGE) }}</div>
        </div>
        <div v-if="transaction.t_text" class="transaction-details details-row">
          <div class="details-row-left">Text</div>
          <div class="details-row-right">{{ transaction.t_text }}</div>
        </div>
        <div class="transaction-details details-row details-row-single-column">
          <div class="">Notiz</div>
          <textarea></textarea>
        </div>
        <div v-if="transaction" class="transaction-details details-row detail-links">
          <router-link class="action" :to="{ path:'/', name: 'home'}">
            Tags bearbeiten
          </router-link>
        </div>
        <div v-if="transaction" class="transaction-details details-row detail-links">
          <router-link class="action" :to="{ path:'/', name: 'home'}">
            Regeln
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
      actionError: this.actionError
    };
  },
  watch: {
  },
  computed: {
    ...mapStores(UserStore),
    ...mapState(UserStore, ["authenticated"]),
  },
  methods: {
    ...mapActions(TransactionStore, [ "getTransaction", "updateTransaction" ]),
  },
  created() {
    this.transaction = {};
  },
  async mounted() {
    this.error = undefined;
    this.actionError = undefined;
    this.loading = true;

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

.transaction-details {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
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
  flex-direction: column;
  font-size: 16px;
  font-weight: bold;
}

.transaction-details.category {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.transaction-details.details-row {
  display: flex;
  flex-direction: row;
  align-content: space-between;
  flex: 1 1 100%;
  width: 100%;
  column-gap: 1em;
  margin-top: 0.5em;
}

.transaction-details.details-row.details-row-single-column {
  flex-direction: column;
}

.transaction-details.details-row > div {
  display: flex;
  flex: 1 1 auto;
}

.transaction-details.details-row > .details-row-left {
  justify-content: flex-start;
  flex: 0 1 4em;
}

.transaction-details.details-row > .details-row-right {
  justify-content: flex-end;
}

.transaction-details.details-row > textarea {
  display: flex;
  width: 100%;
}
</style>
