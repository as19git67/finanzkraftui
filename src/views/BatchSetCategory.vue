<script setup>
import _ from 'lodash';
import {UserStore} from "@/stores/user";
import {TransactionStore} from '@/stores/transactions';
import {MasterDataStore} from "@/stores/masterdata";
import {onMounted, ref} from 'vue';
import {useRouter} from 'vue-router';
import {useConfirm} from "primevue/useconfirm";

defineOptions({
  name: 'BatchSetCategory'
});

const router = useRouter();
const userStore = UserStore();
const transactionStore = TransactionStore();
const masterDataStore = MasterDataStore();

let error = ref('');
let loading = ref(false);
let saving = ref(false);
let categoryNames = ref([]);
let selectedCategory = ref({});

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
    return category.full_name;
  })
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

function clearCategory() {
}

function setCategory() {
}
</script>

<template>
  <div class="page page--is-batch-set-category-view">
    <div class="page--header">
      <div class="page--title title__with-buttons">
        <Button :label="selectedCategory ? 'Abbrechen' : 'Zurück'" @click="cancel"></Button>
        <span v-if="saving">Kategorie setzen...</span>
        <span v-if="!saving" class="element--is-grow element--is-centered">
          Kategorie für {{transactionStore.selectedTransactions.length}} Buchungen auswählen
        </span>
        <Button v-if="selectedCategory" label="Speichern" @click="setCategory"></Button>
        <Button v-if="!selectedCategory" label="Kategorie entfernen" @click="clearCategory"></Button>
      </div>
    </div>
    <div class="page--content">
      <div class="page--content--row row--is-full-height">
        <div class="row--item row--item__category-list">
          <Listbox v-model="selectedCategory" :options="categoryNames" filter scrollHeight="auto" checkmark :highlightOnSelect="false"/>
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