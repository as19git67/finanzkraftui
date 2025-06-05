import axios from 'axios';
import { defineStore } from 'pinia';
import _ from 'lodash';
import { UserStore } from '@/stores/user';

export const MasterDataStore = defineStore('masterdata', {
  state: () => ({
    _currencies: [],
    _timespans: [],
    _categories: [],
    _categoriesById: {},
  }),
  getters: {
    currencies(state) {
      return state._currencies;
    },
    timespans(state) {
      return state._timespans;
    },
    categories(state) {
      return state._categories;
    },
  },
  actions: {
    async getCurrencies(force) {
      if (force || this._currencies.length === 0) {
        const userStore = UserStore();
        if (userStore.authenticated) {
          const config = userStore.getBearerAuthRequestHeader();
          try {
            const response = await axios.get('/api/currencies', config);
            if (response.status === 200) {
              if (_.isArray(response.data)) {
                this._currencies = _.map(response.data, (c) => ({
                  id: c.id,
                  name: c.name,
                  short: c.short,
                }));
              } else {
                this._currencies = [];
              }
            } else {
              this._currencies = [];
            }
            return response.status;
          } catch (ex) {
            this._currencies = [];
            if (ex.response && ex.response.status) {
              if (ex.response.status === 401) {
                userStore.setNotAuthenticated();
              }
              return ex.response.status;
            }
            throw ex;
          }
        } else {
          this._currencies = [];
          return 401;
        }
      } else {
        return 200; // status ok
      }
    },
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
    async getCategories() {
      this._categories = [];
      this._categoriesById = {};
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        try {
          const response = await axios.get('/api/category', config);
          if (response.status === 200) {
            if (_.isArray(response.data)) {
              this._categories = response.data;
              this._categories.forEach((category) => {
                this._categoriesById[category.id] = category;
              });
            }
          }
          return { status: response.status };
        } catch (ex) {
          return userStore.handleAxiosException(ex, userStore, []);
        }
      } else {
        return { status: 401, data: resultData };
      }
    },
    getCategoryById(id) {
      return this._categoriesById[id];
    },
  },
});
