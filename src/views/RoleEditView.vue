<template>
  <div v-if="error" class="error">{{ error }}</div>
  <div v-else>
    <h1 v-if="role" class="title">Rolle {{ role.Name }} ändern</h1>

    <div class="form form--is-column" v-if="role">
      <div class="form-component">
        <label for="email">Rollenname:</label>
        <input type="text" v-model="role.Name" placeholder="Rollenname" id="roleName">
      </div>
    </div>


    <table class="data-table" v-if="permissionsOfRole.length">
      <thead>
      <tr>
        <th>Resource</th>
        <th>Permission</th>
        <th>Bezeichnung</th>
        <th>Auswahl</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="item of permissionsOfRole" :key="item.id">
        <td>{{ item.Resource }}</td>
        <td>{{ item.Permission }}</td>
        <td>{{ item.Description }}</td>
        <td><input type="checkbox" v-model="item.assigned" @change="assignmentChanged(index)"></td>
      </tr>
      </tbody>
    </table>

  </div>
</template>


<script setup>
defineProps({
  roleId: { type: String },
});
</script>

<script>
import { mapActions, mapState, mapStores } from "pinia";
import { UserStore } from "@/stores/user";
import router from "@/router";
import _ from "lodash";

export default {
  name: "RoleEditView",
  components: {},
  data() {
    return {
      role: this.role,
      permissionsOfRole: this.permissionsOfRole,
      error: this.error,
    };
  },
  computed: {
    ...mapStores(UserStore),
    ...mapState(UserStore, ["authenticated", "roles"]),
  },
  methods: {
    ...mapActions(UserStore, ["fillRoles", "getRole", "getPermissionsOfRole"]),
    assignmentChanged(index) {

    }
  },
  created() {
    this.permissionsOfRole = [];
  },
  async mounted() {
    this.error = null;
    this.loading = true;
    if (!this.roles || this.roles.length === 0) {
      const result = await this.fillRoles();
      if (result !== 200) {
        router.replace("roles");
        return;
      }
    }
    this.role = this.getRole(this.roleId);
    if (!this.role) {
      router.replace("/roles");
      return;
    }

    const promises = [];
    promises.push(this.getPermissionsOfRole(this.roleId));
    const results = await Promise.all(promises);
    this.loading = false;

    let mustAuthenticate = false;
    let not_ok = false;
    results.forEach((result) => {
      let status = result;
      if (_.isObject(result)) {
        status = result.status;
      }
      switch (status) {
        case 401:
          mustAuthenticate = true;
          break;
        case 200:
          break;
        default:
          not_ok = true;
      }
    });
    if (mustAuthenticate || not_ok) {
      this.permissionsOfRole = [];
    }
    if (mustAuthenticate) {
      router.replace("/login");
      return;
    }
    if (not_ok) {
      router.replace("/roles");
      return;
    }

    this.permissionsOfRole = results[0].data;
  },
};
</script>

<style scoped></style>
