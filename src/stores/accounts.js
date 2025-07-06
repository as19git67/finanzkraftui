import axios from 'axios';
import {defineStore} from 'pinia';
import _ from 'lodash';
import {UserStore} from '@/stores/user';

export const AccountStore = defineStore('account', {
  state: () => ({
    _accounts: [],
  }),
  getters: {
    accounts(state) {
      return state._accounts;
    },
  },
  actions: {
    getAccountById(accountId) {
      const id = parseInt(accountId);
      const account = _.find(this._accounts, function(item) {
        return item.id === id;
      });
      if (account) {
        return account;
      } else {
        throw new Error('Account not found');
      }
    },
    async getAccounts(force) {
      if (force || this.accounts.length === 0) {
        const userStore = UserStore();
        if (userStore.authenticated) {
          const config = userStore.getBearerAuthRequestHeader();
          try {
            const response = await axios.get('/api/accounts', config);
            if (response.status === 200) {
              if (_.isArray(response.data)) {
                this._accounts = _.map(response.data, (account) => ({
                  id: account.id,
                  name: account.name,
                  iban: account.iban,
                  currency: account.currency_id,
                  type: account.account_type_id,
                  currencyName: account.currency_name,
                  currencyShort: account.currency_short,
                  startBalance: account.startBalance,
                  balance: account.balance,
                  balanceDate: account.balanceDate,
                  closedAt: account.closedAt,
                  readers: account.readers ? account.readers : [],
                  writers: account.writers ? account.writers : [],
                }));
              } else {
                this._accounts = [];
              }
            } else {
              this._accounts = [];
            }
            return response.status;
          } catch (ex) {
            this._accounts = [];
            if (ex.response && ex.response.status) {
              if (ex.response.status === 401) {
                userStore.setNotAuthenticated();
              }
              return ex.response.status;
            }
            throw ex;
          }
        } else {
          this._accounts = [];
          return 401;
        }
      } else {
        return 200; // status ok
      }
    },
    async updateAccount(updateData) {
      const resultData = {};
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        if (updateData.id === undefined) {
          throw new Error('Account id missing in updateAccount call');
        }
        try {
          const response = await axios.post(`/api/accounts/${updateData.id}`,
              updateData, config);
          if (response.status === 200) {
            const id = parseInt(updateData.id, 10);
            const account = this._accounts.filter((tr) => {
              return tr.t_id === id;
            });
            _.assign(account[0], updateData);
          }
          return {status: response.status, data: resultData};
        } catch (ex) {
          return userStore.handleAxiosException(ex, userStore, resultData);
        }
      }
      return {status: 401, data: resultData};
    },
  },
});
