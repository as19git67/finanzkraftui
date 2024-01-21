import axios from 'axios';
import { defineStore } from 'pinia';
import _ from 'lodash';
import { UserStore } from '@/stores/user';

export const MasterDataStore = defineStore('masterdata', {
  state: () => ({
    _timespans: [],
  }),
  getters: {
    timespans(state) {
      return state._timespans;
    },
  },
  actions: {
    async getTimespans(force) {
      if (force || this._timespans.length === 0) {
        const userStore = UserStore();
        if (userStore.authenticated) {
          const config = userStore.getBearerAuthRequestHeader();
          try {
            const response = await axios.get('/api/timespans', config);
            if (response.status === 200) {
              if (_.isArray(response.data)) {
                this._timespans = _.map(response.data, (t) => ({
                  id: t.id,
                  name: t.name,
                  fromRuleNo: t.fromRuleNo,
                  fromRuleAttribute: t.fromRuleAttribute,
                  toRuleNo: t.toRuleNo,
                  toRuleAttribute: t.toRuleAttribute,
                }));
              } else {
                this._timespans = [];
              }
            } else {
              this._timespans = [];
            }
            return response.status;
          } catch (ex) {
            this._timespans = [];
            if (ex.response && ex.response.status) {
              if (ex.response.status === 401) {
                userStore.setNotAuthenticated();
              }
              return ex.response.status;
            }
            throw ex;
          }
        } else {
          this._timespans = [];
          return 401;
        }
      } else {
        return 200; // status ok
      }
    },
  },
});
