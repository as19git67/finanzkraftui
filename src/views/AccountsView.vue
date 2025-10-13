<script setup>
import _ from "lodash";
import {DateTime} from "luxon";
import {ref, onMounted, computed} from 'vue';
import {useRouter} from 'vue-router';
import {UserStore} from "@/stores/user";
import {AccountStore} from "@/stores/accounts";
import {MasterDataStore} from "@/stores/masterdata";
import {OnlineBankingStore} from "@/stores/onlinebanking";

const router = useRouter();
const userStore = UserStore();
const accountStore = AccountStore();
const masterDataStore = MasterDataStore();
const onlinebankingStore = OnlineBankingStore();

defineOptions({
  name: 'AccountsView'
});

const error = ref('');
const loading = ref(false);
const accountsEnriched = ref([]);

function enrichAccounts(tanInfo) {
  accountsEnriched.value = accountStore.accounts.map(account => {
    const currencyDetails = masterDataStore.getCurrencyDetails(account.currency);
    const typeDetails = masterDataStore.getAccountTypeDetails(account.type);
    const balanceDateStr = account.balanceDate ? DateTime.fromISO(account.balanceDate).toLocaleString() : '';
    const closedDateStr = account.closedAt ? DateTime.fromISO(account.closedAt).toLocaleString() : '';
    const readerNames = mapToUserEmail(account.reader);
    const writerNames = mapToUserEmail(account.writer);
    const fintsTanChallenge = tanInfo?.idAccount === account.id ? tanInfo.tanChallenge : undefined;
    const fintsTanReference = tanInfo?.idAccount === account.id ? tanInfo.tanReference : undefined;
    return {
      ...account,
      currencyStr: currencyDetails ? currencyDetails.short : '',
      accountTypeStr: typeDetails ? typeDetails.name : '',
      balanceDateStr,
      closedDateStr,
      readerNames,
      writerNames,
      fintsProgress: '',
      fintsTanChallenge,
      fintsTanReference,
    }
  });
}

async function loadDataFromServer() {
  try {
    error.value = '';
    loading.value = false;
    const promises = [];
    promises.push(userStore.getUsers());
    promises.push(accountStore.getAccounts(true));
    promises.push(masterDataStore.getCurrencies(true));
    promises.push(masterDataStore.getAccountTypes(true));
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
      error.value = 'Fehler beim Laden der Daten';
    }
  } catch (ex) {
    error.value = ex.message;
    console.log(error);
  } finally {
    loading.value = false;
  }
}

function mapToUserEmail(userIds) {
  return userIds.map(userId => {
    const user = userStore.getUser(userId);
    if (user) {
      return {
        email: user.Email,
        initials: user.Initials ? user.Initials : user.Email,
      };
    }
    return '';
  });
}

async function downloadBankStatements(account) {
  try {
    account.fintsProgress = 'loading';
    const result = await onlinebankingStore.downloadStatements(account.id, account.fintsTanReference, account.fintsTan);
    loading.value = true;
    await loadDataFromServer();
    result.resultData.tanInfo.idAccount = account.id;
    enrichAccounts(result.resultData.tanInfo);
  } catch (error) {
    error.value = error.message;
  }
  finally {
    loading.value = false;
    account.fintsProgress = '';
  }
}

async function continueFintsStatementDownloadWithTan(account) {
  await downloadBankStatements(account);
}

onMounted(async () => {
  error.value = '';
  loading.value = false;
  if (userStore.isAuthenticated) {
    try {
      await loadDataFromServer();
      enrichAccounts();
    } catch (ex) {
      error.value = ex.message;
      loading.value = false;
    }
  } else {
    router.replace({name: 'login'});
  }
});
</script>

<template>
  <div class="page page--is-accounts-view">
    <div class="page--header">
      <div class="page--title">Alle Konten</div>
    </div>
    <div class="page--content">
      <div class="page--content--row">
        <div class="data--list data--list--standard" v-if="accountsEnriched.length">
          <div v-for="(item, index) of accountsEnriched" :key="item"
               class="data--list__item"
               :class="{ 'account-closed': !!item.closedAt }">

            <div class="data--list__left">
              <router-link :to="{ path:'/account/:accountId', name: 'AccountDetail', params: { accountId: item.id }}">
                <div class="data--list__line data--list__line--bold data--list__line--space-between">
                  <span>{{ item.name }}</span>
                  <span>{{ item.accountTypeStr }}</span>
                </div>
                <div class="data--list__line data--list__line--space-between data--list__line--error"
                     v-if="item.fintsError">
                  <span v-if="item.fintsError">FinTS Fehler: {{ item.fintsError }}</span>
                </div>
                <div class="data--list__line data--list__line--space-between data--list__line--error"
                     v-if="item.fintsAuthRequired">
                  <span>TAN Freigabe notwendig</span>
                  <span v-if="item.fintsTanChallenge">{{item.fintsTanChallenge}}</span>
                </div>
                <div class="data--list__line data--list__line--space-between" v-if="item.closedAt">
                  {{ `Konto geschlossen: ${item.closedDateStr}` }}
                </div>
                <div class="data--list__line data--list__line--space-between">
                  <span v-if="item.balance">Saldo: {{ item.balance }}{{ item.currencyStr }}</span>
                  <span v-if="item.balanceDateStr">aktualisiert: {{ item.balanceDateStr }}</span>
                </div>
                <div class="data--list__line">
                  <span v-if="item.bankcontactName && item.fintsAccountNumber && item.fintsActivated">Automatischer Umsatzabruf mit Bankkontakt: {{ item.bankcontactName }}</span>
                  <span v-if="item.bankcontactName && item.fintsAccountNumber && !item.fintsActivated">Manueller Umsatzabruf mit Bankkontakt: {{ item.bankcontactName }}</span>
                </div>
                <div class="data--list__line">
                    <span v-for="(writer, index) of item.writerNames" :key="writer">
                      <Chip class="element--is-chip" :label="writer.initials" icon="pi pi-pencil"
                            :title="writer.email"/>
                    </span>
                  <span v-for="(reader, index) of item.readerNames" :key="reader">
                      <Chip class="element--is-chip" :label="reader.initials" icon="pi pi-eye" :title="reader.email"/>
                    </span>
                </div>
              </router-link>
            </div>
            <div class="data--list__right">
              <Button v-if="item.bankcontactName && item.fintsAccountNumber && item.fintsAuthRequired && !item.fintsTanChallenge"
                      :disabled="item.fintsProgress === 'loading' || loading"
                      @click="downloadBankStatements(item)"
                      @keydown.enter="downloadBankStatements(item)"
                      icon="pi pi-download" title="Umsätze von der Bank laden"/>
              <Button v-if="item.bankcontactName && item.fintsAccountNumber && item.fintsAuthRequired && item.fintsTanChallenge"
                      :disabled="item.fintsProgress === 'loading' || loading"
                      @click="continueFintsStatementDownloadWithTan(item)"
                      @keydown.enter="continueFintsStatementDownloadWithTan(item)"
                      icon="pi pi-forward" title="Weiter" severity="warn"/>
              <ProgressSpinner class="progress-spinner" strokeWidth="5"
                               v-if="item.bankcontactName && item.fintsAccountNumber && item.fintsProgress === 'loading'"/>
            </div>
          </div>
        </div>
      </div>
      <div class="page--content--row" v-if="error">
        <div class="error">{{ error }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.progress-spinner {
  width: 32px;
  height: 32px;
  --p-progressspinner-color-one: var(--message-color-background-error);
  --p-progressspinner-color-two: var(--message-color-background-error);
  --p-progressspinner-color-three: var(--message-color-background-error);
  --p-progressspinner-color-four: var(--message-color-background-error);
}
.account-closed {
  color: var(--amaranth-pink);
}
</style>
