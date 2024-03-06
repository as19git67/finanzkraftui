<template>
  <div class="top-links">
    <button @click="goBackCancel" class="action btn btn--is-secondary">Abbrechen</button>
    <button @click="goBackOk" :disabled="!selectedCategory"
            class="action btn btn--is-secondary">Übernehmen
    </button>
  </div>
  <div v-if="error" class="error">{{ error }}</div>
  <div class="category-details details-column">
    <div class="details-row-left">ausgewählte Kategorie:</div>
    <div class="details-row-right">{{ selectedCategoryName }}</div>
  </div>
  <div class="category-details details-column">
    <div class="details-row-left">Suche:</div>
    <div class="details-row-right"><input type="search" autofocus v-model="categorySearch" placeholder="Kategorie suchen"></div>
  </div>
  <table>
    <tbody>
    <tr v-for="(item) in filteredCategories" :key="item.id">
      <td class="text-h-center"><label><input class="selectionInput" type="radio" v-model="selectedCategory" :value="item.id" :checked="item.selected" name="ruleCategory">{{ item.full_name }}</label>
      </td>
    </tr>
    </tbody>
  </table>

</template>


<script setup>
</script>

<script>
import { mapActions, mapState, mapStores } from "pinia";
import router from "@/router";
import _ from "lodash";
import { MasterDataStore } from "@/stores/masterdata";

export default {
  name: "CategorySelectionView",
  components: {},
  data() {
    return {
      error: this.error,
      selectedCategory: 0,
      selectedCategoryName: this.selectedCategoryName,
      categorySearch: this.categorySearch,
      filteredCategories: this.filteredCategories,
    };
  },
  computed: {
    ...mapStores(MasterDataStore),
    ...mapState(MasterDataStore, ["categories", "currentlySelectedCategoryId"]),
  },
  watch: {
    categorySearch: function (val, oldVal) {
      if (_.isString(val)) {
        const searchTerm = val.trim().toLowerCase();
        this._filterCategories(searchTerm);
      }
    },
    selectedCategory: function (val, oldVal) {
      this.selectedCategoryName = this.getCategoryById(val).full_name;
    }
  },
  methods: {
    ...mapActions(MasterDataStore, [ "getCategories", "getCategoryById", "setCurrentlySelectedCategoryId" ]),
    goBackOk: function () {
      this.setCurrentlySelectedCategoryId(this.selectedCategory);
      router.back();
    },
    goBackCancel: function () {
      router.back();
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

    this.selectedCategory = this.currentlySelectedCategoryId;
    this.unfilteredCategories = this.categories.map(category => {
      const c = {...category};
      c.selected = (this.currentlySelectedCategoryId === c.id);
      return c;
    });


    if (this.currentlySelectedCategoryId) {
      this._filterCategories();
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
