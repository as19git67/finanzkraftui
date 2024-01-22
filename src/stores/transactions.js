import axios from 'axios';
import { defineStore } from 'pinia';
import _ from 'lodash';
import { UserStore } from '@/stores/user';

export const TransactionStore = defineStore('transaction', {
  state: () => ({
    _maxTransactions: 500,
    _transactions: [],
    _incomplete: false, // true if more transactions would exists but limited to max transactions
  }),
  getters: {
    transactions(state) {
      return state._transactions;
    },
    maxTransactions(state) {
      return state._maxTransactions;
    },
    incompleteTransactionList(state) {
      return state._incomplete;
    },
  },
  actions: {
    async getTransactions(options) {
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        if (options) {
          config.params = _.pick(
            options,
            'maxItems',
            'searchTerm',
            'accountsWhereIn',
            'dateFilterFrom',
            'dateFilterTo',
          );
        }
        try {
          const response = await axios.get('/api/transactions', config);
          if (response.status === 200) {
            if (_.isArray(response.data)) {
              this._incomplete = response.data.length > this._maxTransactions;
              this._transactions = _.map(_.take(response.data, this._maxTransactions), (t) => ({
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
                currencyId: t.currency_id,
                currencyName: t.currency_name,
                currencyShort: t.currency_short,
              }));
            } else {
              this._transactions = [];
              this._incomplete = false;
            }
          } else {
            this._transactions = [];
            this._incomplete = false;
          }
          return response.status;
        } catch (ex) {
          this._transactions = [];
          this._incomplete = false;
          if (ex.response && ex.response.status) {
            if (ex.response.status === 401) {
              userStore.setNotAuthenticated();
            }
            return ex.response.status;
          }
          throw ex;
        }
      } else {
        this._transactions = [];
        this._incomplete = false;
        return 401;
      }
    },
  },
});