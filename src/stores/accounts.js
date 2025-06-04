import axios from 'axios';
import { defineStore } from 'pinia';
import _ from 'lodash';
import { UserStore } from '@/stores/user';

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
                  closedAt: account.closedAt,
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
  },
});
