import axios from "axios";
import { defineStore } from "pinia";
import { UserStore } from "@/stores/user";
import _ from "lodash";

export const AccountStore = defineStore("account", {
  state: () => {
    return {
      _accounts: [],
    };
  },
  getters: {
    accounts(state) {
      return state._accounts;
    },
  },
  actions: {
    async getAccounts() {
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        const response = await axios.get("/api/accounts", config);
        if (response.status === 200) {
          if (_.isArray(response.data)) {
            this._accounts = _.map(response.data, (account) => {
              return {id: account.id, name: account.name, iban: account.iban, currency: account.currency_id, currencyName: account.currency_name, currencyShort: account.currency_short};
            });
          } else {
            this._accounts = [];
          }
        } else {
          this._accounts = [];
        }
        return response.status;
      } else {
        this._accounts = [];
        return 401;
      }
    },
  },
});
