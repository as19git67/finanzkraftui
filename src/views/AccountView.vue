<script setup>
defineProps({
  accountId: { type: String },
});
</script>

<script>
import _ from 'lodash';
import {ref} from "vue";
import {mapActions, mapState, mapStores} from "pinia";
import {DateTime} from "luxon";
import router from "@/router";
import {AccountStore} from "@/stores/accounts";
import {UserStore} from "@/stores/user";
import {MasterDataStore} from "@/stores/masterdata";

export default {
  name: "Home",
  data() {
    return {
      id: this.accountId,
      name: this.name,
      accountTypeObj: this.accountTypeObj,
      currencyObj: this.currencyObj,
      typeObj: this.typeObj,
      bank: '',
      iban: '',
      closedAt: undefined,
      readers: this.readers,
      writers: this.writers,
    };
  },
  computed: {
    ...mapStores(UserStore),
    ...mapStores(AccountStore),
    ...mapStores(MasterDataStore),
    ...mapState(UserStore, ["authenticated", "users"]),
    ...mapState(MasterDataStore, ["currencies", "accountTypes"]),
    ...mapState(AccountStore, ["accounts"]),
    dirty() {
      return this.originalData.name !== this.name ||
          this.originalData.iban !== this.iban ||
          this.originalData.type !== this.typeObj.id ||
          this.originalData.currency !== this.currencyObj.id ||
          !_.isEqual(this.originalData.readers, this.integerSort(this.readers)) ||
          !_.isEqual(this.originalData.writers, this.integerSort(this.writers));
    },
    type() {
      if (this.typeObj) {
        return this.typeObj.code;
      }
      return '';
    },
    typeName() {
      if (this.typeObj) {
        return this.typeObj.name;
      }
      return '';
    },
    currency() {
      if (this.currencyObj) {
        return this.currencyObj.id;
      }
      return '';
    },
    currencyName() {
      if (this.currencyObj) {
        return this.currencyObj.name;
      }
      return '';
    },
  },
  methods: {
    ...mapActions(UserStore, ["setNotAuthenticated", "getUsers"]),
    ...mapActions(AccountStore, ["getAccounts", "getAccountById"]),
    ...mapActions(MasterDataStore, ["getCurrencies", "getAccountTypes"]),
    integerSort(arr) {
      return arr.sort(function(a, b) {
        return a - b;
      });
    },
    async loadDataFromServer() {
      this.error = '';
      this.loading = true;
      const promises = [];
      promises.push(this.getUsers());
      promises.push(this.getAccounts());
      promises.push(this.getCurrencies());
      promises.push(this.getAccountTypes());
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
    async saveAccount() {
    }
  },
  created() {
    this.originalData = {};
  },
  async mounted() {
    this.error = undefined;
    this.loading = false;
    try {
      await this.loadDataFromServer();
      this.data = await this.getAccountById(this.accountId);
      this.integerSort(this.data.readers);
      this.integerSort(this.data.writers);
      this.originalData = _.cloneDeep(this.data);
      this.name = this.data.name;
      this.typeObj = _.find(this.accountTypes, (item) => {
        return item.id === this.data.type;
      });
      this.currencyObj = _.find(this.currencies, (item) => {
        return item.id === this.data.currency;
      });
      this.readers = this.data.readers;
      this.writers = this.data.writers;
      this.iban = this.data.iban;
      this.closedAt = this.data.closedAt;
    } catch (ex) {
      this.error = ex.message;
      this.loading = false;
      console.log(this.error);
      router.replace({name: 'Accounts'});
    }
  },
};
</script>

<template>
  <div class="page page--is-account-detail-view">
    <div class="page--header">
      <div class="title">Konto: {{name}}</div>
    </div>
    <div class="page--content">
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputText id="accountName" v-model="name" variant="filled"
                     size="small"></InputText>
          <label for="accountName">Name</label>
        </FloatLabel>
      </div>
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
        <Select class="row--item" id="accountType" fluid v-model="typeObj" :options="accountTypes" optionLabel="name" />
          <label for="accountType">Kontoart</label>
        </FloatLabel>
      </div>
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <InputText id="accountIBAN" v-model="iban" variant="filled"
                     size="small"></InputText>
          <label for="accountIBAN">IBAN</label>
        </FloatLabel>
      </div>
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <Select id="accountCurrency" fluid v-model="currencyObj" :options="currencies" optionLabel="name" />
          <label for="accountCurrency">Kontowährung</label>
        </FloatLabel>
      </div>
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <MultiSelect id="accountReader" fluid filter v-model="readers" :options="userAccounts" optionValue="id" optionLabel="Email" />
          <label for="accountReader">Benutzer mit Leserechten</label>
        </FloatLabel>
      </div>
      <div class="page--content--row">
        <FloatLabel variant="in" class="row--item row--item--is-grow">
          <MultiSelect id="accountWriter" fluid v-model="writers" :options="users" optionValue="id" optionLabel="Email" />
          <label for="accountWriter">Benutzer mit Recht zum Ändern</label>
        </FloatLabel>
      </div>
      <div class="page--content--row" v-if="closedAt">
        Geschlossen: {{closedAt !== null ? DateTime.fromISO(closedAt).toLocaleString() : ''}}
      </div>
    </div>
    <div class="page--footer">
      <div class="btn-save">
        <Button label="Speichern" :disabled="!dirty" @click="saveAccount" size="large">
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>