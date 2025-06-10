<script setup>
import {DateTime} from "luxon";
</script>

<script>
import { mapActions, mapState, mapStores } from "pinia";
import { UserStore } from "@/stores/user";
import { AccountStore } from "@/stores/accounts";
import router from "@/router";
import {MasterDataStore} from "@/stores/masterdata";
import _ from "lodash";

export default {
  name: "AccountsView",
  data() {
    return {
      loading: this.loading,
      error: this.error,
    };
  },
  computed: {
    ...mapStores(UserStore),
    ...mapStores(AccountStore),
    ...mapState(UserStore, ["authenticated"]),
    ...mapState(AccountStore, ["accounts"]),
  },
  methods: {
    ...mapActions(UserStore, ["setNotAuthenticated", "getUsers"]),
    ...mapActions(AccountStore, ["getAccounts"]),
    ...mapActions(MasterDataStore, ["getCurrencies", "getCurrencyDetails", "getAccountTypes", "getAccountTypeDetails"]),
    async loadDataFromServer() {
      this.error = '';
      this.loading = true;
      const promises = [];
      promises.push(this.getUsers());
      promises.push(this.getAccounts(true));
      promises.push(this.getCurrencies(true));
      promises.push(this.getAccountTypes(true));
      const results = await Promise.all(promises);
      this.loading = false;
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
        this.setNotAuthenticated();
        router.replace({name: 'login'});
        return;
      }
      if (notAuthorized) {
        router.replace({name: 'notAuthorized'});
        return;
      }
    },
    navigateToAccountDetail(idAccount) {
      router.push({ name: 'AccountDetail', params: { accountId: idAccount } });
    }
  },
  async mounted() {
    this.error = undefined;
    this.loading = false;
    try {
      await this.loadDataFromServer();
    } catch (ex) {
      this.error = ex.message;
      this.loading = false;
    }
  },
};
</script>

<template>
  <div class="page page--is-accounts-view">
    <div class="page--header">
      <div class="title">Konten</div>
    </div>
    <div class="page--content">
      <div class="page--content--row">
        <div class="data-list" v-if="accounts.length">
          <div v-for="(item, index) of accounts" :key="item"
               :class="{ 'account-closed': !!item.closedAt }">
            <div class="data-list--item">
              <div class="data-list-item__main">
                <div class="data-list--item__main__row">
                  <span>{{ item.name }}</span>
                  <span>{{ item.type ? getAccountTypeDetails(item.type).name : '' }}</span>
                </div>
                <div class="data-list--item__main__row">Währung: {{ item.currency ? getCurrencyDetails(item.currency).name : ''}}</div>
                <div class="data-list--item__main__row">{{
                    item.closedAt !== null ? `geschlossen am : ${DateTime.fromISO(item.closedAt).toLocaleString()}` : ''
                  }}</div>
              </div>
              <div class="data-list-item__caret">
                <Button @click="navigateToAccountDetail(item.id)" @keydown.enter="navigateToAccountDetail(item.id)" icon="pi pi-caret-right" severity="contrast" variant="text" rounded aria-label="Ändern" />
              </div>
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

.data-list {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--as-color-primary-0);
  background-color: var(--as-color-primary-0);
  border-radius: 6px;
  gap: 1px;
  overflow: hidden;
}
.data-list--item {
  display: flex;
  padding: 0.5em;
  background-color: var(--as-color-primary-5);
  flex-direction: row;
  gap: 1em;
}
.data-list-item__main {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
}
.data-list-item__caret {
  display: flex;
}
.data-list-item__main > .data-list--item__main__row {
  display: inline-flex;
  flex: 1 1 auto;
  gap: 0.5em;
}
.data-list--item__main__row > * {
  display: flex;
  flex: 1 1 auto;
  font-weight: inherit;
}
.data-list--item__main__row:first-child {
  font-weight: bold;
}
.data-list--item__main__row > *:last-child {
  display: flex;
  align-content: flex-end;
  justify-content: flex-end;
}

table {
  table-layout: initial;
}

th {
  position: sticky;
  top: 0;
  z-index: 100;
  font-weight: bold;
  text-align: start;
}

td {
  font-family: "Verdana";
}

th, td {
  padding-left: 0.5em;
  padding-right: 0.5em;
}

.account-closed {
  color: var(--as-color-primary-4);
}
</style>
