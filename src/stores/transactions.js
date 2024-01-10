import axios from "axios";
import { defineStore } from "pinia";
import { UserStore } from "@/stores/user";
import _ from "lodash";

export const TransactionStore = defineStore("transaction", {
  state: () => {
    return {
      _transactions: [],
    };
  },
  getters: {
    transactions(state) {
      return state._transactions;
    },
  },
  actions: {
    async getTransactions() {
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        try {
          const response = await axios.get("/api/transactions", config);
          if (response.status === 200) {
            if (_.isArray(response.data)) {
              this._transactions = _.map(response.data, (t) => {
                return {
                  id: t.id,
                  text: t.name,
                  amount: t.amount,
                  accountId: t.account_id,
                  accountName: t.account_name,
                  currency: t.currency_id,
                  currencyName: t.currency_name,
                  currencyShort: t.currency_short
                };
              });
            } else {
              this._transactions = [];
            }
          } else {
            this._transactions = [];
          }
          return response.status;
        } catch(ex) {
          this._transactions = [];
          return ex.error;
        }
      } else {
        this._transactions = [];
        return 401;
      }
    },
  },
});
