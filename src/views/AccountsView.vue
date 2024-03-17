<template>
  <div class="page page--has-no-overflow">
    <h1 class="title">Konten</h1>
    <div class="section section--is-scrollable">
      <table class="data-table" v-if="accounts.length">
        <thead>
        <tr>
          <th>Name</th>
          <th>IBAN</th>
          <th><span class="only-wide">Währung</span><span class="only-small" aria-label="Währung"></span></th>
          <th><span class="only-wide">Geschlossen</span><span class="only-small" aria-label="Geschlossen"></span></th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="(item, index) of accounts" :key="item"
            :class="{ 'account-closed': !!item.closedAt, 'alternate-row-background': index % 2 }">
          <td>{{ item.name }}</td>
          <td>{{ item.iban }}</td>
          <td><span class="only-wide">{{ item.currencyName }}</span><span class="only-small">{{ item.currencyShort }}</span></td>
          <td class="right-aligned">{{
              item.closedAt !== null ? DateTime.fromISO(item.closedAt).toLocaleString() : ''
            }}
          </td>
        </tr>
        </tbody>
      </table>
      <p v-else>Keine Accounts vom Server geladen</p>
    </div>
  </div>
</template>

<script>
import { DateTime } from "luxon";
import { mapActions, mapState, mapStores } from "pinia";
import { UserStore } from "@/stores/user";
import { AccountStore } from "@/stores/accounts";
import router from "@/router";

export default {
  name: "Home",
  data() {
    return {
      DateTime: DateTime,
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
    ...mapActions(AccountStore, ["getAccounts"]),
    fillAccounts() {
      this.error = "";
      this.getAccounts()
          .then((result) => {
            switch (result) {
            case 200:
              break; // all ok
            case 401:
              router.replace("/login");
              break;
            default:
              this.error = `Fehler beim Abrufen der Konten: ${result}`;
            }
          })
          .catch((error) => {
            this.error = error.message;
          });
    },
  },
  mounted() {
    this.error = null;
    this.fillAccounts();
  },
};
</script>

<style scoped>

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
