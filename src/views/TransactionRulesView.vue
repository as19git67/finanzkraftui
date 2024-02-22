<template>
  <h1 class="page-title">Regelset</h1>
  <div class="top-links">
    <router-link class="action" :to="{ name: 'TransactionDetail'}">
      < Zurück
    </router-link>
    <button @click="saveRuleSet" :disabled="!canSave" class="action btn btn--is-primary">Regel speichern</button>
  </div>
  <div v-if="error" class="error">{{ error }}</div>

  <p class="label-buchung">Buchung</p>
  <table class="transaction-details-table">
    <tbody>
    <tr class="transaction-details">
      <td class="transaction-text">
        <div class="transaction-data">
          <div class="td-text-item">
            {{
              transaction.payee ? transaction.payee : transaction.textShortened ? transaction.textShortened : transaction.entryText
            }}
          </div>
          <div class="td-text-item item--is-category">{{ transaction.categoryName }}</div>
          <div class="td-text-item item--is-text" :title="transaction.payee ? transaction.textShortened : ''">
            {{ transaction.payee ? transaction.textShortened : '' }}
          </div>
          <div class="td-text-item item--is-notes">{{ transaction.t_notes }}</div>
        </div>
      </td>
      <td class="transaction-amount"><span v-if="transaction.currencyId">
          {{
          `${new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: transaction.currencyId
          }).format(transaction.amount)}`
        }}
        </span></td>
    </tr>
    </tbody>
  </table>

  <p class="label-ruleset">Regel</p>
  <div class="form form--is-column">
    <div class="form-component">
      <label for="ruleSetName">Name:</label>
      <input type="text" v-model="ruleSet.name" placeholder="Name Regelset" id="ruleSetName">
    </div>
    <div v-if="matchingTransactions.length > 0" class="form-component">
      <label>Betrag:</label>
    </div>
    <div v-if="matchingTransactions.length > 0" class="form-component">
      <input type="checkbox" v-model="useMinAmount">
      <label for="minAmount">kleinster:</label>
      <input type="text" v-model="minAmount" placeholder="kleinster Betrag" id="minAmount">
      {{ transaction.currencyShort }}
    </div>
    <div v-if="matchingTransactions.length > 0" class="form-component">
      <input type="checkbox" v-model="useMaxAmount">
      <label for="maxAmountInput">größter:</label>
      <input type="text" v-model="maxAmount" placeholder="größter Betrag" id="maxAmountInput">
      {{ transaction.currencyShort }}
    </div>
  </div>
  <p class="label-token">Wähle eine Kategorie</p>
  <div class="form-component">
    <input type="search" autofocus v-model="categorySearch" placeholder="Kategorie suchen">
  </div>

  <table>
    <tbody>
    <tr v-for="(item) in filteredCategories" :key="item.id">
      <td class="text-h-center"><input type="radio" v-model="selectedCategory" :value="item.id" name="ruleCategory">
      </td>
      <td>{{ item.full_name }}</td>
    </tr>
    </tbody>
  </table>

  <p class="label-token">Textabschnitte vom Verwendungszweck - markiere diejenigen, die Teil der Regel sein sollen</p>
  <table>
    <tbody>
    <tr v-for="(item) in textToken" :key="item.text">
      <td class="text-h-center"><input type="checkbox" v-model="item.selected" @change="tokenSelected(item.text)"></td>
      <td>{{ item.text }}</td>
    </tr>
    </tbody>
  </table>

  <p class="label-matching-transactions">{{ matchingTransactions.length }} Buchungen, die mit den ausgewählten
    Textabschnitten gefunden werden:</p>
  <table class="all-transactions-table" v-if="matchingTransactionsByDate.length">
    <tbody>
    <template v-for="(trOfDate) in matchingTransactionsByDate" :key="trOfDate">
      <tr class="transaction-date">
        <td>{{ DateTime.fromISO(trOfDate.valueDate).toLocaleString() }}</td>
      </tr>
      <tr>
        <td>
          <table class="transaction-details-table">
            <tbody>
            <tr v-for="(item, index) in trOfDate.transactions" :key="item" class="transaction-details"
                :class="{'alternate-row-background': index % 2 }">
              <td class="transaction-text">
                <div class="transaction-data">
                  <div class="td-text-item">
                    {{ item.payee ? item.payee : item.textShortened ? item.textShortened : item.entryText }}
                  </div>
                  <div class="td-text-item item--is-category">{{ item.categoryName }}</div>
                  <div class="td-text-item item--is-text">{{ item.payee ? item.textShortened : '' }}</div>
                  <div class="td-text-item item--is-notes">{{ item.notes }}</div>
                </div>
              </td>
              <td class="transaction-amount">
                {{
                  `${new Intl.NumberFormat(undefined, {
                    style: 'currency',
                    currency: item.currencyId
                  }).format(item.amount)}`
                }}
              </td>
            </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </template>
    </tbody>
  </table>
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
import {MasterDataStore} from "@/stores/masterdata";

export default {
  name: "TransactionRulesView",
  components: {},
  data() {
    return {
      textToken: this.textToken,
      matchingTransactions: this.matchingTransactions,
      ruleSet: this.ruleSet,
      filteredCategories: this.filteredCategories,
      selectedCategory: this.selectedCategory,
      transaction: this.transaction,
      matchingTransactionsByDate: this.matchingTransactionsByDate,
      minAmount: this.minAmount,
      maxAmount: this.maxAmount,
      useMinAmount: this.useMinAmount,
      useMaxAmount: this.useMaxAmount,
      error: this.error,
      categorySearch: this.categorySearch,
    };
  },
  watch: {
    categorySearch: function (val, oldVal) {
      const searchTerm = val.trim().toLowerCase();
      this.filteredCategories = this.unfilteredCategories
      .filter((category) => {
        const lowerCaseCategory = category.full_name.toLowerCase();
        return category.selected || (searchTerm && lowerCaseCategory.indexOf(searchTerm) >= 0);
      });
    },
  },
  computed: {
    canSave() {
      return this.ruleSet.name && this.selectedCategory;
    },
    ...mapStores(UserStore),
    ...mapState(UserStore, ["authenticated"]),
    ...mapState(MasterDataStore, ["categories"]),
  },
  methods: {
    ...mapActions(MasterDataStore, [ "getCategories" ]),
    ...mapActions(TransactionStore, [ "getTransaction", "getMatchingTransactions", "setRules" ]),
    saveRuleSet() {
      if (this.ruleSet.name) {
        const ruleInfo = {
          name: this.ruleSet.name,
          idSetCategory: this.selectedCategory,
          textRules: this._getSelectedTextToken(),
        };
        this.setRules(ruleInfo).then(resultData => {
          let mustAuthenticate = false;
          let not_ok = false;
          let status = resultData.status;
          switch (status) {
            case 401:
              mustAuthenticate = true;
              break;
            case 200:
              break;
            default:
              not_ok = true;
          }
          if (mustAuthenticate) {
            this.error = 'Keine Berechtigung';
            return;
          }
          if (not_ok) {
            this.error = resultData.message;
            return;
          }
          router.back();
        }).catch(reason => {
          this.error = reason.message;
        })
      }
    },
    tokenSelected() {
      this._runRules();
    },
    _getSelectedTextToken() {
      const textRules = [];
      Object.keys(this.textToken).forEach(text => {
        if (this.textToken[text].selected) {
          textRules.push(text);
        }
      });
      return textRules;
    },
    async _setMatchingTransactionsForTextToken(selectedTextToken) {
      this.matchingTransactions = [];
      if (selectedTextToken.length > 0) {
        this.loading = true;
        const resultData = await this.getMatchingTransactions({maxItems: 15, textToken: selectedTextToken});
        this.loading = false;
        let mustAuthenticate = false;
        let not_ok = false;
        let status = resultData.status;
        switch (status) {
          case 401:
            mustAuthenticate = true;
            break;
          case 200:
            break;
          default:
            not_ok = true;
        }
        if (mustAuthenticate) {
          router.replace("/login");
          return;
        }
        if (not_ok) {
          this.error = resultData.message;
          return;
        }

        this.matchingTransactions = resultData.data.transactions;
        this.matchingTransactionsByDate = this._buildTransactionsPerDate(this.matchingTransactions);
      }


      // if (selectedTextToken.length > 0) {
      //   this.transactions.forEach(transaction => {
      //     let matchingTextRules = 0;
      //     if (transaction.text) {
      //       selectedTextToken.forEach(text => {
      //         if (transaction.text && transaction.text.indexOf(text) >= 0) {
      //           matchingTextRules++;
      //         }
      //       });
      //     }
      //     const hitRateInPercent = matchingTextRules / selectedTextToken.length;
      //     if (hitRateInPercent === 1.0) {
      //       this.matchingTransactions.push(transaction);
      //     }
      //   });
      // }
    },
    async _runRules() {
      const selectedTextToken = this._getSelectedTextToken();
      await this._setMatchingTransactionsForTextToken(selectedTextToken);
      if (!this.manuallyChangedMinMaxAmount) {
        this.minAmount = Number.MAX_VALUE;
        this.maxAmount = -Number.MAX_VALUE;
        this.matchingTransactions.forEach(t => {
          const amount = t.amount;
          if (amount < this.minAmount) {
            this.minAmount = amount;
          }
          if (amount > this.maxAmount) {
            this.maxAmount = amount;
          }
        });
        this.minAmount = this._decimalFormatter.format(this.minAmount);
        this.maxAmount = this._decimalFormatter.format(this.maxAmount);
      }
    },
    _buildTransactionsPerDate(transactions) {
      const transactionsOfDate = {};
      transactions.forEach((t) => {
        const tDate = t.valueDate;
        if (transactionsOfDate[tDate] === undefined) {
          transactionsOfDate[tDate] = [];
        }
        transactionsOfDate[tDate].push(t);
      });
      const transactionDatesSorted = Object.keys(transactionsOfDate).toSorted((a, b) => {
        const aDate = DateTime.fromISO(a);
        const bDate = DateTime.fromISO(b);
        if (aDate > bDate) return -1;
        if (bDate < aDate) return 1;
        return 0;
      });
      const transactionsByDate = transactionDatesSorted.map((tDate) => {
        return {
          valueDate: tDate,
          transactions: transactionsOfDate[tDate].toSorted((a, b) => {
            return b.id - a.id;
          }),
        }
      });
      return transactionsByDate;
    },
  },
  created() {
    this._decimalFormatter = new Intl.NumberFormat(undefined, {style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2});
    this.transaction = {};
    this.ruleSet = {name: ''};
    this.textToken = {};
    this.matchingTransactions = [];
    this.matchingTransactionsByDate = [];
    this.manuallyChangedMinMaxAmount = false;
    this.minAmount = 0;
    this.maxAmount = 0;
    this.useMinAmount = true;
    this.useMaxAmount = true;
    this.filteredCategories = [];
    this.unfilteredCategories = [];
  },
  async mounted() {
    this.error = undefined;
    this.loading = true;

    if (!this.transactionId) {
      router.replace("/");
      return;
    }

    const promises = [];
    promises.push(this.getTransaction(this.transactionId));
    promises.push(this.getCategories());
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
          this.error = result.message;
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
      if (!this.error) {
        this.error = "Unspezifischer Fehler beim Holen der Buchungsdaten vom Server";
      }
      return;
    }

    this.transaction = {...(results[0].data)};
    this.unfilteredCategories = this.categories.map(category => {
      const c = {...category};
      c.selected = false;
      return c;
    });

    if (!this.ruleSet.name && this.transaction.payee) {
      this.ruleSet.name = this.transaction.payee;
    }

    this.textToken = {};
    if (this.transaction.text) {
      this.transaction.text.split(' ').forEach(token => {
        const to = token.trim();
        if (to.length > 1) {
          this.textToken[to] = {
            text: to,
            selected: false,
          };
        }
      });
    }

    this._runRules();

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
.form-component input[type=checkbox] {
  flex: 0 0 auto;
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

.label-buchung,
.label-ruleset,
.label-token,
.label-matching-transactions {
  margin-top: 0.5em;
  margin-bottom: 0.25em;
  font-weight: bold;
  background-color: #1f91a1;
  color: white;
}
</style>
