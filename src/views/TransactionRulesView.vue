<template>
  <div class="page page--has-no-overflow">
    <h1 class="title">Regelset</h1>
    <div class="section">
      <div class="top-links">
        <router-link class="action" :to="{ name: 'TransactionDetail'}">
          < Zurück
        </router-link>
        <button @click="saveRuleSet" :disabled="!canSave" class="action btn btn--is-primary">Regel speichern</button>
      </div>

      <div v-if="error" class="error">{{ error }}</div>

      <div class="label-value in-row" v-if="loadedRuleSet.id">
        <label><input type="checkbox" v-model="includeProcessed">Buchungen aktualisieren</label>
      </div>
      <div class="label-value in-row" v-if="loadedRuleSet.id">
        <button @click="deleteRuleSet" :disabled="!loadedRuleSet.id" class="action btn btn--is-danger">Regel löschen
        </button>
      </div>

      <div class="title">Buchung</div>

      <table class="transaction-details-table">
        <tbody>
        <tr class="transaction-details">
          <td class="transaction-text">
            <div class="transaction-data">
              <div class="td-text-item">
                {{
                  transaction.t_payee ? transaction.t_payee : transaction.textShortened ? transaction.textShortened : transaction.t_entry_ext
                }}
              </div>
              <div class="td-text-item item--is-category">{{ transaction.category_name }}</div>
              <div class="td-text-item item--is-text" :title="transaction.t_payee ? transaction.textShortened : ''">
                {{ transaction.t_payee ? transaction.textShortened : '' }}
              </div>
              <div class="td-text-item item--is-notes">{{ transaction.t_notes }}</div>
            </div>
          </td>
          <td class="transaction-amount"><span v-if="transaction.currency_id">
          {{
              `${new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency: transaction.currency_id
              }).format(transaction.t_amount)}`
            }}
        </span></td>
        </tr>
        </tbody>
      </table>
    </div>

    <div class="section section--is-scrollable">
      <div class="title">Regel</div>
      <div class="label-value in-row">
        <label class="label" for="ruleSetName">Name:</label>
        <input class="value" type="text" v-model="ruleSet.name" placeholder="Name Regelset" id="ruleSetName">
      </div>
      <div class="label-value in-column">
        <div class="label">Betrag:</div>
      </div>
      <div class="label-value in-row">
        <input type="checkbox" v-model="useMinAmount">
        <label class="label" for="minAmount">kleinster:</label>
        <input class="value" type="text" v-model="minAmount" placeholder="kleinster Betrag" id="minAmount">
        {{ transaction.currencyShort }}
      </div>
      <div class="label-value in-row">
        <input type="checkbox" v-model="useMaxAmount">
        <label class="label" for="maxAmountInput">größter:</label>
        <input class="value" type="text" v-model="maxAmount" placeholder="größter Betrag" id="maxAmountInput">
        {{ transaction.currencyShort }}
      </div>
      <div class="title">Wähle eine Kategorie</div>
      <div class="label-value in-row">
        <input class="value" type="search" autofocus v-model="categorySearch" placeholder="Kategorie suchen">
      </div>

      <table>
        <tbody>
        <tr v-for="(item) in filteredCategories" :key="item.id">
          <td class="text-h-center"><label><input class="selectionInput" type="radio" v-model="selectedCategory"
                                                  :value="item.id" :checked="item.selected"
                                                  name="ruleCategory">{{ item.full_name }}</label>
          </td>
        </tr>
        </tbody>
      </table>

      <div class="title">Textabschnitte vom Verwendungszweck - markiere diejenigen, die Teil der Regel sein sollen
      </div>
      <table>
        <tbody>
        <tr v-for="(item) in textToken" :key="item.text">
          <td class="text-h-center"><label><input class="selectionInput" type="checkbox" v-model="item.selected"
                                                  @change="tokenSelected(item.text)">{{ item.text }}</label></td>
        </tr>
        </tbody>
      </table>

      <div class="title">
        {{ `${matchingTransactions.length} Buchungen, die mit den ausgewählten Textabschnitten gefunden werden:` }}
      </div>
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
                <tr v-for="(item, index) in trOfDate.transactions" :key="item.t_id" class="transaction-details"
                    :class="{'alternate-row-background': index % 2 }">
                  <td class="transaction-text">
                    <div class="transaction-data">
                      <div class="td-text-item">
                        {{ item.t_payee ? item.t_payee : item.textShortened ? item.textShortened : item.t_entry_text }}
                      </div>
                      <div class="td-text-item item--is-category">{{ item.category_name }}</div>
                      <div class="td-text-item item--is-text">{{ item.t_payee ? item.textShortened : '' }}</div>
                      <div class="td-text-item item--is-notes">{{ item.t_notes }}</div>
                    </div>
                  </td>
                  <td class="transaction-amount">
                    {{
                      `${new Intl.NumberFormat(undefined, {
                        style: 'currency',
                        currency: item.currency_id,
                      }).format(item.t_amount)}`
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
    </div>
  </div>
</template>

<script setup>
import IconEdit from "@/components/icons/IconEdit.vue";
import IconEyes from "@/components/icons/IconEyes.vue";

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
  name: "TransactionRulesView",
  components: {},
  data() {
    return {
      textToken: this.textToken,
      matchingTransactions: this.matchingTransactions,
      ruleSet: this.ruleSet,
      categorySearch: this.categorySearch,
      filteredCategories: this.filteredCategories,
      selectedCategory: this.selectedCategory,
      transaction: this.transaction,
      matchingTransactionsByDate: this.matchingTransactionsByDate,
      minAmount: this.minAmount,
      maxAmount: this.maxAmount,
      useMinAmount: this.useMinAmount,
      useMaxAmount: this.useMaxAmount,
      error: this.error,
      includeProcessed: this.includeProcessed,
      loadedRuleSet: this.loadedRuleSet,
    };
  },
  watch: {
    categorySearch: function (val, oldVal) {
      if (_.isString(val)) {
        const searchTerm = val.trim().toLowerCase();
        this._filterCategories(searchTerm);
      }
    },
  },
  computed: {
    canSave() {
      if (!this.ruleSet.name) {
        return false;
      }
      if (!this.selectedCategory) {
        return false;
      }
      if (this.loadedRuleSet) {
        if (this.includeProcessed) {
          return true;
        }
        if (this.ruleSet.name && this.ruleSet.name !== this.loadedRuleSet.name) {
          return true;
        }
        if (this.selectedCategory && this.selectedCategory !== this.loadedRuleSet.idSetCategory) {
          return true;
        }
        const textToken = this._getSelectedTextToken();
        const textTokenHash = textToken.toSorted().join(',');
        if (this.loadedTextTokenHash && textTokenHash !== this.loadedTextTokenHash) {
          return true;
        }
        return false;
      }
      return true;
    },
    ...mapStores(UserStore),
    ...mapState(UserStore, ["authenticated"]),
    ...mapState(MasterDataStore, ["categories"]),
  },
  methods: {
    ...mapActions(MasterDataStore, ["getCategories"]),
    ...mapActions(TransactionStore, ["getTransaction", "getMatchingTransactions", "getRuleSet", "setRules", "deleteRules"]),
    _filterCategories: function (searchTerm) {
      this.filteredCategories = this.unfilteredCategories
          .filter((category) => {
            const lowerCaseCategory = category.full_name.toLowerCase();
            return category.selected || (searchTerm && lowerCaseCategory.indexOf(searchTerm) >= 0);
          });
    },
    deleteRuleSet() {
      if (!this.loadedRuleSet.id) {
        return;
      }
      this.deleteRules(this.loadedRuleSet.id).then(resultData => {
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

    },
    saveRuleSet() {
      const name = this.ruleSet.name.trim();
      if (name) {
        const ruleInfo = {
          name: name,
          idSetCategory: this.selectedCategory,
          textRules: this._getSelectedTextToken(),
        };
        if (this.loadedRuleSet.id) {
          ruleInfo.id = this.loadedRuleSet.id;
        }
        this.setRules(ruleInfo, this.includeProcessed).then(resultData => {
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
        if (this.matchingTransactions.length > 0) {
          this.minAmount = Number.MAX_VALUE;
          this.maxAmount = -Number.MAX_VALUE;
          this.matchingTransactions.forEach(t => {
            const amount = t.t_amount;
            if (amount < this.minAmount) {
              this.minAmount = amount;
            }
            if (amount > this.maxAmount) {
              this.maxAmount = amount;
            }
          });
          this.minAmount = this._decimalFormatter.format(this.minAmount);
          this.maxAmount = this._decimalFormatter.format(this.maxAmount);
        } else {
          this.minAmount = '';
          this.maxAmount = '';
        }
      }
    },
    _buildTransactionsPerDate(transactions) {
      const transactionsOfDate = {};
      transactions.forEach((t) => {
        const tDate = t.t_value_date;
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
            return b.t_id - a.t_id;
          }),
        }
      });
      return transactionsByDate;
    },
  },
  created() {
    this._decimalFormatter = new Intl.NumberFormat(undefined, {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
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
    this.ruleSetId = 0;
    this.loadedRuleSet = {};
    this.loadedTextTokenHash = '';
    this.includeProcessed = false;
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
    if (router.options.history.state.ruleSetId) {
      this.ruleSetId = router.options.history.state.ruleSetId;
      promises.push(this.getRuleSet(this.ruleSetId));
    }
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

    const xxRuleSet = {
      "id": 9,
      "name": "O2 Mobilfunk",
      "set_note": null,
      "idSetCategory": 226,
      "textRules": [
        {
          "idRuleSet": 9,
          "text": "97374111,"
        },
        {
          "idRuleSet": 9,
          "text": "T0010002B000000097374111"
        },
        {
          "idRuleSet": 9,
          "text": "TARIFRECHNUNG"
        }
      ],
      "accountRules": []
    };
    if (this.ruleSetId && results[2].data.length > 0) {
      this.loadedRuleSet = results[2].data[0];
    } else {
      this.loadedRuleSet = {
        textRules: [],
        accountRules: [],
      }
    }

    this.transaction = {...(results[0].data)};

    this.unfilteredCategories = this.categories.map(category => {
      const c = {...category};
      c.selected = (this.loadedRuleSet.idSetCategory === c.id);
      return c;
    });
    if (this.loadedRuleSet.idSetCategory) {
      this.selectedCategory = this.loadedRuleSet.idSetCategory;
      this._filterCategories();
    }

    this.ruleSet.name = this.loadedRuleSet.name;
    if (!this.ruleSet.name && this.transaction.t_payee) {
      this.ruleSet.name = this.transaction.t_payee;
    }

    this.textToken = {};
    const tokenList = [];
    this.loadedRuleSet.textRules.forEach(savedToken => {
      this.textToken[savedToken.text] = {
        text: savedToken.text,
        selected: true,
      };
      tokenList.push(savedToken.text);
    });
    this.loadedTextTokenHash = tokenList.toSorted().join(',');
    if (this.transaction.t_text) {
      this.transaction.t_text.split(' ').forEach(token => {
        const to = token.trim();
        if (to.length > 1 && !this.textToken[to]) {
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
label > .selectionInput {
  margin-right: 0.5em;
}
</style>
