<script setup>
import {DateTime} from "luxon";
import {mapActions, mapState, mapStores} from "pinia";
import {AccountStore} from "@/stores/accounts";
import {UserStore} from "@/stores/user";
import router from "@/router";

defineProps({
  accountId: { type: String },
});
</script>

<script>
export default {
  name: "Home",
  data() {
    return {
      id: this.accountId,
      name: '',
      currency: '',
      type: '',
      bank: '',
      iban: '',
      closed: undefined,
      reader: [],
      writer: [],
    };
  },
  computed: {
    ...mapStores(UserStore),
    ...mapStores(AccountStore),
    ...mapState(UserStore, ["authenticated"]),
    ...mapState(AccountStore, ["accounts"]),
  },
  methods: {
    ...mapActions(AccountStore, ["getAccountById"]),
  },
  async mounted() {
    this.error = null;
    try {
      this.data = await this.getAccountById(this.accountId);
      this.name = this.data.name;
      this.type = this.data.type;
      this.currency = this.data.currency;
      this.iban = this.data.iban;
      this.closedAt = this.data.closedAt;
    }
    catch (error) {
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
        Kontenart: {{type}}
      </div>
      <div class="page--content--row">
        IBAN: {{iban}}
      </div>
      <div class="page--content--row">
        Währung: {{currency}}
      </div>
      <div class="page--content--row" v-if="closedAt">
        Geschlossen: {{closedAt !== null ? DateTime.fromISO(closedAt).toLocaleString() : ''}}
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>