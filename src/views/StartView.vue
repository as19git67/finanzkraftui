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
import {DateTime} from "luxon";

export default {
  name: "StartView",
  data() {
    return {
      myUsername: this.myUsername,
      loading: this.loading,
      error: this.error,
      accountsDaily: this.accountsDaily,
      accountsSavings: this.accountsSavings,
    };
  },
  computed: {
    ...mapStores(UserStore),
    ...mapStores(AccountStore),
    ...mapState(UserStore, ["authenticated", "authenticatedUserId", "authenticatedUserEmail"]),
    ...mapState(AccountStore, ["accounts"]),
  },
  methods: {
    ...mapActions(UserStore, ["setNotAuthenticated", "getUsers", "getUser"]),
    ...mapActions(AccountStore, ["getAccounts"]),
    ...mapActions(MasterDataStore, ["getCurrencies", "getCurrencyDetails", "getAccountTypes", "getAccountTypeDetails"]),
    createAccountListByTypes(accountTypes) {
      let accounts = [];
      const userId = this.authenticatedUserId;
      const active = this.accounts.filter(account => {
        return !account.closedAt;
      });
      for (const accountType of accountTypes) {
        const filteredAccounts = active.filter(account => {
          return account.type === accountType && (account.writers.includes(userId) || account.readers.includes(userId));
        });
        accounts = accounts.concat(filteredAccounts).map(account => {
          const currencyDetails = this.getCurrencyDetails(account.currency);
          const balanceDateStr = account.balanceDate ? DateTime.fromISO(account.balanceDate).toLocaleString() : '';
          return {
            ...account,
            currencyStr: currencyDetails ? currencyDetails.short : '',
            balanceDateStr,
          }
        });
      }
      return accounts;
    },
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
  },
  async mounted() {
    this.error = undefined;
    this.loading = false;
    try {
      await this.loadDataFromServer();
      this.accountsDaily = this.createAccountListByTypes(['cash', 'credit', 'checking']);
      this.accountsSavings = this.createAccountListByTypes(['savings']);
      this.myUsername = this.authenticatedUserEmail;
    } catch (ex) {
      this.error = ex.message;
      this.loading = false;
    }
  },
  created() {
    this.error = undefined;
    this.loading = false;
    this.accountsDaily = [];
    this.accountsSavings = [];
  },
};
</script>

<template>
  <div class="page page--is-accounts-view">
    <div class="page--header">
      <div class="title">Übersicht für {{myUsername}}</div>
    </div>
    <div class="page--content">
      <div class="page--content--row page--content--row__heading">Täglich</div>
      <div class="page--content--row">
        <div class="data-list" v-if="accountsDaily.length">
          <div v-for="(item, index) of accountsDaily" :key="item">
            <div class="data-list--item">
              <div class="data-list-item__main">
                <div class="data-list--item__main__row">
                  <span class="element--is-grow">{{ item.name }}</span>
                </div>
                <div class="data-list--item__main__row">
                  <span v-if="item.balance">Saldo: {{ item.balance }}{{item.currencyStr}}</span>
                  <span v-if="item.balanceDateStr">aktualisiert: {{item.balanceDateStr}}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="page--content--row page--content--row__heading">Sparen</div>
      <div class="page--content--row">
        <div class="data-list" v-if="accountsSavings.length">
          <div v-for="(item, index) of accountsSavings" :key="item">
            <div class="data-list--item">
              <div class="data-list-item__main">
                <div class="data-list--item__main__row">
                  <span class="element--is-grow">{{ item.name }}</span>
                </div>
                <div class="data-list--item__main__row">
                  <span v-if="item.balance">Saldo: {{ item.balance }}{{item.currencyStr}}</span>
                  <span v-if="item.balanceDateStr">aktualisiert: {{item.balanceDateStr}}</span>
                </div>
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
</style>
