<template>
  <h1>Edit Role</h1>
  <div v-if="error" class="error">{{ error }}</div>
  <div v-if="!error && role" class="as-form">
    <label
      >Role name:
      <input
        type="text"
        v-model="roleName"
        placeholder="Role name"
        ref="roleNameInput"
      />
    </label>
    <table class="data-table" v-if="roles.length">
      <thead>
      <tr>
        <th>Resource</th>
        <th>Permission</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="item of permissions" :key="item.id">
        <td>{{ item.Resource }}</td>
        <td>{{ item.Permission }}</td>
      </tr>
      </tbody>
    </table>

  </div>
</template>

<script>
import { mapActions, mapState, mapStores } from "pinia";
import { UserStore } from "@/stores/user";
import router from "@/router";

export default {
  name: "RoleEditView",
  components: {},
  data() {
    return {
      permissions: this.permissions,
      error: this.error,
    };
  },
  computed: {
    ...mapStores(UserStore),
    ...mapState(UserStore, ["authenticated", "permissions"]),
  },
  methods: {
    ...mapActions(UserStore, ["getPermissions"]),
    fillPermissions(idParam) {
      if (idParam === undefined) {
        router.replace({ name: "Roles" });
        return;
      }
      let idRole = idParam;
      if (typeof idParam === "string" || idParam instanceof String) {
        idRole = parseInt(idParam);
      }
      this.error = "";
      this.getPermissions(idRole).then((result) => {
        switch (result) {
          case 200:
            break; // all ok
          case 401:
            router.replace("/login");
            break;
          default:
            this.error = `Fehler beim Abrufen der Berechtigungen: ${result}`;
        }
      })
      .catch((error) => {
        this.error = error.message;
      });
    },
  },
  mounted() {
    this.error = null;
    this.fillPermissions(this.$route.params.id);
  },
};
</script>

<style scoped></style>
