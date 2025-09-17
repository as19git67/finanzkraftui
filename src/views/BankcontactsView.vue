<script setup>
import _ from "lodash";
import {ref, onMounted, computed} from 'vue';
import {useRouter} from 'vue-router';
import {UserStore} from "@/stores/user";
import {OnlineBankingStore} from "@/stores/onlinebanking";

const router = useRouter();
const userStore = UserStore();
const onlinebankingStore = OnlineBankingStore();

defineOptions({
  name: 'BankcontactsView'
});

let error = ref('');
let loading = ref(false);
let bankcontacts = ref([]);

async function loadDataFromServer() {
  error = '';
  loading = true;
  const promises = [];
  promises.push(userStore.getUsers());
  promises.push(onlinebankingStore.getBankcontacts(true));
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

  this.bankcontacts.value = onlinebankingStore.bankcontacts;
}

function navigateToBankcontactDetail(idAccount) {
  router.push({ name: 'BankcontactDetail', params: { accountId: idAccount } });
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
  <div class="page page--is-bankcontacts-view">
    <div class="page--header">
      <div class="page--title">Alle Bankkontakte</div>
    </div>
    <div class="page--content">
      <div class="page--content--row">
        <div class="data--list data--list--standard" v-if="bankcontacts.length">
        </div>
      </div>
      <div class="page--content--row" v-if="error">
        <div class="error">{{ error }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
