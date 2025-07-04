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
  name: "AccountsView",
  data() {
    return {
      loading: this.loading,
      error: this.error,
      accountType: this.accountType,
      currency: this.currency,
    };
  },
  computed: {
    ...mapStores(UserStore),
    ...mapStores(AccountStore),
    ...mapState(UserStore, ["authenticated"]),
    ...mapState(AccountStore, ["accounts"]),
    accountsEnriched() {
      return this.accounts.map(account => {
        const currencyDetails = this.getCurrencyDetails(account.currency);
        const typeDetails = this.getAccountTypeDetails(account.type);
        const balanceDateStr = account.balanceDate ? DateTime.fromISO(account.balanceDate).toLocaleString() : '';
        const closedDateStr = account.closedAt ? DateTime.fromISO(account.closedAt).toLocaleString() : '';
        const readerNames = this.mapToUserEmail(account.readers);
        const writerNames = this.mapToUserEmail(account.writers);
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
    }
  },
  methods: {
    ...mapActions(UserStore, ["setNotAuthenticated", "getUsers", "getUser"]),
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
    mapToUserEmail(userIds) {
      return userIds.map(userId => {
        const user = this.getUser(userId);
        if (user) {
          return {
            email : user.Email,
            initials: user.Initials ? user.Initials : user.Email,
          };
        }
        return '';
      });
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
        <div class="data--list data--list--standard" v-if="accountsEnriched.length">
          <div v-for="(item, index) of accountsEnriched" :key="item"
               :class="{ 'account-closed': !!item.closedAt }">
            <div class="data--list__item">
              <div class="data--list__left">
                <div class="data--list__line data--list__line--bold">
                  <span>{{ item.name }}</span>
                  <span>{{ item.accountTypeStr }}</span>
                </div>
                <div class="data--list__line" v-if="item.closedAt">{{ `Konto geschlossen: ${item.closedDateStr}` }}</div>
                <div class="data--list__line">
                  <span v-if="item.balance">Saldo: {{ item.balance }}{{item.currencyStr}}</span>
                  <span v-if="item.balanceDateStr">aktualisiert: {{item.balanceDateStr}}</span>
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
      </div>
      <div class="page--content--row" v-if="error">
        <div class="error">{{ error }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.account-closed {
  color: var(--as-color-primary-4);
}
</style>
