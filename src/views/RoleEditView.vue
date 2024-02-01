<template>
  <div v-if="error" class="error">{{ error }}</div>
  <div v-else>
    <h1 v-if="role" class="title">Rolle {{ roleName }} ändern</h1>

    <div class="form form--is-column" v-if="role">
      <div class="form-component">
        <label for="roleName">Rollenname:</label>
        <input type="text" v-model="role.Name" placeholder="Rollenname" id="roleName">
      </div>
    </div>

    <p v-if="actionError" class="error">{{ actionError }}</p>

    <table class="data-table" v-if="allPermissionProfiles.length">
      <thead>
      <tr>
        <th>Bezeichnung</th>
        <th>Auswahl</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="item of allPermissionProfiles" :key="item.id">
        <td>{{ item.description }}</td>
        <td class="text-h-center"><input type="checkbox" v-model="item.assigned" @change="assignmentChanged(index)"></td>
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
      allPermissionProfiles: this.allPermissionProfiles,
      error: this.error,
      actionError: this.actionError
    };
  },
  watch: {
    roleName: async function (val, oldVal) {
      if (this.inUndoChange) {
        this.inUndoChange = false;
        return;
      }
      if (oldVal === undefined || this.roleId === undefined) {
        return;
      }
      this.actionError = undefined;
      const result = await this.setRoleName(this.roleId, val);
      if (result.status !== 200) {
        this.inUndoChange = true;
        this.role.Name = oldVal;
        this.actionError = result.message;
      }
    },
  },
  computed: {
    roleName() {
      return  this.role?.Name;
    },
    ...mapStores(UserStore),
    ...mapState(UserStore, ["authenticated", "roles"]),
  },
  methods: {
    ...mapActions(UserStore, [
      "fillRoles",
      "getRole",
      "setRoleName",
      "getPermissionProfiles",
      "getPermissionProfilesOfRole",
      "setPermissionProfileAssignmentsForRole",
    ]),
    async assignmentChanged(index) {
      const permissionIds = [];
      this.actionError = undefined;
      this.allPermissionProfiles.forEach(permissionProfile => {
        if (permissionProfile.assigned) {
          permissionIds.push(permissionProfile.id);
        }
      })
      const result = await this.setPermissionProfileAssignmentsForRole(this.roleId, permissionIds);
      if (result.status !== 200) {
        this.actionError = result.message;
      }
    }
  },
  created() {
    this.allPermissionProfiles = [];
    this.role = {};
  },
  async mounted() {
    this.error = undefined;
    this.actionError = undefined;
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
    promises.push(this.getPermissionProfilesOfRole(this.roleId));
    promises.push(this.getPermissionProfiles());
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

    const permissionProfilesOfRole = {};
    results[0].data.forEach((permissionProfile) => {
      permissionProfilesOfRole[permissionProfile.idPermissionProfile] = permissionProfile;
    });

    this.allPermissionProfiles = results[1].data.map((permissionProfile) => {
      const assigned = permissionProfilesOfRole[permissionProfile.idPermissionProfile] !== undefined;
      return {
        id: permissionProfile.idPermissionProfile,
        description: permissionProfile.Description,
        assigned: assigned,
      };
    })

  },
};
</script>

<style scoped></style>
