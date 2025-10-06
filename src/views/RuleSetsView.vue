<script setup>
import {UserStore} from '@/stores/user';
import {TransactionStore} from "@/stores/transactions";
import {AccountStore} from "@/stores/accounts";
import {OnlineBankingStore} from "@/stores/onlinebanking";
import {computed, onMounted, ref, watch} from 'vue';
import {useRouter} from 'vue-router';
import _ from "lodash";

defineOptions({
  name: 'RuleSetsView'
});

const router = useRouter();
const userStore = UserStore();
const transactionStore = TransactionStore();
const onlinebankingStore = OnlineBankingStore();
const accountStore = AccountStore();
const menuPermissions = computed(() => userStore.menuPermissions);

const error = ref('');
const loading = ref(false);
const newRuleSetName = ref('');
const ruleSets = ref([]);
const accounts = ref([]);
const downloading = ref(false);

onMounted(async () => {
  await loadDataFromServer();
  prepareDataForPresentation();
});

function prepareDataForPresentation() {
  const allAccounts = accountStore.accounts;
  accounts.value = allAccounts.filter(account => {
    return account.idBankcontact && account.fintsAccountNumber;
  });
}

async function loadDataFromServer() {
  try {
    error.value = '';
    loading.value = false;
    const promises = [];
    promises.push(userStore.getUsers());
    promises.push(accountStore.getAccounts(true));
    promises.push(transactionStore.getRuleSets());
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

async function createNewRule() {
  error.value = "";
}

async function downloadStatements() {
  try {
    downloading.value = true;
    for (let i = 0; i < accounts.value.length; i++) {
      const account = accounts.value[i];
      if (account.fintsActivated) {
        account.fintsProgress = 'loading';
        const resultData = await onlinebankingStore.downloadStatements(account.id);
        account.fintsProgress = '';

        // refresh account data after each download
        await loadDataFromServer();
        prepareDataForPresentation();
      }
    }
  } catch (error) {
    error.value = error.message;
  }
  finally {
    downloading.value = false;
  }
}
</script>

<template>
  <div class="page page--is-rulesets-view">
    <div class="page--header">
      <div class="page--title">
        <span v-if="loading">Regeln laden...</span>
        <span v-if="!loading" class="element--is-grow element--is-centered">Regeln</span>
      </div>
    </div>
    <div class="page--content">
      <div class="page--content--row" v-if="menuPermissions['admin.rule']">
        <div class="page--content--row__inline">
          <FloatLabel variant="in" class="row--item row--item--is-grow">
            <InputText id="idName" v-model=newRuleSetName size="small" class="prevent-scroll"></InputText>
            <label for="idName">Name der neuen Regel:</label>
          </FloatLabel>
          <Button :disabled="!newRuleSetName" size="small" @click="createNewRule" label="Neu"
                  icon="pi pi-plus"></Button>
        </div>
      </div>
      <div class="page--content--row">
        <div class="data--list data--list--standard" v-if="ruleSets.length">
          <div v-for="(item, index) of ruleSets" :key="item" class="data--list__item">
            <div class="data--list__left">
              <router-link :to="{ path:'/ruleSetEdit/:ruleSetId', name: 'RuleSetEdit', params: { ruleSetId: item.id }}">
                {{ item.name }}
              </router-link>
            </div>
            <div class="data--list__right">
              <Button icon="pi pi-caret-right" severity="contrast" variant="text" rounded aria-label="Ändern">
                <router-link
                    :to="{ path:'/ruleSetEdit/:ruleSetId', name: 'RuleSetEdit', params: { ruleSetId: item.id }}">
                  {{ item.name }}
                </router-link>
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Divider/>
      <div class="page--header">
        <div class="page--title">
          <span v-if="!loading" class="element--is-grow element--is-centered">Umsatzabruf</span>
        </div>
      </div>
      <div class="page--content--row">
        <div class="data--list data--list--standard" v-if="accounts.length">
          <div v-for="(item, index) of accounts" :key="item" class="data--list__item">
            <div class="data--list__left">
              <router-link :to="{ path:'/account/:accountId', name: 'AccountDetail', params: { accountId: item.id }}">
                <div class="data--list__line data--list__line--space-between">
                  <span>{{ item.name }}</span>
                </div>
                <div class="data--list__line data--list__line--error" v-if="item.fintsError">
                  <span>{{item.fintsError}}</span>
                </div>
                <div class="data--list__line data--list__line--error" v-if="item.fintsAuthRequired">
                  <span>Freigabe mit TAN notwendig</span>
                </div>
              </router-link>
            </div>
            <div v-if="item.fintsActivated" class="data--list__right">
              <ProgressSpinner class="progress-spinner" strokeWidth="5" v-if="item.fintsProgress === 'loading'" />
            </div>
            <div v-else class="data--list__right">
              <i class="pi pi-ban" style="color: var(--hot-pink)"></i>
            </div>
          </div>
        </div>
      </div>
      <div class="page--content--row" v-if="menuPermissions['admin.statements_download']">
        <div class="page--content--row__inline">
          <Button size="small" @click="downloadStatements" label="Umsätze herunterladen"
                  icon="pi pi-download" :disabled="downloading"></Button>
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
  width: 1em;
  height: 1em;
  --p-progressspinner-color-one: var(--message-color-text-info);
  --p-progressspinner-color-two: var(--message-color-text-info);
  --p-progressspinner-color-three: var(--message-color-text-info);
  --p-progressspinner-color-four: var(--message-color-text-info);
}
</style>
