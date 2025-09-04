<script setup>
import _ from 'lodash';
import {UserStore} from "@/stores/user";
import {TransactionStore} from '@/stores/transactions';
import {MasterDataStore} from "@/stores/masterdata";
import {onBeforeMount, onMounted, ref} from 'vue';
import {useRouter} from 'vue-router';
import {useConfirm} from "primevue/useconfirm";

defineOptions({
  name: 'BatchSetTagsView'
});

const router = useRouter();
const userStore = UserStore();
const transactionStore = TransactionStore();
const masterDataStore = MasterDataStore();

let error = ref('');
let loading = ref(false);
let saving = ref(false);
let availableTags;
let selectedTags = ref([]);

onBeforeMount( async () => {
  if (masterDataStore.tags.length === 0) {
    await loadDataFromServer();
  }
  availableTags = ref(masterDataStore.tags.map(tag => {
    return {id: tag.id, name: tag.tag};
  }));
  availableTags.value.sort((a, b) => {
    const nameA = a.name.toUpperCase(); // ignore upper and lowercase
    const nameB = b.name.toUpperCase(); // ignore upper and lowercase
    return nameA.localeCompare(nameB);
  });
});
onMounted(async () => {
  error.value = '';
  loading.value = false;
  saving.value = false;
  if (transactionStore.selectedTransactions.length === 0) {
    cancel();
  }
});

async function loadDataFromServer() {
  error.value = '';
  loading.value = true;
  const promises = [];
  promises.push(masterDataStore.getTags());
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

async function clearTags() {
  error.value = '';
  saving = true;
  const result = await transactionStore.updateTransactionTags(getSelectedTransactionIds(), []);
  if (result.status !== 200) {
    error.value = `Fehler: Tags konnten von den Buchungen nicht entfernt werden (${ex.message})`;
    saving = false;
    return;
  }
  saving = false;
  router.back();
}

async function setTags() {
  error.value = '';
  saving = true;
  const tagIds = selectedTags.value.map(tag => {
    return tag.id;
  });
  const result = await transactionStore.updateTransactionTags(getSelectedTransactionIds(), tagIds);
  if (result.status !== 200) {
    error.value = `Fehler: Tags konnten nicht gesetzt werden (${result.message})`;
    saving = false;
    return;
  }
  saving = false;
  router.back();
}

function newTag() {
}
</script>

<template>
  <div class="page page--is-batch-set-tags-view">
    <div class="page--header">
      <div class="page--title title__with-buttons">
        <Button :label="selectedTags.length ? 'Abbrechen' : 'Zurück'" @click="cancel"></Button>
        <span v-if="saving">Tags setzen...</span>
        <span v-if="!saving" class="element--is-grow element--is-centered">
          Tags für {{transactionStore.selectedTransactions.length}} Buchungen
        </span>
        <Button v-if="selectedTags.length" label="Speichern" @click="setTags"></Button>
        <Button v-if="selectedTags.length === 0" label="Tags entfernen" @click="clearTags"></Button>
        <Button aria-label="Neuen Tag" @click="newTag" icon="pi pi-folder-plus" variant="text"></Button>
      </div>
    </div>
    <div class="page--content page--content--has-no-overflow">
      <div class="page--content--row" v-if="error">
        <div class="error">{{ error }}</div>
      </div>
      <div class="page--content--row">
        <div class="page--content--row__inline page--content--row__inline--wrapped">
          <div class="chips-container">
            <Chip removable v-for="(item, index) in selectedTags" :key="item.id" :id="item.id" @remove="selectedTags.splice(index, 1)"
                    :label="item.name" />
          </div>
        </div>
      </div>
      <div class="page--content--row page--content--row__scrollable">
        <div class="row--item row--item__tag-list">
          <Listbox multiple v-model="selectedTags" :options="availableTags" optionLabel="name" filter scrollHeight="auto" checkmark :highlightOnSelect="false"/>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chips-container {
  --p-chip-padding-y: 0;
}
.chips-container .p-chip {
  background: var(--picton-blue);
  padding-inline: 0.75em;
  --p-chip-remove-icon-color: var(--p-chip-color);
}

.row--item__tag-list {
  display: flex;
  flex-direction: column;
}
.row--item__tag-list > * {
  display: flex;
  flex-direction: column;
  width: 100%;
}
</style>