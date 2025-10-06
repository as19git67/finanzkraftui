<script setup>
import _ from 'lodash';
import {DateTime} from 'luxon';
import {AccountStore} from '@/stores/accounts';
import {UserStore} from '@/stores/user';
import {MasterDataStore} from '@/stores/masterdata';
import {OnlineBankingStore} from '@/stores/onlinebanking';
import {computed, onMounted, ref, watch} from 'vue';
import {useRouter} from 'vue-router';

const props = defineProps({
  accountId: {type: String},
});

defineOptions({
  name: 'AccountView'
});

const router = useRouter();
const userStore = UserStore();
const accountStore = AccountStore();
const onlineBankingStore = OnlineBankingStore();
const masterDataStore = MasterDataStore();

let originalData = {};

const error = ref('');
const loading = ref(false);
const name = ref('');
const iban = ref('');
const startBalance = ref(0);
const closed = ref(false);
const closedAt = ref(DateTime.now().toJSDate());
const typeObj = ref({});
const currencyObj = ref({});
const reader = ref([]);
const writer = ref([]);
const selectedBankcontact = ref({});
const fintsError = ref('');
const fintsActivated = ref(false);
const fintsAuthRequired = ref(false);
const fintsAccountsOfBankcontact = ref([]);
const selectedFintsAccountNumber = ref({});

onMounted(async () => {
  error.value = '';
  loading.value = false;
  try {
    await loadDataFromServer();
  } catch (ex) {
    error.value = ex.message;
    loading.value = false;
    console.log(error);
    router.replace({name: 'Accounts'});
  }
});

let dirty = computed(() => {
  let ca = '';
  if (closed.value && closedAt.value) {
    ca = DateTime.fromJSDate(closedAt.value).toISO();
  }
  let originalClosedAt = '';
  if (originalData.closedAt) {
    originalClosedAt = originalData.closedAt.substring(0, 10);
  }
  return originalData.name !== name.value ||
      originalData.fintsActivated !== fintsActivated.value ||
      originalData.type !== typeObj.value.id ||
      originalData.iban !== iban.value ||
      (originalData.idBankcontact ?? null) !== (selectedBankcontact.value?.id ?? null) ||
      (originalData.fintsAccountNumber ?? null) !== (selectedFintsAccountNumber.value?.accountNumber ?? null) ||
      originalData.currency !== currencyObj.value.id ||
      originalData.startBalance !== startBalance.value ||
      originalClosedAt !== ca.substring(0, 10) !==
      !_.isEqual(originalData.reader, integerSort(reader.value)) ||
      !_.isEqual(originalData.writer, integerSort(writer.value));
});

function integerSort(arr) {
  return arr.sort(function(a, b) {
    return a - b;
  });
}

watch(selectedBankcontact, async (newVal) => {
  if (newVal && (newVal.id !== originalData.idBankcontact)) {
    await loadFintsAccountsOfBankcontact(selectedBankcontact.value.id);
  }
});

async function loadFintsAccountsOfBankcontact(idBankcontact) {
  let not_ok = false;
  let mustAuthenticate = false;
  let notAuthorized = false;
  const result = await onlineBankingStore.getAccountsOfBankcontact(idBankcontact);
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
  if (mustAuthenticate) {
    userStore.setNotAuthenticated();
    fintsAccountsOfBankcontact.value = [];
    router.replace({name: 'login'});
    return;
  }
  if (notAuthorized) {
    fintsAccountsOfBankcontact.value = [];
    error.value = 'Keine Berechtigung zum Abrufen der FinTS Konten';
    return;
  }
  if (not_ok) {
    fintsAccountsOfBankcontact.value = [];
    error.value = 'Fehler beim Abrufen der FinTS Konten';
    return;
  }
  fintsAccountsOfBankcontact.value = result.resultData.map((item) => {
    return {
      ...item,
      description: `${item.name} (${item.type}, ${item.accountHolder}): ${item.accountNumber}`,
    };
  });
}

async function loadDataFromServer() {
  error.value = '';
  loading.value = true;
  const promises = [];
  promises.push(userStore.getUsers());
  promises.push(accountStore.getAccounts());
  promises.push(masterDataStore.getCurrencies());
  promises.push(masterDataStore.getAccountTypes());
  promises.push(onlineBankingStore.getBankcontacts());
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

  // initialize view data
  const data = accountStore.getAccountById(props.accountId);
  integerSort(data.reader);
  integerSort(data.writer);
  originalData = _.cloneDeep(data);
  name.value = data.name;
  typeObj.value = _.find(masterDataStore.accountTypes, (item) => {
    return item.id === data.type;
  });
  if (data.idBankcontact) {
    selectedBankcontact.value = _.find(onlineBankingStore.bankcontacts, (item) => {
      return item.id === data.idBankcontact;
    });
    await loadFintsAccountsOfBankcontact(data.idBankcontact);
    selectedFintsAccountNumber.value = _.find(fintsAccountsOfBankcontact.value, (item) => {
      return item.accountNumber === data.fintsAccountNumber;
    });
  }
  currencyObj.value = _.find(masterDataStore.currencies, (item) => {
    return item.id === data.currency;
  });
  if (typeObj.value && typeObj.value.id !== 'cash') {
    fintsError.value = data.fintsError;
  }
  reader.value = data.reader;
  writer.value = data.writer;
  startBalance.value = data.startBalance;
  iban.value = data.iban;
  closed.value = data.closedAt !== null;
  if (closed) {
    if (data.closedAt) {
      closedAt.value = DateTime.fromISO(data.closedAt).toJSDate();
    } else {
      closedAt.value = '';
    }
  }
  originalData.fintsActivated = !!data.fintsActivated;
  fintsActivated.value = originalData.fintsActivated;
}

function createUpdateData() {
  const updateData = {
    id: originalData.id,
  };
  if (originalData.name !== name.value) {
    updateData.name = name.value;
  }
  if (originalData.type !== typeObj.value.id) {
    updateData.idAccountType = typeObj.value.id;
  }
  if (originalData.iban !== iban.value) {
    updateData.iban = iban.value;
  }
  if (originalData.currency !== currencyObj.value.id) {
    updateData.idCurrency = currencyObj.value.id;
  }
  if (originalData.fintsActivated !== fintsActivated.value) {
    updateData.fintsActivated = fintsActivated.value;
  }
  if (typeObj.value.id === 'cash' || closed.value && closedAt.value) {
    // clear bankcontact if account type is cash or account is closed
    updateData.idBankcontact = null;
    updateData.fintsError = '';
    updateData.fintsAccountNumber = '';
    updateData.fintsActivated = false;
    updateData.fintsAuthRequired = false;
  } else {
    if (originalData.idBankcontact !== selectedBankcontact.value?.id) {
      if (selectedBankcontact.value === null) {
        updateData.idBankcontact = null;
      } else {
        updateData.idBankcontact = selectedBankcontact.value?.id;
      }
    }
    if (originalData.fintsAccountNumber !== selectedFintsAccountNumber.value?.accountNumber) {
      if (selectedFintsAccountNumber.value === null) {
        updateData.fintsAccountNumber = null;
      } else {
        updateData.fintsAccountNumber = selectedFintsAccountNumber.value.accountNumber;
      }
    }
  }
  if (originalData.startBalance !== startBalance.value) {
    updateData.startBalance = startBalance;
  }
  let ca = '';
  if (closed.value && closedAt.value) {
    ca = DateTime.fromJSDate(closedAt.value).toISO();
  }
  let originalClosedAt = '';
  if (originalData.closedAt) {
    originalClosedAt = originalData.closedAt.substring(0, 10);
  }
  if (originalClosedAt !== ca.substring(0, 10)) {
    if (ca === '') {
      updateData.closedAt = null;
    } else {
      const d = new Date(
          Date.UTC(closedAt.value.getFullYear(), closedAt.value.getMonth(), closedAt.value.getDate(), 0, 0, 0));
      updateData.closedAt = DateTime.fromJSDate(d);
    }
  }
  if (!_.isEqual(originalData.reader, integerSort(reader.value))) {
    updateData.reader = reader.value;
  }
  if (!_.isEqual(originalData.writer, integerSort(writer.value))) {
    updateData.writer = writer.value;
  }
  return updateData;
}

async function saveAccount() {
  error.value = '';
  loading.value = false;
  try {
    const updateData = createUpdateData();
    await accountStore.updateAccount(updateData);

    await loadDataFromServer();
    router.back();
  } catch (ex) {
    error.value = ex.message;
    loading.value = false;
    console.log(error);
  }
}

function cancel() {
  router.back();
}
</script>

<template>
  <div class="page page--is-account-detail-view">
    <div class="page--header">
      <div class="page--title title__with-buttons">
        <Button label="Abbrechen" @click="cancel" size="large"/>
        Konto: {{ name }}
        <Button label="Speichern" :disabled="!dirty" @click="saveAccount" size="large"/>
      </div>
    </div>
    <div class="page--content">
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputText id="accountName" v-model="name"
                     size="small"></InputText>
          <label for="accountName">Name</label>
        </FloatLabel>
      </div>
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <Select class="row--item" id="accountType" fluid v-model="typeObj" :options="masterDataStore.accountTypes"
                  optionLabel="name"/>
          <label for="accountType">Kontoart</label>
        </FloatLabel>
      </div>
      <div class="page--content--row" v-if="typeObj.id !== 'cash'">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputText id="accountIBAN" v-model="iban"
                     size="small"></InputText>
          <label for="accountIBAN">IBAN</label>
        </FloatLabel>
      </div>
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <Select id="accountCurrency" fluid v-model="currencyObj" :options="masterDataStore.currencies" optionLabel="name"/>
          <label for="accountCurrency">Kontowährung</label>
        </FloatLabel>
      </div>
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputNumber id="accountStartBalance" locale="de-DE"
                       inputmode="decimal" currency="EUR"
                       mode="currency" v-model=startBalance />
          <label for="accountStartBalance">Anfangssaldo</label>
        </FloatLabel>
      </div>
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <MultiSelect id="accountReader" fluid filter v-model="reader" :options="userStore.users" optionValue="id"
                       optionLabel="Email"/>
          <label for="accountReader">Benutzer mit Leserechten</label>
        </FloatLabel>
      </div>
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <MultiSelect id="accountWriter" fluid filter v-model="writer" :options="userStore.users" optionValue="id"
                       optionLabel="Email"/>
          <label for="accountWriter">Benutzer mit Recht zum Ändern</label>
        </FloatLabel>
      </div>
      <div class="page--content--row" v-if="typeObj.id !== 'cash'">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <Select class="row--item" id="bankcontact" fluid v-model="selectedBankcontact" :options="onlineBankingStore.bankcontacts"
                  optionLabel="name" showClear/>
          <label for="bankcontact">FinTS Bankkontakt</label>
        </FloatLabel>
      </div>
      <div class="page--content--row" v-if="typeObj.id !== 'cash' && selectedBankcontact">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <Select class="row--item" id="idFintsAccountNumber" fluid v-model="selectedFintsAccountNumber" :options="fintsAccountsOfBankcontact"
                  optionLabel="description" showClear/>
          <label for="idFintsAccountNumber">FinTS Konto</label>
        </FloatLabel>
      </div>
      <div class="page--content--row" v-if="fintsError && selectedBankcontact">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputText id="idFintsError" v-model="fintsError" variant="filled"
                     readonly invalid/>
          <label for="idFintsError">FinTS Fehler</label>
        </FloatLabel>
      </div>
      <div class="page--content--row" v-if="selectedBankcontact && fintsAuthRequired">
        <div class="row--item row-item--is-label-value error">
          <label for="idFintsAuthRequired">TAN Freigabe notwendig</label>
          <Checkbox readonly v-model="fintsAuthRequired" id="idFintsAuthRequired"/>
        </div>
      </div>
      <div class="page--content--row" v-if="selectedBankcontact">
        <div class="row--item row-item--is-label-value">
          <label for="idFintsActivated">Umsatzabruf aktiviert</label>
          <ToggleSwitch v-model="fintsActivated" id="idFintsActivated"/>
        </div>
      </div>
      <div class="page--content--row">
        <div class="page--content--row__inline">
          <FloatLabel variant="in" class="row--item row--item--is-grow">
            <DatePicker v-model="closedAt" :disabled="!closed" inputId="closedAt" showIcon iconDisplay="input"/>
            <label for="closedAt">geschlossen am</label>
          </FloatLabel>
          <div class="closedToggle row--item row--item--is-centered">
            <ToggleSwitch v-model="closed" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .closedToggle {
    padding-inline: 1em;
  }
  #idFintsError {
    --p-inputtext-filled-background: var(--message-color-background-error);
  }
</style>