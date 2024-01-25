<template>
  <h1 v-if="user" class="title">Benutzer {{ user.Email }} ändern</h1>

  <div class="form form--is-column" v-if="user">
    <div class="form-component">
      <label for="email">Email:</label>
      <input type="text" v-model="user.Email" placeholder="Email" id="email">
    </div>
    <div class="form-component">
      <label for="initials">Initialien:</label>
      <input type="text" v-model="user.Initials" placeholder="Initialien" id="initials">
    </div>
    <div class="form-component">
      <label for="confirmed">Email ist bestätigt:</label>
      <input type="checkbox" v-model="user.EmailConfirmed" id="confirmed">
    </div>
  </div>

  <table class="data-table" v-if="allRoles && allRoles.length">
    <thead>
    <tr>
      <th>Ausgewählt</th>
      <th>Rollenname</th>
    </tr>
    </thead>
    <tbody>
    <tr v-for="(item, index) of allRoles" :key="item">
      <td><input type="checkbox" v-model="item.assigned" @change="assignmentChanged(index)"></td>
      <td>{{ item.name }}</td>
    </tr>
    </tbody>
  </table>
  <p v-else>Keine Rollen verfügbar</p>
</template>

<script setup>
defineProps({
  userId: { type: String },
});
</script>

<script>
import _ from "lodash";
import { mapActions, mapState, mapStores } from "pinia";
import { UserStore } from "@/stores/user";
import router from "@/router";

export default {
  //inheritAttrs: false,
  name: "UserEditView",
  data() {
    return {
      loading: this.loading,
      user: this.user,
      error: this.error,
      allRoles: this.allRoles,
    };
  },
  computed: {
    ...mapStores(UserStore),
    ...mapState(UserStore, ["authenticated"]),
    ...mapState(UserStore, ["roles"]),
  },
  methods: {
    ...mapActions(UserStore, ["getUser", "getRoles", "getRolesOfUser", "setRoleAssignmentsForUser"]),
    assignmentChanged(index) {
      const roleIds = [];
      this.allRoles.forEach(role => {
         if (role.assigned) {
           roleIds.push(role.id);
         }
      })
      this.setRoleAssignmentsForUser(this.user.id, roleIds);
    }
  },
  async mounted() {
    this.error = null;
    //    const uId = this.$attrs.userId; // take this.userId, because declared as prop
    this.user = this.getUser(this.userId);
    if (!this.user) {
      this.allRoles = [];
      router.replace('/users');
    }

    this.loading = true;
    const promises = [];
    promises.push(this.getRoles());
    promises.push(this.getRolesOfUser(this.userId));
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
      // setTimeout(() => {
      // }, 0);
      this.allRoles = [];
      this.user = undefined;
    }
    if (mustAuthenticate) {
      router.replace("/login");
      return;
    }
    if (not_ok) {
      router.replace("/users");
      return;
    }

    const rolesOfUser = {};
    results[1].data.forEach((role) => {
      rolesOfUser[role.idRole] = role;
    });

    this.allRoles = this.roles.map((role) => {
      const assigned = rolesOfUser[role.id] !== undefined;
      return {
        id: role.id,
        name: role.Name,
        assigned: assigned,
      };
    })
  },
};

</script>


<style scoped>

</style>
