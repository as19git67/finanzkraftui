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
      name: '',
      currencyObj: this.currencyObj,
      typeObj: this.typeObj,
      bank: '',
      iban: '',
      closedAt: undefined,
      readers: this.readers,
      writer: [],
      accountTypes: this.accountTypes,
      userAccounts: this.userAccounts,
    };
  },
  computed: {
    ...mapStores(UserStore),
    ...mapStores(AccountStore),
    ...mapStores(MasterDataStore),
    ...mapState(UserStore, ["authenticated", "users"]),
    ...mapState(MasterDataStore, ["currencies"]),
    ...mapState(AccountStore, ["accounts"]),
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
    ...mapActions(UserStore, ["getUsers"]),
    ...mapActions(AccountStore, ["getAccounts", "getAccountById"]),
    ...mapActions(MasterDataStore, ["getCurrencies"]),
    async loadDataFromServer() {
      this.error = '';
      this.loading = true;
      const promises = [];
      promises.push(this.getUsers());
      promises.push(this.getAccounts());
      promises.push(this.getCurrencies());
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
      this.data = await this.getAccountById(this.accountId);
      this.accountTypes = ref([
        {code: "cash", name: "Bargeld", order: 0},
        {code: "checking", name: "Girokonto", order: 1},
        {code: "credit", name: "Kreditkarte", order: 2},
        {code: "daily", name: "Tagesgeld", order: 3},
        {code: "savings", name: "Sparkonto", order: 4},
      ]);

      this.name = this.data.name;
      this.typeObj = _.find(this.accountTypes, (item) => {
        return item.code === this.data.type;
      });
      this.currencyObj = _.find(this.currencies, (item) => {
        return item.id === this.data.currency;
      });
      this.userAccounts = _.map(this.users, (user) => {
        return {id: user.id, Email: user.Email};
      })
      this.readers =  [1];
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
        Reader: {{readers}}
      </div>
      <div class="page--content--row" v-if="closedAt">
        Geschlossen: {{closedAt !== null ? DateTime.fromISO(closedAt).toLocaleString() : ''}}
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>