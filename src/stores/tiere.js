import axios from "axios";
import { defineStore } from "pinia";
import { UserStore } from "@/stores/user";

export const TiereStore = defineStore("tiere", {
  state: () => {
    return {
      _gattungen: [],
    };
  },
  getters: {
    gattungen(state) {
      return state._gattungen;
    },
  },
  actions: {
    async getGattungen() {
      const userStore = UserStore();
      if (userStore.authenticated) {
        const config = userStore.getBearerAuthRequestHeader();
        const response = await axios.get("/api/tiere/gattung", config);
        //const response = await axios.get("/api/tiere", config);
        if (response.status === 200) {
          this._gattungen = response.data.gattungen;
        } else {
          this._gattungen = [];
        }
        return response.status;
      } else {
        this._gattungen = [];
        return 401;
      }
    },
  },
});
