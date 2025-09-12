<script setup>
import _ from 'lodash';
import {UserStore} from "@/stores/user";
import {TransactionStore} from '@/stores/transactions';
import {MasterDataStore} from "@/stores/masterdata";
import {onBeforeMount, onMounted, ref, watch} from 'vue';
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
let dirty = ref(false);
let availableTags;
let selectedTags = ref([]);
let tagSearchterm = ref('');

onBeforeMount(async () => {
  if (masterDataStore.tags.length === 0) {
    await loadDataFromServer();
  }
  prepareData();
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

function updateCheckboxState() {
  // set checkbox state on available tags based on selected transactions
  const selectedTransactions = transactionStore.selectedTransactions;
  for (let i = 0; i < availableTags.value.length; i++) {
    const tag = availableTags.value[i];
    const transactionsWithTag = selectedTransactions.filter(t => {
      return t.tagIds.includes(tag.id);
    });
    tag.selectAllOrNoting = transactionsWithTag.length > 0;
    tag.isSelectionIndeterminate = transactionsWithTag.length > 0 && transactionsWithTag.length < selectedTransactions.length;
  }
}

function sortAvailableTags() {
  // sort available tags by selectedAllOrNothing == true, isSelectionIndeterminate == true, name
  availableTags.value.sort((a, b) => {
    const aPrefix = a.selectAllOrNoting ? 'A' : (a.isSelectionIndeterminate ? 'B' : 'C');
    const bPrefix = b.selectAllOrNoting ? 'A' : (b.isSelectionIndeterminate ? 'B' : 'C');
    const nameA = aPrefix + a.name.toUpperCase(); // ignore upper and lowercase
    const nameB = bPrefix + b.name.toUpperCase(); // ignore upper and lowercase
    return nameA.localeCompare(nameB);
  });
}

function prepareData() {
  // prepare available tags
  availableTags = ref(prepareTags());
  updateCheckboxState();
  sortAvailableTags();
}

function prepareTags() {
  const tags = masterDataStore.tags.map(tag => {
    return {id: tag.id, name: tag.tag};
  });
  return tags;
}

watch(tagSearchterm, (val, oldVal) => {
  const tags = prepareTags();
  const searchTerm = val.trim().toLowerCase();
  if (searchTerm.length === 0) {
    availableTags.value = tags;
  } else {
    availableTags.value = tags.filter((tag) => {
      return tag.name.toLowerCase().indexOf(searchTerm) >= 0;
    });
  }
  updateCheckboxState();
  sortAvailableTags();
});

function onSelectAllOrNotingChanged(event, item) {
  dirty.value = true;
  const checked = event.target.checked;
  for (let i = 0; i < transactionStore.selectedTransactions.length; i++) {
    const t = transactionStore.selectedTransactions[i];
    if (checked) {
      if (!t.tagIds.includes(item.id)) {
        t.tagIds.push(item.id);
      }
    } else {
      if (t.tagIds.includes(item.id)) {
        t.tagIds.splice(t.tagIds.indexOf(item.id), 1);
      }
    }
  }
}

async function setTags() {
  error.value = '';
  saving = true;
  const updateData = transactionStore.selectedTransactions.map(t => {
    return {
      t_id: t.t_id,
      tagIds: t.tagIds,
    }
  });
  const result = await transactionStore.updateTransactionTags(updateData);
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
          Tags für {{ transactionStore.selectedTransactions.length }} Buchungen
        </span>
        <Button :disabled="!dirty" label="Speichern" @click="setTags"></Button>
        <Button aria-label="Neuen Tag" @click="newTag" icon="pi pi-folder-plus" variant="text"></Button>
      </div>
    </div>
    <div class="page--content page--content--has-no-overflow">
      <div class="page--content--row" v-if="error">
        <div class="error">{{ error }}</div>
      </div>
      <div class="page--content--row">
      <div class="page--content--row__inline">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputText id="idTagSearchterm" v-model="tagSearchterm" showClear></InputText>
          <label for="idTagSearchterm">Suchen</label>
        </FloatLabel>
        <Button icon="pi pi-times" aria-label="Löschen" @click="tagSearchterm=''" variant="text"/>
      </div>
      </div>
      <div class="page--content--row">
        <div class="page--content--row__inline page--content--row__inline--wrapped">
          <div class="chips-container">
            <Chip removable v-for="(item, index) in selectedTags" :key="item.id" :id="item.id"
                  @remove="selectedTags.splice(index, 1)"
                  :label="item.name"/>
          </div>
        </div>
      </div>
      <div class="page--content--row page--content--row__scrollable">
        <div class="row--item">
          <div class="data--list">
            <div v-for="(item, index) in availableTags" class="data--list__item">
              <Checkbox v-model="item.selectAllOrNoting" :label="item.name" :id="item.id"
                        @change="onSelectAllOrNotingChanged($event, item)" size="small"
                        :indeterminate="item.isSelectionIndeterminate" binary/>
              <label :for="item.id"> {{ item.name }} </label>
            </div>
          </div>
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

.data--list__item {
  padding-inline-start: 1em;
}
</style>