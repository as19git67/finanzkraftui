<script setup>
import _ from "lodash";
import {ref, onMounted, computed} from 'vue';
import {useRouter} from 'vue-router';
import {UserStore} from "@/stores/user";
import {OnlineBankingStore} from "@/stores/onlinebanking";

const router = useRouter();
const userStore = UserStore();
const onlinebankingStore = OnlineBankingStore();
const bankcontacts = computed(() => onlinebankingStore.bankcontacts);
const menuPermissions = computed(() => userStore.menuPermissions);

defineOptions({
  name: 'BankcontactsView'
});

const error = ref('');
const loading = ref(false);
const bankcontactName = ref('');

async function loadDataFromServer() {
  error.value = '';
  loading.value = true;
  const promises = [];
  promises.push(userStore.getUsers());
  promises.push(onlinebankingStore.getBankcontacts(true));
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
        not_ok = true;
    }
  });
  if (mustAuthenticate || not_ok) {
    userStore.setNotAuthenticated();
    router.replace({name: 'login'});
    return;
  }
  if (notAuthorized) {
    router.replace({name: 'notAuthorized'});
    return;
  }
  loading.value = false;
  error.value = '';
}

function navigateToBankcontactDetail(item) {
  router.push({name: 'BankcontactDetail', params: {bankcontactId: item.id}});
}

onMounted(async () => {
  error.value = '';
  loading.value = false;
  if (userStore.isAuthenticated) {
    try {
      await loadDataFromServer();
    } catch (ex) {
      error.value = ex.message;
      loading.value = false;
    }
  } else {
    router.replace({name: 'login'});
  }
});

function createNew() {
  onlinebankingStore.saveNewBankcontact({name: bankcontactName.value, fintsurl: ''}).then(result => {
    if (result.status === 200) {
      bankcontactName.value = '';
      loadDataFromServer();
    } else {
      error.value = 'Fehler beim Erstellen des Bankkontaktes: ' + result.message + '';
    }
  }).catch((ex) => {
    loading.value = false;
    error.value = ex.message;
  });
}

</script>

<template>
  <div class="page page--is-bankcontacts-view">
    <div class="page--header">
      <div class="page--title">
        <span v-if="loading">Bankkontakte laden...</span>
        <span v-if="!loading" class="element--is-grow element--is-centered">Alle Bankkontakte</span>
      </div>
    </div>

    <div class="page--content">
      <div class="page--content--row" v-if="menuPermissions['admin.onlinebanking.new']">
        <div class="page--content--row__inline">
          <FloatLabel variant="in" class="row--item row--item--is-grow">
            <InputText id="idName" v-model=bankcontactName size="small" class="prevent-scroll"></InputText>
            <label for="idName">Bankkontakt Name</label>
          </FloatLabel>
          <Button :disabled="!bankcontactName" size="small" @click="createNew" label="Neu" icon="pi pi-plus"></Button>
        </div>
      </div>
      <div class="page--content--row">
        <div class="data--list data--list--standard" v-if="bankcontacts">
          <div v-for="(item, index) of bankcontacts" :key="item" class="data--list__item">
            <div class="data--list__left">
              <div class="data--list__line data--list__line--bold data--list__line--space-between">
                <span>{{ item.name }}</span>
                <span v-if="item.status">{{ item.status }}</span>
              </div>
              <div class="data--list__line data--list__line--space-between">
                <span v-if="item.fintsurl">FinTS URL: {{ item.fintsurl }}</span>
                <span v-if="item.lastUpdatedStr">aktualisiert: {{item.lastUpdatedStr}}</span>
              </div>
            </div>
            <div class="data--list__right" v-if="menuPermissions['admin.onlinebanking.edit']">
              <Button @click="navigateToBankcontactDetail(item)"
                      @keydown.enter="navigateToBankcontactDetail(item)"
                      icon="pi pi-caret-right" severity="contrast"
                      variant="text" rounded aria-label="Ändern" />
            </div>
          </div>
        </div>
      </div>
      <div class="page--content--row">
        <div class="error">{{ error }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
