import axios from 'axios';
import {defineStore} from 'pinia';
import _ from 'lodash';
import {UserStore} from '@/stores/user';

export const OnlineBankingStore = defineStore('onlinebanking', {
  state: () => ({
    _bankcontacts: [],
  }),
  getters: {
    bankcontacts(state) {
      return state._bankcontacts;
    },
  },
  actions: {
    async getBankcontacts(force) {
      if (force || this._bankcontacts.length === 0) {
        const userStore = UserStore();
        if (userStore.authenticated) {
          const config = userStore.getBearerAuthRequestHeader();
          try {
            const response = await axios.get('/api/bankcontacts', config);
            if (response.status === 200) {
              if (_.isArray(response.data)) {
                this._bankcontacts = _.map(response.data, (bankcontact) => ({
                  id: bankcontact.id,
                  name: bankcontact.name,
                  fintsUrl: bankcontact.fintsUrl,
                  fintsBankId: bankcontact.fintsBankId,
                  fintsUserId: bankcontact.fintsUserId,
                  fintsPassword: ''
                }));
              } else {
                this._bankcontacts = [];
              }
            } else {
              this._bankcontacts = [];
            }
            return response.status;
          } catch (ex) {
            this._bankcontacts = [];
            if (ex.response && ex.response.status) {
              if (ex.response.status === 401) {
                userStore.setNotAuthenticated();
              }
              return ex.response.status;
            }
            throw ex;
          }
        } else {
          this._bankcontacts = [];
          return 401;
        }
      } else {
        return 200; // status ok
      }
    },
    getBankcontact(id) {
      return this._bankcontacts.find((bankcontact) => bankcontact.id === id);
    },
    async saveNewBankcontact(bankcontact) {
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        try {
          const response = await axios.put('/api/bankcontacts', bankcontact, config);
          return {status: response.status, resultData: response.data};
        } catch (ex) {
          return userStore.handleAxiosException(ex, userStore, {});
        }
      }
      return {status: 401};
    },
    async updateBankcontact(id, updateData) {
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        try {
          const response = await axios.post(`/api/bankcontacts/${id}`, updateData, config);
          return {status: response.status, resultData: response.data};
        } catch (ex) {
          return userStore.handleAxiosException(ex, userStore, {});
        }
      }
      return {status: 401};
    },
    async getAccountsOfBankcontact(idBankcontact, tanReference, tan) {
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        try {
          if (tanReference) {
            const tanInfo = {tanReference: tanReference, tan: tan};
            const response = await axios.post(`/api/bankcontacts/${idBankcontact}/accounts`, tanInfo, config);
            return {status: response.status, resultData: response.data};
          } else {
            const response = await axios.get(`/api/bankcontacts/${idBankcontact}/accounts`, config);
            return {status: response.status, resultData: response.data};
          }
        } catch (ex) {
          return userStore.handleAxiosException(ex, userStore, {});
        }
      }
      return {status: 401};
    },
    async downloadStatements(idAccount) {
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        try {
          const response = await axios.get(`/api/accounts/${idAccount}/statements`, config);
          return {status: response.status, resultData: response.data};
        } catch (ex) {
          return userStore.handleAxiosException(ex, userStore, {});
        }
      }
      return {status: 401};
    }
  },
});
