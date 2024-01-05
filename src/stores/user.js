import axios from "axios";
import { defineStore } from "pinia";

export const UserStore = defineStore("user", {
  state: () => {
    const authData = localStorage.getItem("auth");
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
        email: "",
        accessToken: "",
        accessTokenExpiredAfter: "",
        refreshToken: "",
      };
    }
    return { ...authObj, _users: [], _roles: [], _permissions: [] };
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
    setAuthenticated(
      authenticated,
      email,
      accessToken,
      accessTokenExpiredAfter,
      refreshToken
    ) {
      if (authenticated) {
        this.email = email;
        this.accessToken = accessToken;
        this.accessTokenExpiredAfter = accessTokenExpiredAfter;
        this.refreshToken = refreshToken;
      } else {
        this.email = "";
        this.accessToken = "";
        this.token = "";
        this.accessTokenExpiredAfter = "";
        this.refreshToken = "";
      }
      this.authenticated = authenticated;
      const auth = {
        authenticated: this.authenticated,
        email: this.email,
        accessToken: this.accessToken,
        accessTokenExpiredAfter: this.accessTokenExpiredAfter,
        refreshToken: this.refreshToken,
      };
      localStorage.setItem("auth", JSON.stringify(auth));
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
        const j = JSON.stringify({email: email, password: password});
        const c = {
          headers: {
            "Content-Type": "application/json",
          },
        };
        let response = await axios.post("/api/user", j, c);
        this.email = email;
        return true;
      } catch (ex) {
        console.log("New user registration threw an exception");
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
        let response = await axios.post("/api/auth", undefined, config);
        if (response.status === 200) {
          this.setAuthenticated(
            true,
            email,
            response.data.AccessToken,
            response.data.AccessTokenExpiredAfter,
            response.data.RefreshToken
          );
        } else {
          this.setAuthenticated(false);
        }
        return true;
      } catch (ex) {
        this.setAuthenticated(false);
        console.log("Login threw an exception");
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
        const response = await axios.get("/api/user", config);
        if (response.status === 200) {
          this._users = response.data;
        } else {
          this._users = [];
        }
        return response.status;
      } else {
        this._users = [];
        return 401;
      }
    },
    async getRoles() {
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        const response = await axios.get("/api/role", config);
        if (response.status === 200) {
          this._roles = response.data;
        } else {
          this._roles = [];
        }
        return response.status;
      } else {
        this._roles = [];
        return 401;
      }
    },
    getRole(id) {
      if (id === undefined) {
        return;
      }
      for (const role of this._roles) {
        if (role.id === id) {
          return role;
        }
      }
    },
    async getPermissions(idRole) {
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        const response = await axios.get(`/api/role/${idRole}/permission`, config);
        if (response.status === 200) {
          this._permissions = response.data;
        } else {
          this._permissions = [];
        }
        return response.status;
      } else {
        this._permissions = [];
        return 401;
      }
    },
    async createRoleEmpty(roleName) {
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        const response = await axios.put("/api/role", {name: roleName}, config);
        return response.status;
      } else {
        return 401;
      }
    },
  },
});
