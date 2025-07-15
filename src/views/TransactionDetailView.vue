<script setup>
import _ from "lodash";
import {DateTime, Settings as DateTimeSettings} from 'luxon';
import {ref, onMounted, computed, watch} from 'vue';
import {useRouter} from 'vue-router';
import {UserStore} from "@/stores/user";
import {AccountStore} from "@/stores/accounts";
import {MasterDataStore} from "@/stores/masterdata";
import {TransactionStore} from '@/stores/transactions';
import {useConfirm} from "primevue/useconfirm";

const router = useRouter();
const userStore = UserStore();
const accountStore = AccountStore();
const masterDataStore = MasterDataStore();
const transactionStore = TransactionStore();


const props = defineProps({
  transactionId: {type: String},
});

defineOptions({
  name: 'TransactionDetailView',
});

const confirm = useConfirm();

let dataChanged = _.debounce(handleDataChanged, 2000);

let updateData = ref({});
let stopUpdating = false;
let transaction = {};

let error = ref('');
let loading = ref(false);
let transactionLoaded = ref(false);
let transactionConfirmed = ref(false);
let canDelete = ref(false);
let amazonOrderId = ref('');
let transactionAmount = ref(0);
let transactionEntryText = ref('');
let transactionText = ref('');
let transactionNotes = ref('');
let transactionPayee = ref('');
let transactionPayeeShortened = ref('');
let transactionDate = ref('');
let transactionCategory = ref({});
let transactionMREF = ref('');
let transactionEREF = ref('');
let transactionCRED = ref('');
let transactionAccountName = ref('');
let transactionPayeePayerAcctNo = ref('');
let transactionRuleSetId = ref();
let transactionRuleSetName = ref('');
let filteredCategories = ref([]);

onMounted(async () => {
  error = '';
  loading = true;

  if (!props.transactionId) {
    await router.replace('/');
    return;
  }

  transactionStore.setCurrentTransactionId(props.transactionId);
  await loadDataFromServer();
  loading = false;
 });

watch(transactionNotes, (val, oldVal) => {
  if (transaction === undefined) {
    return;
  }
  if (transaction.t_notes === val) {
    return;
  }
  updateData.value.t_notes = val;
});

watch(transactionCategory, (val, oldVal) => {
  if (transaction === undefined) {
    return;
  }
  if (!_.isObject(val)) {
    return;
  }

  if (transaction.category_id === val.id) {
    // did not change
    return;
  }

  updateData.value.category_id = val.id;
  // if (masterDataStore.categories.length > 0) {
  //   transaction.category_name = masterDataStore.getCategoryById(val.id).full_name;
  // } else {
  //   transaction.category_name = '';
  // }
});

watch(transactionPayee, (val, oldVal) => {
    if (oldVal === undefined || transaction.value === undefined) {
      return;
    }
    if (transaction.value.t_payee === val) {
      return;
    }
    updateData.value.t_payee = val;
});

let dirty = computed(() => {
  const keyCount = Object.keys(updateData.value).length;
  if (keyCount === 1 && updateData.value.confirmed !== undefined) {
    return false;
  }
  return keyCount > 0;
});

async function loadDataFromServer() {
  error = '';
  loading = true;
  const promises = [];
  promises.push(transactionStore.getTransaction(props.transactionId));
  promises.push(masterDataStore.getCategories());
  promises.push(accountStore.getAccounts());
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
        console.log(result);
        error = 'Fehler beim Laden der Daten';
        transaction = ref({});
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
    transactionLoaded.value = false;
    return;
  }

  transaction = {...(results[0].data)};
  initReactiveData();
  transactionLoaded.value = true;

  if (!transaction.confirmed) {
    updateData.value.confirmed = true;
    dataChanged();
  }
}

function initReactiveData() {
  const account = accountStore.getAccountById(transaction.account_id);
  canDelete = account.type === 'cash';

  transactionCategory.value = _.find(masterDataStore.categories, (item) => {
    return item.id === transaction.category_id;
  });

  transactionConfirmed.value = transaction.confirmed;
  transactionDate.value = new Date(transaction.t_value_date);
  transactionAmount.value = transaction.t_amount;
  transactionNotes.value = transaction.t_notes;
  transactionText.value = transaction.t_text;
  transactionPayee.value = transaction.t_payee;
  transactionPayeeShortened.value = transaction.payeeShortened;
  transactionEntryText.value = transaction.t_entry_text;
  transactionMREF.value = transaction.t_MREF;
  transactionEREF.value = transaction.t_EREF;
  transactionCRED.value = transaction.t_CRED;
  transactionAccountName.value = transaction.account_name;
  transactionPayeePayerAcctNo.value = transaction.t_payeePayerAcctNo;
  if (transaction.t_text && transaction.t_payee &&
      transaction.t_payee.startsWith('AMAZON')) {
    const matches = transaction.t_text.match(/(\d{3}\-\d{7}\-\d{7})/);
    if (matches.length > 0) {
      amazonOrderId.value = matches[0];
    } else {
      amazonOrderId.value = '';
    }
  }
  transactionRuleSetId.value = transaction.rule_set_id;
  transactionRuleSetName.value = transaction.rule_set_name;
}

function searchCategory(event) {
  if (!event.query.trim().length) {
    filteredCategories.value = [...masterDataStore.categories];
  } else {
    filteredCategories.value = masterDataStore.categories.filter((category) => {
      return category.full_name.toLowerCase().indexOf(event.query.toLowerCase()) >= 0;
    });
  }
}

function cancel() {
  router.back();
}

function goToTransactionList() {
  router.back();
}

async function saveTransaction() {
  if (await handleDataChanged()) {
    goToTransactionList();
  }
}

async function handleDataChanged() {
  if (stopUpdating) {
    // no transaction to update - this can happen if transaction was deleted in the meanwhile
    return false;
  }
  error = undefined;
  updateData.value.id = props.transactionId;
  const result = await transactionStore.updateTransaction(updateData.value);
  let not_ok = false;
  let mustAuthenticate = false;
  let status = result.status;
  switch (status) {
    case 401:
      mustAuthenticate = true;
      break;
    case 403:
      error = 'Keine Berechtigung zum Ändern der Buchung';
      not_ok = true;
      break;
    case 200:
      break;
    default:
      not_ok = true;
  }
  if (mustAuthenticate) {
    error = 'Benutzer muss angemeldet sein';
    return false;
  }
  if (not_ok) {
    if (!error.value) {
      error = result.message;
    }
    return false;
  }

  if (updateData.value.confirmed !== undefined) {
    transaction.confirmed = updateData.value.confirmed;
  }
  if (updateData.value.category_id !== undefined) {
    transaction.category_id = updateData.value.category_id;
  }
  if (updateData.value.t_notes !== undefined) {
    transaction.t_notes = updateData.value.t_notes;
  }
  initReactiveData();
  updateData.value = {};

  return true;
}

async function markUnconfirmed() {
  updateData.value.confirmed = false;
  await handleDataChanged();
}

function deleteTheTransaction() {
  confirm.require({
    message: 'Soll diese Buchung wirklich gelöscht werden?',
    header: 'Buchung löschen',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Abbrechen',
    rejectProps: {
      label: 'Abbrechen',
      severity: 'secondary',
      outlined: true,
    },
    acceptProps: {
      label: 'Löschen',
      severity: 'danger',
    },
    accept: async () => {
      error = undefined;
      try {
        const result = await transactionStore.deleteTransaction(props.transactionId);
        if (result.status !== 200) {
          error = result.message;
          return;
        }
        // this transaction is no more available - in case debounced handleDataChanged for confirmed flag gets called
        stopUpdating = true;
        router.back();
      } catch (ex) {
        error = ex.message;
        console.log(ex);
      }
    },
    reject: () => {
      // do nothing when delete is canceled
    },
  });
}

</script>

<template>
  <div class="page page--is-transaction-detail-view">
    <div class="page--header">
      <div class="page--title title__with-buttons">
        <Button label="Abbrechen" @click="cancel">
        </Button>
        Buchungsdetails
        <Button label="Speichern" :disabled="!dirty" @click="saveTransaction">
        </Button>
      </div>
    </div>
    <div class="page--content">
      <div class="page--content--row" v-if="transactionPayeeShortened">
        <div class="row--item row--item--is-centered row--item--is-emphasized" title="{{transactionPayee}}">
          {{ transactionPayeeShortened }}
        </div>
      </div>
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <AutoComplete id="catSelection" v-model="transactionCategory"
                        optionLabel="full_name"
                        dropdown size="small"
                        :suggestions="filteredCategories" @complete="searchCategory"/>
          <label for="catSelection">Kategorie</label>
        </FloatLabel>
      </div>
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputText id="idTransactionNotes" v-model="transactionNotes"></InputText>
          <label for="idTransactionNotes">Notiz</label>
        </FloatLabel>
      </div>
      <div class="page--content--row">
        <div class="page--content--row__inline">
          <FloatLabel variant="in" class="row--item row--item--is-grow">
            <InputNumber id="idTransactionAmount" locale="de-DE"
                         inputmode="decimal" currency="EUR"
                         mode="currency" v-model="transactionAmount"
                         readonly size="large" variant="filled"/>
            <label for="idTransactionAmount">Betrag</label>
          </FloatLabel>
        </div>
      </div>
      <div class="page--content--row">
        <div class="page--content--row__inline">
          <FloatLabel variant="in" class="row--item row--item--is-grow">
            <DatePicker v-model="transactionDate" inputId="transactionDate" showIcon readonly
                        iconDisplay="input"
                        variant="filled"/>
            <label for="transactionDate">Buchungsdatum</label>
          </FloatLabel>
        </div>
      </div>

      <div class="page--content--row" v-if="transactionEntryText">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputText id="idTransactionEntryText" v-model="transactionEntryText" variant="filled"
                     readonly/>
          <label for="idTransactionEntryText">Buchungstyp</label>
        </FloatLabel>
      </div>
      <div class="page--content--row" v-if="transactionText">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <Textarea id="idTransactionText" v-model="transactionText" variant="filled"
                    readonly size="small" autoResize></Textarea>
          <label for="idTransactionText">Text</label>
        </FloatLabel>
      </div>
      <div class="page--content--row" v-if="transactionMREF">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputText id="idTransactionMREF" v-model="transactionMREF" variant="filled"
                     readonly size="small"/>
          <label for="idTransactionMREF">Mandatsreferenz</label>
        </FloatLabel>
      </div>

      <div v-if="amazonOrderId" class="page--content--row">
        <div class="row--item">
          <Button as="a"
                  label="Bestellung in Amazon anzeigen"
                  :href="`https://www.amazon.de/gp/your-account/order-details?ie=UTF8&orderID=${amazonOrderId}`"
                  target="_blank" rel="noopener"/>
        </div>
      </div>

      <div class="page--content--row" v-if="transactionAccountName">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputText id="idTransactionAccountName" v-model="transactionAccountName" variant="filled"
                     readonly size="small"/>
          <label for="idTransactionAccountName">Konto</label>
        </FloatLabel>
      </div>
      <div class="page--content--row" v-if="transactionPayeePayerAcctNo">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputText id="idTransactionPayeePayeeAcctNo" v-model="transactionPayeePayerAcctNo" variant="filled"
                     readonly size="small"/>
          <label for="idTransactionPayeePayeeAcctNo">Zahlungsempfänger</label>
        </FloatLabel>
      </div>
      <div class="page--content--row" v-if="transactionEREF">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputText id="idTransactionEREF" v-model="transactionEREF" variant="filled"
                     readonly size="small"/>
          <label for="idTransactionEREF">ERef</label>
        </FloatLabel>
      </div>
      <div class="page--content--row" v-if="transactionCRED">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputText id="idTransactionCRED" v-model="transactionCRED" variant="filled"
                     readonly size="small"/>
          <label for="idTransactionCRED">Lieferant</label>
        </FloatLabel>
      </div>
      <div class="page--content--row" v-if="transactionLoaded">
        <div class="row--item">
          <Button asChild v-slot="slotProps" variant="link">
            <RouterLink append :to="{ path:'/', name: 'home'}" :class="slotProps.class">Tags bearbeiten</RouterLink>
          </Button>
        </div>
      </div>
      <div class="page--content--row" v-if="transactionRuleSetId">
        <div class="row--item">
          <router-link class="action" append :to="{ name: 'TransactionRules', state: { ruleSetId: transactionRuleSetId }, meta: { ruleSetId: transactionRuleSetId } }">Regeln<span>({{ transactionRuleSetName }})</span></router-link>
        </div>
      </div>
      <div class="page--content--row" v-if="error">
        <div class="error">{{ error }}</div>
      </div>
      <div class="page--content--row" v-if="canDelete">
        <div class="row--item row--item--is-centered">
          <Button label="Löschen" severity="danger" @click="deleteTheTransaction" size="large"/>
        </div>
      </div>
      <ConfirmDialog></ConfirmDialog>
    </div>
  </div>
</template>

<style scoped>
</style>
