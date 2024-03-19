<template>
  <div class="page page--has-no-overflow">
    <h1 class="title">{{ `Rolle ändern: ${roleName}` }}</h1>

    <div v-if="role" class="section">
      <form class="label-value-group in-row" v-on:submit.prevent v-on:keyup.enter="addRole">
        <div class="label-value in-row">
          <div class="label">Rollenname:</div>
          <input class="value" type="text" v-model="role.Name" placeholder="Rollenname"
                 id="roleName">
        </div>
      </form>
    </div>

    <div v-if="error" class="section">
      <div class="error">{{ error }}</div>
    </div>
    <div v-if="actionError" class="section">
      <div class="error">{{ actionError }}</div>
    </div>

    <div class="section">
      <div class="title">Wähle alle Berechtigungen aus, die ein Benutzer mit dieser Rolle
        haben soll:
      </div>
    </div>

    <div class="section section--is-scrollable">
      <ol class="selection-list" v-if="allPermissionProfiles.length">
        <li v-for="(item,index) of allPermissionProfiles" :key="item.id"
             class="list-item text-h-center" :class="{'alternate-row-background': index % 2 }">
          <label>
            <input type="checkbox" v-model="item.assigned" @change="assignmentChanged(index)">
            {{ item.description }}</label>
        </li>
      </ol>
    </div>
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
      return this.role?.Name;
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
        router.replace({ name: 'Roles' });
        return;
      }
    }
    this.role = this.getRole(this.roleId);
    if (!this.role) {
      router.replace({ name: 'Roles' });
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
      const assigned = permissionProfilesOfRole[permissionProfile.idPermissionProfile] !==
                       undefined;
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
