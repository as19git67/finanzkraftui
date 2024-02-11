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
    buildTransactionFromResponse(transactionData) {
      const res = {
        account_id: transactionData.account_id,
        accountName: transactionData.account_name,
        id: transactionData.t_id,
        bookingDate: transactionData.t_booking_date,
        valueDate: transactionData.t_value_date,
        text: transactionData.t_text,
        entryText: transactionData.t_entry_text,
        amount: transactionData.t_amount,
        notes: transactionData.t_notes,
        payee: transactionData.t_payee,
        categoryId: transactionData.category_id,
        categoryName: transactionData.category_name,
        currencyId: transactionData.currency_id,
        currencyName: transactionData.currency_name,
        currencyShort: transactionData.currency_short,
        confirmed: transactionData.confirmed,
      };
      if (transactionData.t_payee && transactionData.t_text
        && transactionData.t_text.indexOf(transactionData.t_payee) === 0) {
        res.textShortened = transactionData.t_text.substring(transactionData.t_payee.length);
      } else {
        res.textShortened = transactionData.t_text;
      }
      return res;
    },
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
          const response = await axios.get('/api/transaction', config);
          if (response.status === 200) {
            if (_.isArray(response.data)) {
              this._incomplete = response.data.length > this._maxTransactions;
              this._transactions = _.map(_.take(response.data, this._maxTransactions), (t) => {
                return this.buildTransactionFromResponse(t);
              });
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
    async getTransaction(id) {
      let resultData = {};
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        if (id === undefined) {
          throw new Error('Transaction id missing in getTransaction call');
        }
        try {
          const response = await axios.get(`/api/transaction/${id}`, config);
          if (response.status === 200) {
            resultData = response.data;
          }
          return { status: response.status, data: resultData };
        } catch (ex) {
          return userStore.handleAxiosException(ex, userStore, resultData);
        }
      }
      return { status: 401, data: resultData };
    },
    async updateTransaction(updateData) {
      const resultData = {};
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        if (updateData.id === undefined) {
          throw new Error('Transaction id missing in updateTransaction call');
        }
        try {
          const response = await axios.post(`/api/transaction/${updateData.id}`, updateData, config);
          return { status: response.status, data: resultData };
        } catch (ex) {
          return userStore.handleAxiosException(ex, userStore, resultData);
        }
      }
      return { status: 401, data: resultData };
    },
  },
});
