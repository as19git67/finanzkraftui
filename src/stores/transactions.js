import axios from 'axios';
import { defineStore } from 'pinia';
import _ from 'lodash';
import { UserStore } from '@/stores/user';
import NumberParser from "@/NumberParser";

export const TransactionStore = defineStore('transaction', {
  state: () => ({
    _maxTransactions: 1500,
    _transactions: [],
    _selectedTransactions: [],
    _transaction: {},
    _searchTerm: '',
    _currentTransactionId: 0,
    _lastScrollTop: 0,
    _incomplete: false, // true if more transactions would exists but limited to max transactions
    _ruleSets: [],
  }),
  getters: {
    searchTerm(state) {
      return state._searchTerm;
    },
    transaction(state) {
      return state._transaction;
    },
    transactions(state) {
      return state._transactions;
    },
    selectedTransactions(state) {
      return state._selectedTransactions;
    },
    maxTransactions(state) {
      return state._maxTransactions;
    },
    incompleteTransactionList(state) {
      return state._incomplete;
    },
    currentTransactionId(state) {
      return state._currentTransactionId;
    },
    lastScrollTop(state) {
      return state._lastScrollTop;
    },
    ruleSets(state) {
      return state._ruleSets;
    },
  },
  actions: {
    setSelectedTransactions(transactions = []) {
      this._selectedTransactions = transactions;
    },
    buildTransactionFromResponse(transactionData) {
      const res = {
        account_id: transactionData.account_id,
        account_name: transactionData.account_name,
        t_id: transactionData.t_id,
        t_booking_date: transactionData.t_booking_date,
        t_value_date: transactionData.t_value_date,
        t_text: transactionData.t_text,
        t_EREF: transactionData.t_EREF,
        t_CRED: transactionData.t_CRED,
        t_MREF: transactionData.t_MREF,
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
        unseen: transactionData.unseen,
        tagIds: transactionData.tagIds ? transactionData.tagIds.split(',').map((id) => parseInt(id, 10)) : [],
      };
      if (transactionData.t_payee && transactionData.t_text
        && transactionData.t_text.indexOf(transactionData.t_payee) === 0) {
        res.textShortened = transactionData.t_text.substring(transactionData.t_payee.length);
        res.textShortened = res.textShortened.trim();
        if (res.textShortened.at(0) === ',') {
          res.textShortened = res.textShortened.substring(1);
        } else if (res.textShortened.startsWith(', ')) {
          res.textShortened = res.textShortened.substring(2);
        }
      } else {
        res.textShortened = transactionData.t_text;
      }

      // Cut the part in brackets from the payee text
      if (res.t_payee) {
        const i = res.t_payee.indexOf('(');
        const j = res.t_payee.indexOf(')');
        if (i > 0 && j > 0 && j > i) {
          res.payeeShortened = res.t_payee.substring(0, i - 1);
          res.payeeShortened = res.payeeShortened.trim();
        } else {
          res.payeeShortened = res.t_payee;
        }
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
        if (_.isArray(config.params.accountsWhereIn)) {
          config.params.accountsWhereIn = config.params.accountsWhereIn.join(',');
        }
        try {
          const response = await axios.get('/api/transaction', config);
          if (response.status === 200) {
            if (_.isArray(response.data)) {
              this._incomplete = response.data.length > this._maxTransactions;
              this._transactions = _.map(_.take(response.data, this._maxTransactions), (t) => this.buildTransactionFromResponse(t));
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
          const np = new NumberParser('en-US');
          config.params = _.pick(
            options,
            'maxItems',
            'accountsWhereIn',
            'dateFilterFrom',
            'dateFilterTo',
            'textToken',
            'mRefToken',
          );
          if (options.amountMin != null) {
            config.params.amountMin = np.parse(options.amountMin);
          }
          if (options.amountMax != null) {
            config.params.amountMax = np.parse(options.amountMax);
          }
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
    async addTransaction(transactionData) {
      const resultData = {};
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        try {
          const tr = {
            idAccount: transactionData.idAccount,
            text: transactionData.t_text,
            notes: transactionData.t_notes,
            payee: transactionData.t_payee,
            amount: transactionData.t_amount,
            valueDate: transactionData.t_value_date,
            idCategory: transactionData.t_category_id,
            tagIds: transactionData.tagIds,
          };
          const response = await axios.put('/api/transaction', tr, config);
          if (response.status === 200) {
            tr.t_id = parseInt(response.data, 10);
            this._transactions.push(tr);
          }
          return { status: response.status, data: tr };
        } catch (ex) {
          return userStore.handleAxiosException(ex, userStore, resultData);
        }
      }
      return { status: 401, data: resultData };
    },
    async getTransaction(id) {
      this._transaction = {};
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        if (id === undefined) {
          throw new Error('Transaction id missing in getTransaction call');
        }
        try {
          const response = await axios.get(`/api/transaction/${id}`, config);
          if (response.status === 200) {
            this._transaction = this.buildTransactionFromResponse(response.data);
          }
          return { status: response.status, data: this._transaction };
        } catch (ex) {
          return userStore.handleAxiosException(ex, userStore, this._transaction);
        }
      }
      return { status: 401, data: this._transaction };
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
          if (response.status === 200) {
            const id = parseInt(updateData.id, 10);
            const t = this._transactions.filter((tr) => {
              return tr.t_id === id;
            });
            _.assign(t[0], updateData);
          }
          return { status: response.status, data: resultData };
        } catch (ex) {
          return userStore.handleAxiosException(ex, userStore, resultData);
        }
      }
      return { status: 401, data: resultData };
    },
    async deleteTransaction(id) {
      const resultData = {};
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        if (id === undefined) {
          throw new Error('Transaction id missing in deleteTransaction call');
        }
        try {
          const response = await axios.delete(`/api/transaction/${id}`, config);
          if (response.status === 200) {
            const trId = parseInt(id, 10);
            this._transactions = this._transactions.filter((tr) => {
              return tr.t_id !== trId;
            });
          }
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
    async setRules(ruleInfo, includeProcessed) {
      const resultData = {};
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        if (!ruleInfo.name) {
          throw new Error('setRules requires ruleInfo.name');
        }
        try {
          const response = ruleInfo.id
            ? await axios.post(`/api/rules/${ruleInfo.id}`, { ruleInfo, includeProcessed }, config)
            : await axios.put('/api/rules/', ruleInfo, config);
          return { status: response.status, data: resultData };
        } catch (ex) {
          return userStore.handleAxiosException(ex, userStore, resultData);
        }
      }
      return { status: 401, data: resultData };
    },
    async deleteRules(ruleSetId) {
      const resultData = {};
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        try {
          const response = await axios.delete(`/api/rules/${ruleSetId}`, config);
          return { status: response.status, data: resultData };
        } catch (ex) {
          return userStore.handleAxiosException(ex, userStore, resultData);
        }
      }
      return { status: 401, data: resultData };
    },
    clearTransactions() {
      this._transactions = [];
    },
    setSearchTerm(term) {
      this._searchTerm = term;
    },
    setCurrentTransactionId(id) {
      this._currentTransactionId = id;
    },
    setLastScrollTop(top) {
      this._lastScrollTop = top;
    },
  },
});
