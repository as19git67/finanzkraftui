<script setup>
import _ from 'lodash';
import {DateTime} from 'luxon';
import {AccountStore} from '@/stores/accounts';
import {UserStore} from '@/stores/user';
import {MasterDataStore} from '@/stores/masterdata';
import {OnlineBankingStore} from '@/stores/onlinebanking';
import {computed, onMounted, ref} from 'vue';
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

let error = ref('');
let loading = ref(false);
let name = ref('');
let iban = ref('');
let startBalance = ref(0);
let closed = ref(false);
let closedAt = ref(DateTime.now().toJSDate());
let originalData = ref({});
let typeObj = ref({});
let currencyObj = ref({});
let reader = ref([]);
let writer = ref([]);
let selectedBankcontact = ref({});

onMounted(async () => {
  error = undefined;
  loading = false;
  try {
    await loadDataFromServer();
  } catch (ex) {
    error = ex.message;
    loading = false;
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
      originalData.type !== typeObj.value.id ||
      originalData.iban !== iban.value ||
      originalData.idBankcontact !== selectedBankcontact.value?.id ||
      originalData.currency !== currencyObj.value.id ||
      originalData.startBalance !== startBalance.value ||
      originalClosedAt !== ca.substring(0, 10) ||
      !_.isEqual(originalData.reader, integerSort(reader.value)) ||
      !_.isEqual(originalData.writer, integerSort(writer.value));
});

let type = computed(() => {
  if (typeObj) {
    return typeObj.code;
  }
  return '';
});

let currency = computed(() => {
  if (currencyObj) {
    return currencyObj.id;
  }
  return '';
});

let currencyName = computed(() => {
  if (currencyObj) {
    return currencyObj.name;
  }
  return '';
});

function integerSort(arr) {
  return arr.sort(function(a, b) {
    return a - b;
  });
}

async function loadDataFromServer() {
  error = '';
  loading = true;
  const promises = [];
  promises.push(userStore.getUsers());
  promises.push(accountStore.getAccounts());
  promises.push(masterDataStore.getCurrencies());
  promises.push(masterDataStore.getAccountTypes());
  promises.push(onlineBankingStore.getBankcontacts());
  const results = await Promise.all(promises);
  loading = false;
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
  }
  currencyObj.value = _.find(masterDataStore.currencies, (item) => {
    return item.id === data.currency;
  });
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
  if (originalData.idBankcontact !== selectedBankcontact.value?.id) {
    if (selectedBankcontact.value === null) {
      updateData.idBankcontact = null;
    } else {
      updateData.idBankcontact = selectedBankcontact.value?.id;
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
  error = undefined;
  loading = false;
  try {
    const updateData = createUpdateData();
    await accountStore.updateAccount(updateData);

    await loadDataFromServer();
    router.replace({name: 'Accounts'});
  } catch (ex) {
    error = ex.message;
    loading = false;
    console.log(error);
  }
}

function cancel() {
  router.replace({name: 'Accounts'});
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
      <div class="page--content--row" v-if="typeObj.id !== 'cash'">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <Select class="row--item" id="bankcontact" fluid v-model="selectedBankcontact" :options="onlineBankingStore.bankcontacts"
                  optionLabel="name" showClear/>
          <label for="bankcontact">FinTS Bankkontakt</label>
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
</style>