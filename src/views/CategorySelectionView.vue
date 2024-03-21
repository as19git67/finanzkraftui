<template>
  <div class="dialog-full-page">
    <h1 class="title">Kategorieauswahl</h1>
    <div class="section">

      <div v-if="error" class="error">{{ error }}</div>

      <div v-if="showTransaction" class="title">Buchung
        <span v-if="showTransaction && transaction && transaction.t_value_date">&nbsp;({{
            DateTime.fromISO(transaction.t_value_date).toLocaleString(DateTime.DATE_HUGE)
          }})</span>
      </div>
      <table v-if="showTransaction" class="table--is-normal">
        <tbody>
        <tr class="transaction-details">
          <td class="transaction-text">
            <div class="transaction-data">
              <div class="td-text-item">
                {{
                  transaction.t_payee ? transaction.t_payee :
                  transaction.textShortened ? transaction.textShortened : transaction.t_entry_ext
                }}
              </div>
              <div class="td-text-item item--is-category">{{ selectedCategoryName }}</div>
              <div class="td-text-item item--is-text"
                   :title="transaction.t_payee ? transaction.textShortened : ''">
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

      <div v-if="!showTransaction" class="label-value in-column">
        <div class="label">ausgewählte Kategorie:</div>
        <div class="value">{{ selectedCategoryName }}</div>
      </div>
      <div class="action-group">
        <button @click="goBackCancel" class="action btn btn--is-secondary">Abbrechen</button>
        <button @click="goBackOk" :disabled="!selectedCategory" class="action btn btn--is-primary">
          Übernehmen
        </button>
      </div>
      <div class="label-value in-column">
        <div class="label">Kategoriesuche:</div>
        <input class="value" type="search" autofocus v-model="categorySearch"
               placeholder="Kategorie suchen">
      </div>
    </div>
    <div class="section section--is-scrollable">
      <table class="table--is-normal">
        <tbody>
        <tr v-for="(item) in filteredCategories" :key="item.id">
          <td class="text-h-center"><label><input class="selectionInput" type="radio"
                                                  v-model="selectedCategory"
                                                  :value="item.id" :checked="item.selected"
                                                  name="ruleCategory">{{ item.full_name }}</label>
          </td>
        </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>


<script setup>
defineProps(['showTransaction', 'categoryPreselection']);
const emit = defineEmits(['close']);

function goBackCancel() {
  emit('close', 'cancel');
}
</script>

<script>
import { DateTime } from "luxon";
import { mapActions, mapState, mapStores } from "pinia";
import router from "@/router";
import _ from "lodash";
import { MasterDataStore } from "@/stores/masterdata";
import { TransactionStore } from "@/stores/transactions";

export default {
  name: "CategorySelectionView",
  components: {},
  data() {
    return {
      error: this.error,
      selectedCategoryName: this.selectedCategoryName,
      categorySearch: this.categorySearch,
      selectedCategory: this.selectedCategory,
      filteredCategories: this.filteredCategories,
    };
  },
  computed: {
    ...mapStores(MasterDataStore, TransactionStore),
    ...mapState(MasterDataStore, ["categories"]),
    ...mapState(TransactionStore, ["transaction"]),
  },
  watch: {
    categorySearch: function (val, oldVal) {
      if (_.isString(val)) {
        const searchTerm = val.trim().toLowerCase();
        this._filterCategories(searchTerm);
      }
    },
    selectedCategory: function (val, oldVal) {
      if (val) {
        this.selectedCategoryName = this.getCategoryById(val).full_name;
      } else {
        this.selectedCategoryName = 'keine';
      }
    },
    categoryPreselection: function (val, oldVal) {
      this.selectedCategory = val;
      this.unfilteredCategories = this.categories.map(category => {
        const c = { ...category };
        c.selected = (this.selectedCategory === c.id);
        return c;
      });

      this._filterCategories();
    }
  },
  methods: {
    ...mapActions(MasterDataStore, ["getCategories", "getCategoryById"]),
    goBackOk: function () {
      this.$emit('close', 'ok', this.selectedCategory);
    },
    _filterCategories: function (searchTerm) {
      this.filteredCategories = this.unfilteredCategories
          .filter((category) => {
            const lowerCaseCategory = category.full_name.toLowerCase();
            if (category.selected) {
              this.selectedCategoryName = category.full_name;
              return true;
            }
            return searchTerm && lowerCaseCategory.indexOf(searchTerm) >= 0;
          });
    },
  },
  created() {
    this.loading = false;
    this.categorySearch = '';
    this.filteredCategories = [];
    this.unfilteredCategories = [];
    this.selectedCategoryName = 'keine';
  },
  async mounted() {
    this.error = undefined;
    this.loading = false;

    const promises = [];
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
      this.unfilteredCategories = [];
    }
    if (mustAuthenticate) {
      router.replace("/login");
      return;
    }
    if (not_ok) {
      if (!this.error) {
        this.error = "Unspezifischer Fehler beim Holen der Kategorien vom Server";
      }
      return;
    }

  },
};
</script>

<style scoped>
.form-component input {
  flex: 1 1 auto;
}

.item--is-category {
  font-weight: bold;
}

.action.action--is-disabled {
  color: var(--as-color-complement-5);
}

.category-details.details-column {
  flex-direction: column;
}

.category-details.details-column > .details-row-left {
  justify-content: flex-start;
  font-weight: bold;
}

.category-details.details-column > .details-row-right {
  justify-content: flex-start;
}

.category-details.details-column > .details-row-right > input {
  display: flex;
  width: 100%;
}

label > .selectionInput {
  margin-right: 0.5em;
}

</style>
