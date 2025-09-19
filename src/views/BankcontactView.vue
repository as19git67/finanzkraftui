<script setup>
import _ from "lodash";
import {ref, onMounted, computed} from 'vue';
import {useRouter} from 'vue-router';
import {UserStore} from "@/stores/user";
import {AccountStore} from "@/stores/accounts";
import {OnlineBankingStore} from "@/stores/onlinebanking";

const router = useRouter();
const userStore = UserStore();
const onlinebankingStore = OnlineBankingStore();

defineOptions({
  name: 'BankcontactView'
});

// these are the properties sent from the router to this component
const props = defineProps({
  bankcontactId: {type: String},
});

const error = ref('');
const loading = ref(false);
const name = ref('');
const fintsUrl = ref('');
const fintsBankId = ref('');
const fintsUserId = ref('');
const fintsPassword = ref('');
let bankcontact = {};

const menuPermissions = computed(() => userStore.menuPermissions);
const dirty = computed(() => {
  return name.value !== bankcontact.name
      || fintsUrl.value !== bankcontact.fintsUrl
      || fintsBankId.value !== bankcontact.fintsBankId
      || fintsUserId.value !== bankcontact.fintsUserId
      || fintsPassword.value.trim().length > 0;
});

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

  bankcontact = onlinebankingStore.getBankcontact(parseInt(props.bankcontactId));
  if (bankcontact) {
    name.value = bankcontact.name;
    fintsUrl.value = bankcontact.fintsUrl;
    fintsBankId.value = bankcontact.fintsBankId;
    fintsUserId.value = bankcontact.fintsUserId;
    fintsPassword.value = ''; // don't set the password, it is encrypted an does not help
  } else {
    error.value = 'Bankkontakt nicht gefunden';
  }
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

function save() {
  const updateData = {
    name: name.value,
    fintsUrl: fintsUrl.value,
    fintsBankId: fintsBankId.value,
    fintsUserId: fintsUserId.value,
  };
  if (fintsPassword.value.trim().length > 0) {
    // user set up a new password - server needs to encrypt it before saving
    updateData.fintsPassword = fintsPassword.value;
  }
  onlinebankingStore.updateBankcontact(bankcontact.id, updateData).then(result => {
    if (result.status === 200) {
      router.back();
      return;
    }
    error.value = `Bankkontakt konnte nicht gespeichert werden (${result.message})`;
  }).catch((ex) => {
    error.value = `Bankkontakt konnte nicht gespeichert werden (${ex.message})`;
  });
}

function cancel() {
  router.back();
}

function deleteTheBankcontact() {

}
</script>

<template>
  <div class="page page--is-bankcontact-view">
    <div class="page--header">
      <div class="page--title title__with-buttons">
        <Button :label="dirty ? 'Abbrechen' : 'Zurück'" @click="cancel">
        </Button>
        Bankkontakt {{name}}
        <Button label="Speichern" :disabled="!dirty" @click="save">
        </Button>
      </div>
    </div>
    <div class="page--content">
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputText id="idName" v-model="name"></InputText>
          <label for="idName">Name</label>
        </FloatLabel>
      </div>
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputText id="idFintsUrl" v-model="fintsUrl"></InputText>
          <label for="idFintsUrl">FinTS URL</label>
        </FloatLabel>
      </div>
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputText id="idBankId" v-model="fintsBankId"></InputText>
          <label for="idBankId">Bank ID</label>
        </FloatLabel>
      </div>
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputText id="idFintsUserId" v-model="fintsUserId"></InputText>
          <label for="idFintsUserId">FinTS User Id</label>
        </FloatLabel>
      </div>
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputText id="idFintsPassword" v-model="fintsPassword" type="password"></InputText>
          <label for="idFintsPassword">FinTS PIN/Passwort (wird verschlüsselt gespeichert)</label>
        </FloatLabel>
      </div>
      <div class="page--content--row" v-if="error">
        <div class="error">{{ error }}</div>
      </div>
      <div class="page--content--row" v-if="menuPermissions['admin.onlinebanking.delete']">
        <div class="row--item row--item--is-centered">
          <Button label="Löschen" severity="danger" @click="deleteTheBankcontact" size="large"/>
        </div>
      </div>
      <ConfirmDialog></ConfirmDialog>
    </div>
  </div>
</template>

<style scoped>
</style>
