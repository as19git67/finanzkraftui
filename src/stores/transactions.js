import axios from "axios";
import {defineStore} from "pinia";
import {UserStore} from "@/stores/user";
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
                  account_id: t.account_id,
                  accountName: t.account_name,
                  id: t.t_id,
                  bookingDate: t.t_booking_date,
                  valueDate: t.t_value_date,
                  text: t.t_text,
                  amount: t.t_amount,
                  notes: t.t_notes,
                  categoryId: t.category_id,
                  categoryName: t.category_name,
                  currencyName: t.currency_name,
                  currencyShort: t.currency_short,
                };
              });
            } else {
              this._transactions = [];
            }
          } else {
            this._transactions = [];
          }
          return response.status;
        } catch (ex) {
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
