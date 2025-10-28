<script setup>
import _ from 'lodash';
import {computed, onMounted, ref, useTemplateRef, watch} from 'vue';
import {UserStore} from '@/stores/user';
import {useRouter} from "vue-router";

defineOptions({
  name: 'UsersView'
});

const router = useRouter();
const userStore = UserStore();

const newUserName = ref('');
const error = ref('');
const loading = ref(false);

const menuPermissions = computed(() => userStore.menuPermissions);
const users = computed(() => userStore.users);

async function loadDataFromServer() {
  error.value = '';
  loading.value = true;
  try {
    const promises = [];
    promises.push(userStore.getUsers());
    const results = await Promise.all(promises);
    loading.value = false;
    let mustAuthenticate = false;
    let notAuthorized = false;
    let not_ok = false;
    let message = '';
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
          if (!message) {
            message = result.message;
          }
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
      error.value = message;
    }
  } catch (ex) {
    error.value = ex.message;
    loading.value = false;
  }
}

function navigateToUserDetails(item) {
  router.push({ path: `/userEdit/${item.id}`, name: 'UserEdit', params: { userId: item.id } });
}

onMounted(async () => {
  error.value = null;
  newUserName.value = '';
  await loadDataFromServer();
});
</script>

<template>
  <div class="page page--is-users-list-view">
    <div class="page--header">
      <div class="page--title">
        <span v-if="loading">Benutzerliste laden...</span>
        <span v-if="!loading" class="element--is-grow element--is-centered">Benutzerliste</span>
      </div>
    </div>
    <div class="page--content table-scroll">
      <div class="page--content--row">
        <div class="data--list data--list--standard" v-if="users.length">
          <div v-for="(item, index) of users" :key="item" class="data--list__item">
            <div class="data--list__left">
              <router-link v-if="menuPermissions['admin.user.edit']" class="action"
                           :to="{ path:'/userEdit/:userId', name: 'UserEdit', params: { userId: item.id }}">
                <div class="data--list__line data--list__line--bold data--list__line--space-between">
                  <span v-if="item.EmailConfirmed">{{ item.Email }} (bestätigt)</span>
                  <span v-else>{{ item.Email }} (nicht bestätigt)</span>
                  <span>{{ item.Initials }}</span>
                </div>
                <div class="data--list__line" v-if="item.Roles && item.Roles.length">
                    <span v-for="(role, index) of item.Roles" :key="role.id">
                      <Chip class="element--is-chip" :label="role.Name"
                            :title="role.Name"/>
                    </span>
                </div>
                <div class="data--list__line data--list__line--space-between">
                  <span v-if="item.ExpiredAfterFormatted">Gesperrt ab: {{ item.ExpiredAfterFormatted }}</span>
                  <span v-if="item.balanceDateStr">aktualisiert: {{ item.balanceDateStr }}</span>
                </div>
              </router-link>
            </div>
            <div class="data--list__right">
              <Button v-if="menuPermissions['admin.user.edit']"
                      @click="navigateToUserDetails(item)"
                      @keydown.enter="navigateToUserDetails(item)"
                      icon="pi pi-caret-right" severity="contrast"
                      variant="text" rounded title="Benutzerdetails"/>
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
</style>
