import axios from "axios";
import { defineStore } from "pinia";
import { UserStore } from "@/stores/user";

export const AccountStore = defineStore("account", {
  state: () => {
    return {
      _accounts: [],
    };
  },
  getters: {
    accounts(state) {
      return state._accounts;
    },
  },
  actions: {
    async getAccounts() {
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        const response = await axios.get("/api/accounts", config);
        if (response.status === 200) {
          this._accounts = response.data.accounts;
        } else {
          this._accounts = [];
        }
        return response.status;
      } else {
        this._accounts = [];
        return 401;
      }
    },
  },
});
