import axios from 'axios';
import { defineStore } from 'pinia';
import _ from 'lodash';
import { UserStore } from '@/stores/user';

export const PreferencesStore = defineStore('preferences', {
  state: () => ({
    _newTransactionPresets: [],
  }),
  getters: {
    newTransactionPresets(state) {
      return state._newTransactionPresets;
    },
  },
  actions: {
    async getNewTransactionPresets(force) {
      if (force || this._newTransactionPresets.length === 0) {
        const userStore = UserStore();
        if (userStore.authenticated) {
          const config = userStore.getBearerAuthRequestHeader();
          try {
            const response = await axios.get('/api/newtransactionpresets', config);
            if (response.status === 200) {
              if (_.isArray(response.data)) {
                this._newTransactionPresets = _.map(response.data, (preference) => ({
                  id: preference.id,
                  value: preference.value,
                  description: preference.description,
                }));
              } else {
                this._newTransactionPresets = [];
              }
            } else {
              this._newTransactionPresets = [];
            }
            return response.status;
          } catch (ex) {
            this._newTransactionPresets = [];
            if (ex.response && ex.response.status) {
              if (ex.response.status === 401) {
                userStore.setNotAuthenticated();
              }
              return ex.response.status;
            }
            throw ex;
          }
        } else {
          this._newTransactionPresets = [];
          return 401;
        }
      } else {
        return 200; // status ok
      }
    },
  },
});
