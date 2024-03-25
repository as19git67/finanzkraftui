<template>
  <div class="page page--has-no-overflow">
    <h1 class="title">Regelset</h1>
    <div class="section">
      <div class="top-links">
        <router-link class="action" replace :to="{ name: 'TransactionDetail'}">
          < Zurück
        </router-link>
        <button @click="saveRuleSet" :disabled="!canSave" class="action btn btn--is-primary">Regel speichern</button>
      </div>
      <div class="top-links">
        <button v-if="loadedRuleSet.id" @click="deleteRuleSetWithConfirmation" :disabled="!loadedRuleSet.id"
                class="action btn btn--is-danger">Regel löschen
        </button>
        <label v-if="loadedRuleSet.id"
               title="Wenn ausgewählt, werden Buchungen, die bereits durch eine Regel bearbeitet wurden, nochmals durch die aktualisierte Regel bearbeitet"><input
            type="checkbox" v-model="includeProcessed">Buchungen aktualisieren</label>
      </div>


      <div class="title">Regel</div>
      <div class="label-value in-row">
        <label class="label" for="ruleSetName">Name:</label>
        <input class="value" type="text" v-model="ruleSet.name" placeholder="Name Regelset" id="ruleSetName">
      </div>
      <div class="label-value in-column">
        <div class="label">Kategorie:</div>
        <div class="value">
          <span>{{ selectedCategoryName }}</span>
          <button class="btn-icon-only" aria-label="Kategorie auswählen" @click="selectCategory">
            <IconEdit/>
          </button>
        </div>
      </div>
    </div>

    <div class="section section--is-scrollable">
      <div v-if="error" class="error">{{ error }}</div>
      <div class="title">Buchung</div>
      <div class="details">
        <table class="table--is-wide">
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
                <div class="td-text-item item--is-text">
                  {{ transaction.t_EREF ? `Ende zu Ende Referenz: ${transaction.t_EREF}` : '' }}
                </div>
                <div class="td-text-item item--is-text">
                  {{ transaction.t_MREF ? `Mandatsreferenz: ${transaction.t_MREF}` : '' }}
                </div>
                <div class="td-text-item item--is-text">
                  {{ transaction.t_CRED ? `Gläubiger ID: ${transaction.t_CRED}` : '' }}
                </div>
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
      <div class="title">Kriterien</div>
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
      <div v-if="transaction.t_MREF" class="label-value in-column">
        <div class="label">Mandatsreferenz:</div>
        <label><input class="selectionInput" type="checkbox" v-model="useMREF">{{ transaction.t_MREF }}</label>
      </div>

      <div class="label-value in-column">
        <div class="label label--is-emphasis">Textabschnitte vom Verwendungszweck - markiere diejenigen, die Teil der
          Regel sein sollen:
        </div>
      </div>
      <table class="table--is-normal">
        <tbody>
        <tr v-for="(item) in textToken" :key="item.text">
          <td class="text-h-center"><label><input class="selectionInput" type="checkbox" v-model="item.selected"
                                                  @change="tokenSelected(item.text)">{{ item.text }}</label></td>
        </tr>
        </tbody>
      </table>

      <div class="label-value in-column">
        <div v-if="matchingTransactions.length" class="label label--is-emphasis">
          {{ `${matchingTransactions.length} Buchungen, die mit den ausgewählten Kriterien gefunden werden:` }}
        </div>
        <div v-if="!matchingTransactions.length" class="label label--is-emphasis">Es gibt keine Buchungen, die mit den
          ausgewählten Kriterien gefunden werden.
        </div>
      </div>
      <table class="all-transactions-table" v-if="matchingTransactions.length">
        <tbody>
        <template v-for="(trOfDate) in matchingTransactionsByDate" :key="trOfDate">
          <tr class="transaction-date">
            <td>{{ DateTime.fromISO(trOfDate.valueDate).toLocaleString() }}</td>
          </tr>
          <tr>
            <td>
              <table class="table--is-wide">
                <tbody>
                <tr v-for="(item, index) in trOfDate.transactions" :key="item.t_id" class="transaction-details"
                    :class="{'alternate-row-background': index % 2 }">
                  <td class="transaction-text">
                    <div class="transaction-data">
                      <div class="td-text-item">
                        {{
                          item.t_payee ? item.t_payee : item.textShortened ? item.textShortened : item.t_entry_text
                        }}
                      </div>
                      <div class="td-text-item item--is-category">{{ item.category_name }}</div>
                      <div class="td-text-item item--is-text">{{ item.t_payee ? item.textShortened : '' }}</div>
                      <div class="td-text-item item--is-notes">{{ item.t_notes }}</div>
                      <div class="td-text-item item--is-text">
                        {{ item.t_EREF ? `Ende zu Ende Referenz: ${item.t_EREF}` : '' }}
                      </div>
                      <div class="td-text-item item--is-text">{{
                          item.t_MREF ? `Mandatsreferenz: ${item.t_MREF}` : ''
                        }}
                      </div>
                      <div class="td-text-item item--is-text">{{
                          item.t_CRED ? `Gläubiger ID: ${item.t_CRED}` : ''
                        }}
                      </div>
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
  <div class="dialog-from-side" :class="{ 'dialog-slided' : showCategorySelectionDialog }">
    <CategorySelectionView show-transaction="false" :category-preselection="categoryPreselection"
                           @close="categorySelectionDialogButtonClicked"/>
  </div>
  <div v-if="confirmationDialog.show" class="confirm">
    <div class="confirm-backdrop"></div>
    <div class="dialog confirm-dialog confirm--yes-no">
      <span class="confirm-text">{{ confirmationDialog.text }}</span>
      <div class="btn-group">
        <button class="btn btn-confirm" @click="confirmDialogButtonClicked(confirmationDialog.button2.key)">
          {{ confirmationDialog.button2.label }}
        </button>
        <button class="btn btn-confirm btn--is-primary" v-focus
                @click="confirmDialogButtonClicked(confirmationDialog.button1.key)">
          {{ confirmationDialog.button1.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import IconEdit from "@/components/icons/IconEdit.vue";
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
      categoryPreselection: 0,
      selectedCategoryName: 'keine',
      showCategorySelectionDialog: false,
      confirmationDialog: {
        show: false,
        title: '',
        text: '',
        button1: {
          label: '',
          key: ''
        },
        button2: {
          label: '',
          key: ''
        },
      },
      transaction: this.transaction,
      matchingTransactionsByDate: this.matchingTransactionsByDate,
      minAmount: this.minAmount,
      maxAmount: this.maxAmount,
      useMinAmount: this.useMinAmount,
      useMaxAmount: this.useMaxAmount,
      useMREF: this.useMREF,
      isMREF: this.isMREF,
      error: this.error,
      includeProcessed: this.includeProcessed,
      loadedRuleSet: this.loadedRuleSet,
    };
  },
  watch: {
    selectedCategory: function (val, oldVal) {
      if (val) {
        this.selectedCategoryName = this.getCategoryById(val).full_name;
      } else {
        this.selectedCategoryName = 'keine';
      }
    },
    useMinAmount: function (val, oldVal) {
      this._runRules();
    },
    useMaxAmount: function (val, oldVal) {
      this._runRules();
    },
    useMREF: function (val, oldVal) {
      if (val) {
        this.isMREF = this.transaction.t_MREF;
      } else {
        this.isMREF = '';
      }
      this._runRules();
    }
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
        if (!this.isMREF && textToken.length === 0) {
          return false; // can't save if neither MREF nor text token is selected
        }
        if (this.isMREF !== this.loadedRuleSet.is_MREF) {
          return true;
        }
        if (textTokenHash !== this.loadedTextTokenHash) {
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
    ...mapActions(MasterDataStore, ["getCategoryById", "getCategories"]),
    ...mapActions(TransactionStore, ["getTransaction", "getMatchingTransactions", "getRuleSet", "setRules", "deleteRules"]),
    async deleteRuleSet() {
      if (!this.loadedRuleSet?.id) {
        throw new Error('Must have ruleset loaded');
      }
      try {
        const resultData = await this.deleteRules(this.loadedRuleSet.id);
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
        router.replace({name: 'TransactionDetail'});
      } catch (ex) {
        this.error = ex.message;
      }
    },
    saveRuleSet() {
      const name = this.ruleSet.name.trim();
      if (name) {
        const ruleInfo = {
          name: name,
          idSetCategory: this.selectedCategory,
          is_amount_min: this.useMinAmount ? this.minAmount: null,
          is_amount_max: this.useMaxAmount ? this.maxAmount: null,
          is_MREF: this.isMREF ? this.isMREF : null,
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
            case 403:
              this.error = 'Die Berechtigung zum Speichern der Regel fehlt.';
              not_ok = true;
              break;
            case 200:
              break;
            default:
              not_ok = true;
          }
          if (mustAuthenticate) {
            this.error = 'Benutzer muss angemeldet sein';
            return;
          }
          if (not_ok) {
            if (!this.error) {
              this.error = resultData.message;
            }
            return;
          }
          router.replace({name: 'TransactionDetail'});
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
    async _setMatchingTransactions(selectedTextToken, mRefToken) {
      this.matchingTransactions = [];
      if (selectedTextToken.length > 0 || mRefToken) {
        this.loading = true;
        const resultData = await this.getMatchingTransactions({
          maxItems: 15,
          textToken: selectedTextToken,
          mRefToken: mRefToken
        });
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
      await this._setMatchingTransactions(selectedTextToken, this.isMREF);
      if (this.matchingTransactions.length > 0) {
        let minAmount = Number.MAX_VALUE;
        let maxAmount = -Number.MAX_VALUE;
        this.matchingTransactions.forEach(t => {
          const amount = t.t_amount;
          if (amount < minAmount) {
            minAmount = amount;
          }
          if (amount > maxAmount) {
            maxAmount = amount;
          }
        });
        if (!this.useMinAmount) {
          this.minAmount = this._decimalFormatter.format(minAmount);
        }
        if (!this.useMaxAmount) {
          this.maxAmount = this._decimalFormatter.format(maxAmount);
        }
      } else {
        if (!this.useMinAmount && this.loadedRuleSet.is_amount_min === undefined) {
          this.minAmount = '';
        }
        if (!this.useMaxAmount && this.loadedRuleSet.is_amount_max === undefined) {
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
    async selectCategory() {
      this.showCategorySelectionDialog = true;
      this.categoryPreselection = this.selectedCategory;
      const res = await new Promise((resolve, reject) => {
        this.dialogResolve = resolve;
      });
      switch (res.btnId) {
        case 'ok':
          this.selectedCategory = res.categoryId;
          break;
      }
    },
    categorySelectionDialogButtonClicked(btnId, categoryId) {
      this.showCategorySelectionDialog = false;
      this.dialogResolve({btnId: btnId, categoryId: categoryId});
    },
    async deleteRuleSetWithConfirmation() {
      if (!this.loadedRuleSet.id) {
        return;
      }
      this.confirmationDialog.text = 'Regel wirklich löschen?';
      this.confirmationDialog.button1.key = 'no';
      this.confirmationDialog.button1.label = 'Nein';
      this.confirmationDialog.button2.key = 'yes';
      this.confirmationDialog.button2.label = 'Ja';
      this.confirmationDialog.show = true;
      const res = await new Promise((resolve, reject) => {
        this.dialogResolve = resolve;
      });
      switch (res) {
        case 'yes':
          await this.deleteRuleSet()
          break;
        case 'no':
          break;
      }
    },
    confirmDialogButtonClicked(btnId) {
      this.confirmationDialog.show = false;
      this.dialogResolve(btnId);
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
    this.minAmount = 0;
    this.maxAmount = 0;
    this.useMinAmount = false;
    this.useMaxAmount = false;
    this.useMREF = false;
    this.isMREF = '';
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
      router.replace({name: 'home'});
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
      "is_MREF": "OKF100000003062",
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
    if (!this.loadedRuleSet.textRules) {
      this.loadedRuleSet.textRules = [];
    }
    if (!this.loadedRuleSet.accountRules) {
      this.loadedRuleSet.accountRules = [];
    }
    if (!this.loadedRuleSet.is_MREF) {
      this.loadedRuleSet.is_MREF = '';
    }

    this.transaction = {...(results[0].data)};
    this.selectedCategory = this.transaction.category_id;

    this.ruleSet.name = this.loadedRuleSet.name;
    if (!this.ruleSet.name && this.transaction.t_payee) {
      this.ruleSet.name = this.transaction.t_payee;
    }
    if (this.loadedRuleSet.is_MREF && this.loadedRuleSet.is_MREF === this.transaction.t_MREF) {
      this.useMREF = true;
    }
    if (this.loadedRuleSet.is_amount_min) {
      this.useMinAmount = true;
      this.minAmount = this.loadedRuleSet.is_amount_min;
    }
    if (this.loadedRuleSet.is_amount_max) {
      this.useMaxAmount = true;
      this.maxAmount = this.loadedRuleSet.is_amount_max;
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
        let to = token.trim();
        if (to.endsWith(',')) {
          to = to.substring(0, to.length - 1);
        }
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
