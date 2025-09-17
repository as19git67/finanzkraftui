<script setup>
import _ from "lodash";
import {ref, onMounted, computed} from 'vue';
import {useRouter} from 'vue-router';
import {UserStore} from "@/stores/user";
import {AccountStore} from "@/stores/accounts";

const router = useRouter();
const userStore = UserStore();
const accountStore = AccountStore();

defineOptions({
  name: 'BankcontactView'
});

let error = ref('');
let loading = ref(false);

async function loadDataFromServer() {
  error = '';
  loading = true;
  const promises = [];
  promises.push(userStore.getUsers());
  promises.push(accountStore.getAccounts(true));
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
  <div class="page page--is-bankcontact-view">
    <div class="page--header">
      <div class="page--title">Bankkontakt</div>
    </div>
    <div class="page--content">
      <div class="page--content--row">
      </div>
      <div class="page--content--row" v-if="error">
        <div class="error">{{ error }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
