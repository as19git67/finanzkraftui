<script setup>
import _ from "lodash";
import {DateTime} from "luxon";
import {ref, onMounted, computed} from 'vue';
import {useRouter} from 'vue-router';
import {UserStore} from "@/stores/user";
import {AccountStore} from "@/stores/accounts";
import {MasterDataStore} from "@/stores/masterdata";

const router = useRouter();
const userStore = UserStore();
const accountStore = AccountStore();
const masterDataStore = MasterDataStore();

defineOptions({
  name: 'AccountsView'
});

let error = ref('');
let loading = ref(false);

const accountsEnriched = computed(() => {
    return accountStore.accounts.map(account => {
      const currencyDetails = masterDataStore.getCurrencyDetails(account.currency);
      const typeDetails = masterDataStore.getAccountTypeDetails(account.type);
      const balanceDateStr = account.balanceDate ? DateTime.fromISO(account.balanceDate).toLocaleString() : '';
      const closedDateStr = account.closedAt ? DateTime.fromISO(account.closedAt).toLocaleString() : '';
      const readerNames = mapToUserEmail(account.reader);
      const writerNames = mapToUserEmail(account.writer);
      return {
        ...account,
        currencyStr: currencyDetails ? currencyDetails.short : '',
        accountTypeStr: typeDetails ? typeDetails.name : '',
        balanceDateStr,
        closedDateStr,
        readerNames,
        writerNames,
      }
    });
});

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
        email : user.Email,
        initials: user.Initials ? user.Initials : user.Email,
      };
    }
    return '';
  });
}

function navigateToAccountDetail(idAccount) {
  router.push({ name: 'AccountDetail', params: { accountId: idAccount } });
}

onMounted(async () => {
  error = '';
  loading = false;
  if (userStore.isAuthenticated) {
    try {
      await loadDataFromServer();
    } catch (ex) {
      error = ex.message;
      loading = false;
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
                <div class="data--list__line data--list__line--bold data--list__line--space-between">
                  <span>{{ item.name }}</span>
                  <span>{{ item.accountTypeStr }}</span>
                </div>
                <div class="data--list__line data--list__line--space-between data--list__line--error" v-if="item.fintsError">
                  <span v-if="item.fintsError" >FinTS Fehler: {{item.fintsError}}</span>
                </div>
                <div class="data--list__line data--list__line--space-between data--list__line--error" v-if="item.fintsAuthRequired">
                  <span>TAN Freigabe notwendig</span>
                </div>
                <div class="data--list__line data--list__line--space-between" v-if="item.closedAt">{{ `Konto geschlossen: ${item.closedDateStr}` }}</div>
                <div class="data--list__line data--list__line--space-between">
                  <span v-if="item.balance">Saldo: {{ item.balance }}{{item.currencyStr}}</span>
                  <span v-if="item.balanceDateStr">aktualisiert: {{item.balanceDateStr}}</span>
                </div>
                <div class="data--list__line">
                  <span v-if="item.bankcontactName">Umsatzabruf mit Bankkontakt: {{ item.bankcontactName }}</span>
                </div>
                <div class="data--list__line">
                  <span v-for="(writer, index) of item.writerNames" :key="writer" >
                    <Chip class="element--is-chip" :label="writer.initials" icon="pi pi-pencil" :title="writer.email"/>
                  </span>
                  <span v-for="(reader, index) of item.readerNames" :key="reader" >
                    <Chip class="element--is-chip" :label="reader.initials" icon="pi pi-eye" :title="reader.email"/>
                  </span>
                </div>
              </div>
              <div class="data--list__right">
                <Button @click="navigateToAccountDetail(item.id)" @keydown.enter="navigateToAccountDetail(item.id)" icon="pi pi-caret-right" severity="contrast" variant="text" rounded aria-label="Ändern" />
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
.account-closed {
  color: var(--amaranth-pink);
}
</style>
