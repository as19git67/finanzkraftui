<script setup>
import _ from 'lodash';
import {UserStore} from "@/stores/user";
import {TransactionStore} from '@/stores/transactions';
import {MasterDataStore} from "@/stores/masterdata";
import {onMounted, ref} from 'vue';
import {useRouter} from 'vue-router';
import {useConfirm} from "primevue/useconfirm";

defineOptions({
  name: 'BatchSetCategoryView'
});

const router = useRouter();
const userStore = UserStore();
const transactionStore = TransactionStore();
const masterDataStore = MasterDataStore();

let error = ref('');
let loading = ref(false);
let saving = ref(false);
let categoryNames = ref([]);
let selectedCategory = ref();

onMounted(async () => {
  error.value = '';
  loading.value = false;
  saving.value = false;
  if (transactionStore.selectedTransactions.length === 0) {
    cancel();
  }
  if (masterDataStore.categories.length === 0) {
    await loadDataFromServer();
  }
  categoryNames.value = masterDataStore.categories.map(category => {
    return {id: category.id, name: category.full_name};
  });
  //categoryNames.value = [{id: -1, name: '- keine Kategorie -'}].concat(categoryNames.value);
});

async function loadDataFromServer() {
  error.value = '';
  loading.value = true;
  const promises = [];
  promises.push(masterDataStore.getCategories());
  const results = await Promise.all(promises);
  loading.value = false;
  let mustAuthenticate = false;
  let notAuthorized = false;
  let not_ok = false;
  results.forEach((result) => {
    let status = result;
    if (_.isObject(result)) {
      status = result.status;
    }

    switch (status) {
      case 403:
        notAuthorized = true;
        break;
      case 401:
      case 404:
        mustAuthenticate = true;
        break;
      case 200:
        break;
      default:
        console.log(result);
        error.value = 'Fehler beim Laden der Daten';
        not_ok = true;
    }
  });
  if (mustAuthenticate) {
    userStore.setNotAuthenticated();
    await router.replace({name: 'login'});
    return;
  }
  if (notAuthorized) {
    await router.replace({name: 'notAuthorized'});
    return;
  }
  if (not_ok) {
    return;
  }

}

function cancel() {
  router.back();
}

function getSelectedTransactionIds() {
  return transactionStore.selectedTransactions.map(t => {
    return t.t_id;
  });
}

async function clearCategory() {
  error.value = '';
  saving = true;
  const result = await transactionStore.updateTransactionCategories(getSelectedTransactionIds());
  if (result.status !== 200) {
    error.value = `Fehler: Kategorie konnte von den Buchungen nicht entfernt werden (${ex.message})`;
    saving = false;
    return;
  }
  saving = false;
  router.back();
}

async function setCategory() {
  error.value = '';
  saving = true;
  const result = await transactionStore.updateTransactionCategories(getSelectedTransactionIds(), selectedCategory.value.id);
  if (result.status !== 200) {
    error.value = `Fehler: Kategorie konnte nicht gesetzt werden (${result.message})`;
    saving = false;
    return;
  }
  saving = false;
  router.back();
}

function newCategory() {
}
</script>

<template>
  <div class="page page--is-batch-set-category-view">
    <div class="page--header">
      <div class="page--title title__with-buttons">
        <Button :label="selectedCategory ? 'Abbrechen' : 'Zurück'" @click="cancel"></Button>
        <span v-if="saving">Kategorie setzen...</span>
        <span v-if="!saving" class="element--is-grow element--is-centered">
          Kategorie für {{transactionStore.selectedTransactions.length}} Buchungen
        </span>
        <Button v-if="selectedCategory" label="Speichern" @click="setCategory"></Button>
        <Button v-if="!selectedCategory" label="Kategorie entfernen" @click="clearCategory"></Button>
        <Button aria-label="Neue Kategorie" @click="newCategory" icon="pi pi-folder-plus" variant="text"></Button>
      </div>
    </div>
    <div class="page--content">
      <div class="page--content--row" v-if="error">
        <div class="error">{{ error }}</div>
      </div>
      <div class="page--content--row row--is-full-height">
        <div class="row--item row--item__category-list">
          <Listbox v-model="selectedCategory" :options="categoryNames" optionLabel="name" filter scrollHeight="auto" checkmark :highlightOnSelect="false"/>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.row--item__category-list {
  display: flex;
  flex-direction: column;
}
.row--item__category-list > * {
  display: flex;
  flex-direction: column;
  width: 100%;
}
</style>