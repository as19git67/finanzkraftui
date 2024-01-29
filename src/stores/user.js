import axios from 'axios';
import _ from 'lodash';
import { defineStore } from 'pinia';

export const UserStore = defineStore('user', {
  state: () => {
    const authData = localStorage.getItem('auth');
    let authObj;
    if (authData) {
      const auth = JSON.parse(authData);
      authObj = {
        authenticated: auth.authenticated,
        email: auth.email,
        accessToken: auth.accessToken,
        accessTokenExpiredAfter: auth.accessTokenExpiredAfter,
        refreshToken: auth.refreshToken,
      };
    } else {
      authObj = {
        authenticated: false,
        email: '',
        accessToken: '',
        accessTokenExpiredAfter: '',
        refreshToken: '',
      };
    }
    return {
      ...authObj, _users: [], _roles: [], _permissions: [],
    };
  },
  getters: {
    isAuthenticated(state) {
      return state.authenticated;
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
      this.email = '';
      this.accessToken = '';
      this.token = '';
      this.accessTokenExpiredAfter = '';
      this.refreshToken = '';
    },
    setAuthenticated(
      authenticated,
      email,
      accessToken,
      accessTokenExpiredAfter,
      refreshToken,
    ) {
      if (authenticated) {
        this.email = email;
        this.accessToken = accessToken;
        this.accessTokenExpiredAfter = accessTokenExpiredAfter;
        this.refreshToken = refreshToken;
      } else {
        this.email = '';
        this.accessToken = '';
        this.token = '';
        this.accessTokenExpiredAfter = '';
        this.refreshToken = '';
      }
      this.authenticated = authenticated;
      const auth = {
        authenticated: this.authenticated,
        email: this.email,
        accessToken: this.accessToken,
        accessTokenExpiredAfter: this.accessTokenExpiredAfter,
        refreshToken: this.refreshToken,
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
        const response = await axios.post('/api/user', j, c);
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
            email,
            response.data.AccessToken,
            response.data.AccessTokenExpiredAfter,
            response.data.RefreshToken,
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
    async getUsers() {
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        const response = await axios.get('/api/user', config);
        if (response.status === 200) {
          this._users = response.data;
        } else {
          this._users = [];
        }
        return response.status;
      }
      this._users = [];
      return 401;
    },
    getUser(id) {
      let userId = id;
      if (_.isString(id)) {
        userId = parseInt(id);
      }
      const result = this._users.filter((user) => user.id === userId);
      if (result.length > 0) {
        return result[0];
      }
      // throw new Error(`Unknown user with id ${id}`);
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
          if (ex.response && ex.response.status) {
            if (ex.response.status === 401) {
              userStore.setNotAuthenticated();
            }
            return { status: ex.response.status, data: resultData };
          }
          return { status: 500, data: resultData };
        }
      }
      return { status: 401, data: resultData };
    },
    async fillRoles() {
      const { status, data } = await this.getRoles();
      if (status === 200) {
        this._roles = data;
      } else {
        this._roles = [];
      }
      return status;
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
          if (ex.response && ex.response.status) {
            if (ex.response.status === 401) {
              userStore.setNotAuthenticated();
            }
            return { status: ex.response.status, data: resultData };
          }
          return { status: 500, data: resultData };
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
          if (ex.response && ex.response.status) {
            if (ex.response.status === 401) {
              userStore.setNotAuthenticated();
            }
            return { status: ex.response.status, data: resultData };
          }
          return { status: 500, data: resultData };
        }
      }
      return { status: 401, data: resultData };
    },
    async createRoleEmpty(roleName) {
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        const response = await axios.put('/api/role', { name: roleName }, config);
        return response.status;
      }
      return 401;
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
          if (ex.response && ex.response.status) {
            if (ex.response.status === 401) {
              userStore.setNotAuthenticated();
            }
            return { status: ex.response.status, data: resultData };
          }
          return { status: 500, data: resultData };
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
          if (ex.response && ex.response.status) {
            if (ex.response.status === 401) {
              userStore.setNotAuthenticated();
            }
            return { status: ex.response.status, data: resultData };
          }
          return { status: 500, data: resultData };
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
          if (ex.response && ex.response.status) {
            if (ex.response.status === 401) {
              userStore.setNotAuthenticated();
            }
            return { status: ex.response.status, data: resultData };
          }
          return { status: 500, data: resultData };
        }
      }
      return { status: 401, data: resultData };
    },
  },
});
