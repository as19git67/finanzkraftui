import axios from 'axios';
import { defineStore } from 'pinia';
import _ from 'lodash';
import { UserStore } from '@/stores/user';

export const TransactionStore = defineStore('transaction', {
  state: () => ({
    _maxTransactions: 500,
    _transactions: [],
    _incomplete: false, // true if more transactions would exists but limited to max transactions
    _ruleSets: [],
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
    ruleSets(state) {
      return state._ruleSets;
    }
  },
  actions: {
    buildTransactionFromResponse(transactionData) {
      const res = {
        account_id: transactionData.account_id,
        account_name: transactionData.account_name,
        t_id: transactionData.t_id,
        t_booking_date: transactionData.t_booking_date,
        t_value_date: transactionData.t_value_date,
        t_text: transactionData.t_text,
        t_entry_text: transactionData.t_entry_text,
        t_amount: transactionData.t_amount,
        t_notes: transactionData.t_notes,
        t_payee: transactionData.t_payee,
        t_payeePayerAcctNo: transactionData.t_payeePayerAcctNo,
        category_id: transactionData.category_id,
        category_name: transactionData.category_name,
        currency_id: transactionData.currency_id,
        currency_name: transactionData.currency_name,
        currency_short: transactionData.currency_short,
        rule_set_id: transactionData.rule_set_id,
        rule_set_name: transactionData.rule_set_name,
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
    async getMatchingTransactions(options) {
      const resultData = {
        incomplete: false,
        transactions: [],
      };
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        if (options) {
          config.params = _.pick(
            options,
            'maxItems',
            'accountsWhereIn',
            'dateFilterFrom',
            'dateFilterTo',
            'textToken',
          );
        }
        try {
          const response = await axios.get('/api/transaction', config);
          if (response.status === 200) {
            if (_.isArray(response.data)) {
              resultData.incomplete = response.data.length > options.maxItems;
              // eslint-disable-next-line max-len
              resultData.transactions = response.data.map((t) => this.buildTransactionFromResponse(t));
            }
          }
          return { status: response.status, data: resultData };
        } catch (ex) {
          return userStore.handleAxiosException(ex, userStore, resultData);
        }
      } else {
        return { status: 401, data: resultData };
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
            resultData = this.buildTransactionFromResponse(response.data);
          }
          return { status: response.status, data: resultData };
        } catch (ex) {
          return userStore.handleAxiosException(ex, userStore, resultData);
        }
      }
      return { status: 401, data: resultData };
    },
    async getRuleSet(id) {
      let resultData = {};
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        if (id === undefined) {
          throw new Error('id of rule set missing in getRuleSet call');
        }
        try {
          const response = await axios.get(`/api/rules/${id}`, config);
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
    async getRuleSets() {
      let resultData = [];
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        try {
          const response = await axios.get('/api/rules', config);
          if (response.status === 200) {
            resultData = response.data;
            this._ruleSets = resultData.toSorted((a, b) => {
              if (a.name < b.name) {
                return -1;
              }
              if (a.name > b.name) {
                return 1;
              }
              return 0;
            });
          } else {
            this._ruleSets = [];
          }
          return { status: response.status };
        } catch (ex) {
          this._ruleSets = [];
          return userStore.handleAxiosException(ex, userStore);
        }
      }
      this._ruleSets = [];
      return { status: 401 };
    },
    async setRules(ruleInfo) {
      const resultData = {};
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        if (!ruleInfo.name) {
          throw new Error('setRules requires ruleInfo.name');
        }
        try {
          const response = ruleInfo.id
            ? await axios.post(`/api/rules/${ruleInfo.id}`, ruleInfo, config)
            : await axios.put('/api/rules/', ruleInfo, config);
          return { status: response.status, data: resultData };
        } catch (ex) {
          return userStore.handleAxiosException(ex, userStore, resultData);
        }
      }
      return { status: 401, data: resultData };
    },

  },
});
