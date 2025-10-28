import axios from 'axios';
import _ from 'lodash';
import { defineStore } from 'pinia';
import {DateTime} from "luxon";

export const UserStore = defineStore('user', {
  state: () => {
    const authData = localStorage.getItem('auth');
    let authObj;
    if (authData) {
      const auth = JSON.parse(authData);
      authObj = {
        authenticated: auth.authenticated,
        idUser: auth.idUser,
        email: auth.email,
        accessToken: auth.accessToken,
        accessTokenExpiredAfter: auth.accessTokenExpiredAfter,
        refreshToken: auth.refreshToken,
        _menuPermissions: auth.menuPermissions ? auth.menuPermissions : {},
      };
    } else {
      authObj = {
        authenticated: false,
        idUser: undefined,
        email: '',
        accessToken: '',
        accessTokenExpiredAfter: '',
        refreshToken: '',
        _menuPermissions: {},
      };
    }
    return {
      ...authObj, _users: [], _roles: [], _permissions: [],
    };
  },
  getters: {
    authenticatedUserId(state) {
      if (state.authenticated) {
        return state.idUser;
      }
      return undefined;
    },
    authenticatedUserEmail(state) {
      if (state.authenticated) {
        return state.email;
      }
      return undefined;
    },
    isAuthenticated(state) {
      return state.authenticated;
    },
    menuPermissions(state) {
      return state._menuPermissions;
    },
    users(state) {
      return state._users;
    },
    roles(state) {
      return state._roles;
    },
    permissions(state) {
      return state._permissions;
    },
  },
  actions: {
    setNotAuthenticated() {
      this.authenticated = false;
      this.idUser = undefined;
      this.email = '';
      this.accessToken = '';
      this.accessTokenExpiredAfter = '';
      this.refreshToken = '';
      this._menuPermissions = {};
    },
    setAuthenticated(
      authenticated,
      idUser,
      email,
      accessToken,
      accessTokenExpiredAfter,
      refreshToken,
      permissions,
    ) {
      this._menuPermissions = {};
      if (authenticated) {
        this.idUser = idUser;
        this.email = email;
        this.accessToken = accessToken;
        this.accessTokenExpiredAfter = accessTokenExpiredAfter;
        this.refreshToken = refreshToken;
        if (permissions.menus) {
          permissions.menus.forEach((mp) => {
            this._menuPermissions[mp] = mp;
          });
        }
      } else {
        this.idUser = undefined;
        this.email = '';
        this.accessToken = '';
        this.accessTokenExpiredAfter = '';
        this.refreshToken = '';
      }
      this.authenticated = authenticated;
      const auth = {
        authenticated: this.authenticated,
        idUser: this.idUser,
        email: this.email,
        accessToken: this.accessToken,
        accessTokenExpiredAfter: this.accessTokenExpiredAfter,
        refreshToken: this.refreshToken,
        menuPermissions: this._menuPermissions,
      };
      localStorage.setItem('auth', JSON.stringify(auth));
    },
    getBasicAuthRequestHeader() {
      const basicAuthHash = btoa(`${this.email}:${this.password}`);
      return {
        headers: {
          Authorization: `Basic ${basicAuthHash}`,
        },
      };
    },
    getBearerAuthRequestHeader() {
      return {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      };
    },
    async registerNewUser(email, password) {
      try {
        const j = JSON.stringify({ email, password });
        const c = {
          headers: {
            'Content-Type': 'application/json',
          },
        };
        await axios.put('/api/user', j, c);
        this.email = email;
        return true;
      } catch (ex) {
        console.log('New user registration threw an exception');
        throw ex;
      }
    },
    async loginBasic(email, password) {
      try {
        const basicAuthHash = btoa(`${email}:${password}`);
        const config = {
          withCredentials: false,
          headers: {
            Authorization: `Basic ${basicAuthHash}`,
          },
        };
        const response = await axios.post('/api/auth', undefined, config);
        if (response.status === 200) {
          this.setAuthenticated(
            true,
            response.data.idUser,
            email,
            response.data.AccessToken,
            response.data.AccessTokenExpiredAfter,
            response.data.RefreshToken,
            response.data.permissions,
          );
        } else {
          this.setAuthenticated(false);
        }
        return true;
      } catch (ex) {
        this.setAuthenticated(false);
        console.log('Login threw an exception');
        throw ex;
      }
    },
    logout() {
      this.setAuthenticated(false);
    },
    _setResponseMessage(ex, result) {
      if (ex?.response?.data) {
        // eslint-disable-next-line no-param-reassign
        result.message = ex.response.data;
      } else {
        // eslint-disable-next-line no-param-reassign
        result.message = ex.message;
      }
    },
    handleAxiosException(ex, userStore, emptyResultData) {
      const result = {};
      if (emptyResultData) {
        result.data = emptyResultData;
      }
      if (ex.response && ex.response.status) {
        if (ex.response.status === 401) {
          userStore.setNotAuthenticated();
        }
        result.status = ex.response.status;
        // eslint-disable-next-line no-underscore-dangle
        this._setResponseMessage(ex, result);
        return result;
      }
      result.status = 500;
      // eslint-disable-next-line no-underscore-dangle
      this._setResponseMessage(ex, result);
      return result;
    },
    async getUsers() {
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        let resultData = {};
        try {
          const response = await axios.get('/api/user', config);
          if (response.status === 200) {
            this._users = response.data.map((user) => {
              return {
                ...user,
                ExpiredAfterFormatted: user.ExpiredAfter ? DateTime.fromISO(user.ExpiredAfter).toLocaleString(DateTime.DATETIME_FULL) : '',
              }
            });
          } else {
            this._users = [];
          }
          return response.status;
        } catch (ex) {
          return this.handleAxiosException(ex, userStore, resultData);
        }
      }
    },
    getUser(id) {
      let userId = id;
      if (_.isString(id)) {
        userId = parseInt(id, 10);
      }
      const result = this._users.filter((user) => user.id === userId);
      if (result.length > 0) {
        return result[0];
      }
      // throw new Error(`Unknown user with id ${id}`);
    },
    async updateUser(updateData) {
      const userId = updateData.id;
      if (!userId) {
        return { status: 404, message: 'Missing id in updateData for updateUser' };
      }
      delete updateData.ExpiredAfterFormatted;
      const userStore = UserStore();
      let resultData = {};
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        try {
          const response = await axios.post(`/api/user/${userId}`, { updateData }, config);
          if (response.status === 200) {
            resultData = response.data;
          }
          return { status: response.status, data: resultData };
        } catch (ex) {
          return this.handleAxiosException(ex, userStore, resultData);
        }
      }
      return { status: 401, data: resultData };
    },
    async getRoles() {
      const userStore = UserStore();
      let resultData = [];
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        try {
          const response = await axios.get('/api/role', config);
          if (response.status === 200) {
            resultData = response.data;
          }
          return { status: response.status, data: resultData };
        } catch (ex) {
          return this.handleAxiosException(ex, userStore, resultData);
        }
      }
      return { status: 401, data: resultData };
    },
    async fillRoles() {
      const result = await this.getRoles();
      if (result.status === 200) {
        this._roles = result.data;
      } else {
        this._roles = [];
      }
      return result;
    },
    getRole(id) {
      if (id === undefined) {
        return;
      }
      let roleId = id;
      if (_.isString(id)) {
        roleId = parseInt(id);
      }
      for (const role of this._roles) {
        if (role.id === roleId) {
          return role;
        }
      }
    },
    async setRoleName(roleId, roleName) {
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        try {
          const response = await axios.post(`/api/role/${roleId}`, { name: roleName }, config);
          const role = this.getRole(roleId);
          if (role) {
            role.Name = roleName;
          }
          return { status: response.status };
        } catch (ex) {
          return this.handleAxiosException(ex, userStore);
        }
      }
      return { status: 401 };
    },
    async deleteRoleById(roleId) {
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        try {
          const response = await axios.delete(`/api/role/${roleId}`, config);

          return { status: response.status };
        } catch (ex) {
          return this.handleAxiosException(ex, userStore);
        }
      }
      return { status: 401 };
    },
    async getPermissionProfilesOfRole(idRole) {
      const userStore = UserStore();
      let resultData = [];
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        try {
          const response = await axios.get(`/api/role/${idRole}/permissionprofile`, config);
          if (response.status === 200) {
            resultData = response.data;
          }
          return { status: response.status, data: resultData };
        } catch (ex) {
          return this.handleAxiosException(ex, userStore, resultData);
        }
      }
      return { status: 401, data: resultData };
    },
    async getPermissionProfiles() {
      const userStore = UserStore();
      let resultData = [];
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        try {
          const response = await axios.get('/api/permissionprofile', config);
          if (response.status === 200) {
            resultData = response.data;
          }
          return { status: response.status, data: resultData };
        } catch (ex) {
          return this.handleAxiosException(ex, userStore, resultData);
        }
      }
      return { status: 401, data: resultData };
    },
    async createRoleEmpty(roleName) {
      const userStore = UserStore();
      let newRoleId;
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        try {
          const response = await axios.put('/api/role', { name: roleName }, config);
          if (response.status === 200) {
            newRoleId = response.data;
          }
          return { status: response.status, resultData: newRoleId };
        } catch (ex) {
          return this.handleAxiosException(ex, userStore, newRoleId);
        }
      }
      return { status: 401 };
    },
    async getRolesOfUser(userId) {
      const userStore = UserStore();
      let resultData = [];
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        try {
          const response = await axios.get(`/api/user/${userId}/roles`, config);
          if (response.status === 200) {
            resultData = response.data;
          }
          return { status: response.status, data: resultData };
        } catch (ex) {
          return this.handleAxiosException(ex, userStore, resultData);
        }
      }
      return { status: 401, data: resultData };
    },
    async setRoleAssignmentsForUser(userId, roleIds) {
      const userStore = UserStore();
      let resultData = [];
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        try {
          const response = await axios.post(`/api/user/${userId}/roles`, { roleIds }, config);
          if (response.status === 200) {
            resultData = response.data;
          }
          return { status: response.status, data: resultData };
        } catch (ex) {
          return this.handleAxiosException(ex, userStore, resultData);
        }
      }
      return { status: 401, data: resultData };
    },
    async setPermissionProfileAssignmentsForRole(roleId, permissionProfileIds) {
      const userStore = UserStore();
      let resultData = [];
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        try {
          const response = await axios.post(`/api/role/${roleId}/permissionprofile`, { permissionProfileIds }, config);
          if (response.status === 200) {
            resultData = response.data;
          }
          return { status: response.status, data: resultData };
        } catch (ex) {
          return this.handleAxiosException(ex, userStore, resultData);
        }
      }
      return { status: 401, data: resultData };
    },
  },
});
