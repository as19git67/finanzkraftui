import axios from 'axios';
import { defineStore } from 'pinia';
import _ from 'lodash';
import { UserStore } from '@/stores/user';

export const MasterDataStore = defineStore('masterdata', {
  state: () => ({
    _tags: [],
    _accountTypes: [],
    _currencies: [],
    _timespans: [],
    _categories: [],
    _categoriesById: {},
  }),
  getters: {
    tags(state) {
      return state._tags;
    },
    accountTypes(state) {
      return state._accountTypes;
    },
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
    async getTags(force) {
      if (force || this._tags.length === 0) {
        const userStore = UserStore();
        if (userStore.authenticated) {
          const config = userStore.getBearerAuthRequestHeader();
          try {
            const response = await axios.get('/api/tags', config);
            if (response.status === 200) {
              if (_.isArray(response.data)) {
                this._tags = _.map(response.data, (t) => ({
                  id: t.id,
                  tag: t.tag,
                }));
              } else {
                this._tags = [];
              }
            } else {
              this._tags = [];
            }
            return response.status;
          } catch (ex) {
            this._tags = [];
            if (ex.response && ex.response.status) {
              if (ex.response.status === 401) {
                userStore.setNotAuthenticated();
              }
              return ex.response.status;
            }
            throw ex;
          }
        } else {
          this._tags = [];
          return 401;
        }
      } else {
        return 200; // status ok
      }
    },
    async getAccountTypes(force) {
      if (force || this._accountTypes.length === 0) {
        const userStore = UserStore();
        if (userStore.authenticated) {
          const config = userStore.getBearerAuthRequestHeader();
          try {
            const response = await axios.get('/api/accounttypes', config);
            if (response.status === 200) {
              if (_.isArray(response.data)) {
                this._accountTypes = _.map(response.data, (c) => ({
                  id: c.id,
                  name: c.name,
                  order: c.order,
                }));
              } else {
                this._accountTypes = [];
              }
            } else {
              this._accountTypes = [];
            }
            return response.status;
          } catch (ex) {
            this._accountTypes = [];
            if (ex.response && ex.response.status) {
              if (ex.response.status === 401) {
                userStore.setNotAuthenticated();
              }
              return ex.response.status;
            }
            throw ex;
          }
        } else {
          this._accountTypes = [];
          return 401;
        }
      } else {
        return 200; // status ok
      }
    },
    getAccountTypeDetails(accountType) {
      return _.find(this._accountTypes, (c) => c.id === accountType);
    },
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
    getCurrencyDetails(currency) {
      return _.find(this._currencies, (c) => c.id === currency);
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
