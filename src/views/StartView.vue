<script setup>
</script>

<script>
import _ from 'lodash';
import router from '@/router';
import {mapActions, mapState, mapStores} from 'pinia';
import {UserStore} from '@/stores/user';
import {AccountStore} from '@/stores/accounts';
import {MasterDataStore} from '@/stores/masterdata';
import {DateTime, Settings as DateTimeSettings} from "luxon";

export default {
  name: 'StartView',
  data() {
    return {
      myUsername: this.myUsername,
      loading: this.loading,
      error: this.error,
      accountGroups: this.accountGroups,
    };
  },
  computed: {
    ...mapStores(UserStore),
    ...mapStores(AccountStore),
    ...mapState(UserStore, ['authenticated', 'authenticatedUserId', 'authenticatedUserEmail']),
    ...mapState(AccountStore, ['accounts']),
  },
  methods: {
    ...mapActions(UserStore, ['setNotAuthenticated', 'getUsers', 'getUser']),
    ...mapActions(AccountStore, ['getAccounts']),
    ...mapActions(MasterDataStore, ['getCurrencies', 'getCurrencyDetails', 'getAccountTypes', 'getAccountTypeDetails']),
    createAccountListByTypes(accountTypes) {
      let accounts = [];
      const userId = this.authenticatedUserId;
      const active = this.accounts.filter(account => {
        return !account.closedAt;
      });
      for (const accountType of accountTypes) {
        const filteredAccounts = active.filter(account => {
          return account.type === accountType && (account.writer.includes(userId) || account.reader.includes(userId));
        });
        accounts = accounts.concat(filteredAccounts).map(account => {
          // const currencyDetails = this.getCurrencyDetails(account.currency);
          const balanceDateStr = account.balanceDate ? DateTime.fromISO(account.balanceDate).toLocaleString() : '';
          const balanceStr = new Intl.NumberFormat(DateTimeSettings.defaultLocale, {
            style: 'currency',
            currency: account.currency,
          }).format(account.balance);
          return {
            ...account,
            balanceStr,
            balanceDateStr,
          };
        });
      }
      const allIds = accounts.map(account => {
        return account.id;
      });
      if (accounts.length === 0) {
        return [];
      }
      return [{
        type: 'all',
        name: 'Alle Buchungen',
        id: allIds.toString(),
        accountsInGroup: allIds,
      }].concat(accounts);
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
    navigateToAddTransaction(idAccount) {
      router.push({name: 'AddTransaction', params: {accountId: idAccount}});
    },
  },
  async mounted() {
    this.error = undefined;
    this.loading = false;
    try {
      await this.loadDataFromServer();
      this.accountGroups = [
        {
          name: 'Täglich',
          accounts: this.createAccountListByTypes(['checking', 'credit', 'cash']),
        },
        {
          name: 'Sparen',
          accounts: this.createAccountListByTypes(['daily', 'savings', 'security']),
        },
        {
          name: 'Sonstige',
          accounts: this.createAccountListByTypes(['other']),
        },
      ];
      this.myUsername = this.authenticatedUserEmail;
    } catch (ex) {
      this.error = ex.message;
      this.loading = false;
    }
  },
  created() {
    this.error = undefined;
    this.loading = false;
    this.accountGroups = [];
  },
};
</script>

<template>
  <div class="page page--is-my-accounts-view">
    <div class="page--header">
      <div class="title">Übersicht für {{ myUsername }}</div>
    </div>
    <div class="page--content" v-if="accountGroups.length">
      <template v-for="(accountGroup, index) of accountGroups">
        <div v-if="accountGroup.accounts.length > 0" class="page--content--row page--content--row__heading">
          {{ accountGroup.name }}
        </div>
        <div v-if="accountGroup.accounts.length > 0" class="page--content--row">
          <div v-if="accountGroup.accounts.length" class="data--list data--list--standard">
            <div class="data--list__item" v-for="(item, index) of accountGroup.accounts" :key="item.id">
              <div class="data--list__left">
                <router-link v-if="item.type === 'all'" append :to="{ name: 'Transactions',  params: { accountId: item.accountsInGroup }}">
                  <div class="data--list__line data--list__line--bold">{{ item.name }}</div>
                </router-link>
                <router-link v-else append :to="{ name: 'Transactions',  params: { accountId: [item.id] }}">
                  <div class="data--list__line data--list__line--bold">{{ item.name }}:</div>
                  <div class="data--list__line">
                    <span v-if="item.balanceDateStr">aktualisiert: {{ item.balanceDateStr }}</span>
                  </div>
                </router-link>
                <div class="data--list__line" v-if="item.type === 'cash'">
                  <Button @click="navigateToAddTransaction(item.id)" @keydown.enter="navigateToAddTransaction(item.id)"
                          icon="pi pi-plus" variant="text" aria-label="Buchung hinzufügen" label="Buchung hinzufügen"/>
                </div>
              </div>
              <div class="data--list__right">
                <span v-if="item.balanceStr">{{ item.balanceStr }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <div class="page--content--row" v-if="error">
        <div class="error">{{ error }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
