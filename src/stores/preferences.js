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
                this._newTransactionPresets = _.map(response.data, (preset) => ({
                  name: preset.name,
                  categoryId: preset.categoryId,
                  tags: preset.tags,
                  lastUsed: preset.lastUsed,
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
    async saveNewTransactionPresets() {
      const presets = this._newTransactionPresets.sort((a, b) => {
        return new Date(b.lastUsed) - new Date(a.lastUsed);
      }).slice(0, 20);
      this._newTransactionPresets = presets;
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        try {
          const response = await axios.post('/api/newtransactionpresets', presets, config);
          return { status: response.status, resultData: {} };
        } catch (ex) {
          return userStore.handleAxiosException(ex, userStore, {});
        }
      }
      return { status: 401 };
    },
  },
});
