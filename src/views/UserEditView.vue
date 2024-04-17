<template>
  <div class="page page--has-no-overflow">
    <h1 v-if="user" class="title">{{ `Benutzer ${user.Email} ändern` }}</h1>
    <div class="section">
      <div class="top-links">
        <router-link v-if="!dirty" class="action" replace :to="{ name: 'Users'}">
          < Zurück
        </router-link>
        <button v-if="dirty" @click="cancelChanges" class="action btn btn--is-secondary">Abbrechen
        </button>
        <button :disabled="!dirty" @click="saveChanges" class="action btn btn--is-primary">
          Speichern
        </button>
      </div>
    </div>

    <div class="section">
      <div class="label-value-group in-column" v-if="user">
        <div class="label-value in-row">
          <label class="label" for="email">Email:</label>
          <input class="value" type="text" v-model="Email" placeholder="Email" id="email">
        </div>
        <div class="label-value in-row">
          <label class="label" for="initials">Initialien:</label>
          <input class="value" type="text" v-model="Initials" placeholder="Initialien" id="initials">
        </div>
        <div class="label-value in-row">
          <label class="label" for="confirmed">Email ist bestätigt:</label>
          <input class="value" type="checkbox" v-model="EmailConfirmed" id="confirmed">
        </div>
        <div class="label-value in-row">
          <label class="label" for="expires">gesperrt ab:</label>
          <input class="value" type="datetime-local" v-model="ExpiredAfter" id="expires">
        </div>
      </div>
    </div>
    <div class="section section--is-scrollable">
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
      <div class="title" v-else>Keine Rollen verfügbar</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  userId: {type: String},
});
</script>

<script>
import _ from "lodash";
import {DateTime} from "luxon";
import {mapActions, mapState, mapStores} from "pinia";
import {UserStore} from "@/stores/user";
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
      updateData: this.updateData,
      Email: this.Email,
      EmailConfirmed: this.EmailConfirmed,
      ExpiredAfter: this.ExpiredAfter,
      Initials: this.Initials,
    };
  },
  watch: {
    Email: function (val, oldVal) {
      if (oldVal === undefined) {
        return;
      }
      this.updateData.Email = val;
    },
    EmailConfirmed: function (val, oldVal) {
      if (oldVal === undefined) {
        return;
      }
      this.updateData.EmailConfirmed = val;
    },
    Initials: function (val, oldVal) {
      if (oldVal === undefined) {
        return;
      }
      this.updateData.Initials = val;
    },
    ExpiredAfter: function (val, oldVal) {
      if (oldVal === undefined) {
        return;
      }
      this.updateData.ExpiredAfter = val;
    },
  },
  computed: {
    ...mapStores(UserStore),
    ...mapState(UserStore, ["authenticated"]),
    ...mapState(UserStore, ["roles"]),
    dirty() {
      const keyCount = Object.keys(this.updateData).length;
      return keyCount > 0 || this.roleAssigmentChanged;
    },
  },
  methods: {
    ...mapActions(UserStore, ["getUser", "fillRoles", "getRolesOfUser", "setRoleAssignmentsForUser", "updateUser"]),
    async saveChanges() {
      let updateUserOk = true;
      if (Object.keys(this.updateData).length > 0) {
        updateUserOk = await this.saveUser();
      }
      if (updateUserOk) {
        await this.updateRoleAssignment();
      }
    },
    async updateRoleAssignment() {
      const roleIds = [];
      this.allRoles.forEach(role => {
        if (role.assigned) {
          roleIds.push(role.id);
        }
      })
      this.setRoleAssignmentsForUser(this.user.id, roleIds);
      this.roleAssigmentChanged = false;
    },
    async saveUser() {
      this.error = undefined;
      this.updateData.id = this.userId;
      const result = await this.updateUser(this.updateData);
      let not_ok = false;
      let mustAuthenticate = false;
      let status = result.status;
      switch (status) {
        case 401:
          mustAuthenticate = true;
          break;
        case 403:
          this.error = 'Die Berechtigung zum Ändern des Benutzers fehlt.';
          not_ok = true;
          break;
        case 200:
          break;
        default:
          not_ok = true;
      }
      if (mustAuthenticate) {
        this.error = 'Benutzer muss angemeldet sein';
        return false;
      }
      if (not_ok) {
        if (!this.error) {
          this.error = result.message;
        }
        return false;
      }

      this.updateData = {};
      return true;
    },
    assignmentChanged(index) {
      this.roleAssigmentChanged = true;
    }
  },
  created() {
    this.updateData = {};
    this.roleAssigmentChanged = false;
    this.error = null;
  },
  async mounted() {
    //    const uId = this.$attrs.userId; // take this.userId, because declared as prop
    this.user = this.getUser(this.userId);
    if (!this.user) {
      this.allRoles = [];
      router.replace('/users');
    }

    this.loading = true;
    const promises = [];
    promises.push(this.fillRoles());
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
      this.Email = '';
      this.EmailConfirmed = false;
      this.Initials = '';
      this.ExpiredAfter = '';
    }
    if (mustAuthenticate) {
      router.replace("/login");
      return;
    }
    if (not_ok) {
      router.replace("/users");
      return;
    }

    this.Email = this.user.Email;
    this.EmailConfirmed = this.user.EmailConfirmed;
    this.Initials = this.user.Initials;
    const d = DateTime.fromISO(this.user.ExpiredAfter);
    this.ExpiredAfter = d.toISO({ includeOffset: false });

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
