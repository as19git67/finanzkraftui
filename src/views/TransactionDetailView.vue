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
let payees = [];

let error = ref('');
let loading = ref(false);
let transactionLoaded = ref(false);
let transactionConfirmed = ref(false);
let isCash = ref(false);
let isSpending = ref(true);
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
let transactionTags = ref([]);
let transactionTagsList = ref([]);
let filteredCategories = ref([]);
let filteredPayees = ref([]);

onMounted(async () => {
  if (!props.transactionId) {
    await router.replace('/');
    return;
  }

  transactionStore.setCurrentTransactionId(props.transactionId);
  await loadDataFromServer();
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

watch(transactionText, (val, oldVal) => {
  if (transaction === undefined) {
    return;
  }
  if (transaction.t_text === val) {
    delete updateData.value.t_text;
    return;
  }
  updateData.value.t_text = val;
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
});

watch(transactionTags, (val, oldVal) => {
  if (transaction === undefined) {
    return;
  }
  if (!_.isObject(val)) {
    return;
  }

  const selectedTagIds = transactionTags.value.toSorted();
  const transactionTagIds = transaction.tagIds.toSorted();

  if (_.isEqual(selectedTagIds, transactionTagIds)) {
    // did not change
    return;
  }

  updateData.value.tagIds = selectedTagIds;
});

watch(transactionPayee, (val, oldVal) => {
  if (transaction === undefined) {
    return;
  }
  if (!_.isString(val)) {
    return;
  }
  if (transaction.t_payee === val) {
    delete updateData.value.t_payee;
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
  error.value = '';
  loading.value = true;
  const promises = [];
  promises.push(transactionStore.getTransaction(props.transactionId));
  promises.push(masterDataStore.getCategories());
  promises.push(masterDataStore.getTags());
  promises.push(accountStore.getAccounts());
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
  extractPayees();

  transactionLoaded.value = true;

  if (!transaction.confirmed) {
    updateData.value.confirmed = true;
    dataChanged();
  }
}

function extractPayees() {
  const p = {};
  transactionStore.transactions.forEach(transaction => {
    const payee = transaction.t_payee;
    if (payee) {
      const trimmed = payee.trim();
      p[trimmed] = trimmed;
    }
  });
  payees = Object.keys(p);
}

function initReactiveData() {
  const account = accountStore.getAccountById(transaction.account_id);
  isCash = account.type === 'cash';
  isSpending = transaction.t_amount < 0;
  transactionCategory.value = _.find(masterDataStore.categories, (item) => {
    return item.id === transaction.category_id;
  });

  transactionConfirmed.value = transaction.confirmed;
  transactionDate.value = new Date(transaction.t_value_date);
  transactionAmount.value = Math.abs(transaction.t_amount);
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

  transactionTags.value = transaction.tagIds ? transaction.tagIds : [];
  transactionTagsList.value = [];
  const transactionTagsListRest = [];
  masterDataStore.tags.forEach(tag => {
    if (transactionTags.value.includes(tag.id )) {
      transactionTagsList.value.push(tag);
    } else {
      transactionTagsListRest.push(tag);
    }
  });
  transactionTagsList.value = transactionTagsList.value.concat(transactionTagsListRest);
}

function searchCategory(event) {
  const searchTerm = event.query.trim().toLowerCase();
  if (!searchTerm.length) {
    filteredCategories.value = [...masterDataStore.categories];
  } else {
    filteredCategories.value = masterDataStore.categories.filter((category) => {
      return category.full_name.toLowerCase().indexOf(searchTerm) >= 0;
    });
  }
}

function searchPayee(event) {
  const searchTerm = event.query.trim().toLowerCase();
  if (!searchTerm.length) {
    filteredPayees.value = [...payees];
  } else {
    filteredPayees.value = payees.filter((payee) => {
      return payee.toLowerCase().indexOf(searchTerm) >= 0;
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
  error.value = '';
  loading.value = true;
  updateData.value.id = props.transactionId;
  const result = await transactionStore.updateTransaction(updateData.value);
  loading.value = false;
  let not_ok = false;
  let mustAuthenticate = false;
  let status = result.status;
  switch (status) {
    case 401:
      mustAuthenticate = true;
      break;
    case 403:
      error.value = 'Keine Berechtigung zum Ändern der Buchung';
      not_ok = true;
      break;
    case 200:
      break;
    default:
      not_ok = true;
  }
  if (mustAuthenticate) {
    error.value = 'Benutzer muss angemeldet sein';
    return false;
  }
  if (not_ok) {
    console.log(result);
    if (!error.value) {
      error.value = result.message;
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
      try {
        error.value = '';
        loading.value = true;
        const result = await transactionStore.deleteTransaction(props.transactionId);
        if (result.status !== 200) {
          error = result.message;
          return;
        }
        // this transaction is no more available - in case debounced handleDataChanged for confirmed flag gets called
        stopUpdating = true;
        router.back();
      } catch (ex) {
        error.value = ex.message;
        console.log(ex);
      } finally {
        loading.value = false;
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
        <Button :label="dirty ? 'Abbrechen' : 'Zurück'" @click="cancel">
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
          <MultiSelect id="tags" fluid filter v-model="transactionTags" :options="transactionTagsList" optionValue="id"
                       optionLabel="tag"/>
          <label for="tags">Tags</label>
        </FloatLabel>
      </div>
      <div class="page--content--row" v-if="isCash">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <AutoComplete id="payeeSelection" class="transactionPayeeSelection"
                        v-model="transactionPayee"
                        :suggestions="filteredPayees" @complete="searchPayee"/>
          <label for="payeeSelection">
            <span v-if="isSpending">Zahlungsempfänger</span>
            <span v-else>Zahler</span>
          </label>
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
                         :readonly="!isCash" size="large" :variant="!isCash ? 'filled' : null"/>
            <label for="idTransactionAmount">Betrag</label>
          </FloatLabel>
          <ToggleButton v-model="isSpending" onLabel="Ausgabe" offLabel="Einnahme" onIcon="pi pi-minus"
                        :readonly="!isCash"
                        offIcon="pi pi-plus" size="large"/>
        </div>
      </div>
      <div class="page--content--row">
        <div class="page--content--row__inline">
          <FloatLabel variant="in" class="row--item row--item--is-grow">
            <DatePicker v-model="transactionDate" inputId="transactionDate" showIcon
                        :readonly="!isCash"
                        iconDisplay="input"
                        :variant="!isCash ? 'filled' : null"/>
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
          <Textarea id="idTransactionText" v-model="transactionText"
                    :variant="!isCash ? 'filled' : null"
                    :readonly="!isCash"
                    size="small" autoResize></Textarea>
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
      <div class="page--content--row" v-if="transactionRuleSetId">
        <div class="row--item">
          <router-link class="action" append :to="{ name: 'TransactionRules', state: { ruleSetId: transactionRuleSetId }, meta: { ruleSetId: transactionRuleSetId } }">Regeln<span>({{ transactionRuleSetName }})</span></router-link>
        </div>
      </div>
      <div class="page--content--row" v-if="error">
        <div class="error">{{ error }}</div>
      </div>
      <div class="page--content--row" v-if="isCash">
        <div class="row--item row--item--is-centered">
          <Button label="Löschen" severity="danger" @click="deleteTheTransaction" size="large"/>
        </div>
      </div>
      <ConfirmDialog></ConfirmDialog>
    </div>
  </div>
</template>

<style scoped>
.transactionPayeeSelection,
.transactionPayeeSelection > * {
  display: flex;
  flex-grow: 1;
  flex-basis: 100%;
  width: 100%;
}
</style>
