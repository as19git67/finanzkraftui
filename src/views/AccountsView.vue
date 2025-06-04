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
                  <span>{{ item.type }}</span>
                </div>
                <div class="data-list--item__main__row">Zusätzliche Daten</div>
              </div>
              <div class="data-list-item__caret">
                <Button icon="pi pi-caret-right" severity="contrast" variant="text" rounded aria-label="Ändern" />
              </div>
            </div>
          </div>
        </div>
      </div>
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
