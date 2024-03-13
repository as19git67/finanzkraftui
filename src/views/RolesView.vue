<template>
  <div class="page page--has-no-overflow">
    <h1 class="title">Benutzerrollen</h1>

    <div class="section">
      <form class="label-value-group in-row" v-on:submit.prevent v-on:keyup.enter="addRole">
        <div class="label-value in-row">
          <input class="value" type="text" autofocus v-model="newRoleName" placeholder="Rollenname">
          <button @click="addRole" class="btn btn--is-primary">Hinzufügen</button>
        </div>
      </form>
    </div>


    <div v-if="actionError" class="section">
      <div class="error">{{ actionError }}</div>
    </div>

    <div class="section">

      <table class="data-table table--is-normal" v-if="roles && roles.length">
        <thead>
        <tr>
          <th>Name</th>
          <th>Aktionen</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="item of roles" :key="item.id">
          <td>{{ item.Name }}</td>
          <td>
            <div class="action-group">
              <router-link class="action"
                           :to="{ path:'/roleEdit/:roleId', name: 'RoleEdit', params: { roleId: item.id }}">
                <button class="btn-icon-only" aria-label="Rolle ändern">
                  <IconEdit/>
                </button>
              </router-link>
              <button class="action btn-icon-only" @click="deleteRole(item.id)"
                      title="Rolle löschen">
                <IconDelete/>
              </button>
            </div>
          </td>
        </tr>
        </tbody>
      </table>
      <p v-else>Keine Rollen vom Server geladen</p>
    </div>
  </div>
</template>

<script>
import { mapActions, mapState, mapStores } from "pinia";
import { UserStore } from "@/stores/user";
import router from "@/router";
import IconAdd from "@/components/icons/IconAdd.vue";
import IconEdit from "@/components/icons/IconEdit.vue";
import IconDelete from "@/components/icons/IconDelete.vue";
import ModalDialog from "@/components/ModalDialog.vue";

export default {
  name: "RolesView",
  components: { IconAdd, IconEdit, IconDelete, ModalDialog },
  data() {
    return {
      newRoleName: this.newRoleName,
      error: this.error,
      actionError: this.actionError,
    };
  },
  computed: {
    ...mapStores(UserStore),
    ...mapState(UserStore, ["authenticated"]),
    ...mapState(UserStore, ["roles"]),
  },
  methods: {
    ...mapActions(UserStore, ["deleteRoleById", "fillRoles", "createRoleEmpty"]),
    _handleActionResult: function (result) {
      let mustAuthenticate = false;
      let not_ok = false;
      switch (result.status) {
      case 401:
        mustAuthenticate = true;
        break;
      case 200:
        break;
      default:
        not_ok = true;
      }
      if (mustAuthenticate) {
        router.replace("/login");
        return false;
      }
      if (not_ok) {
        if (result.status === 422) {
          this.actionError = "Die Rolle ist Benutzern zugewiesen und kann deshalb nicht gelöscht werden";
        } else {
          this.actionError = result.message;
        }
        return false;
      }
      return true;
    },
    async addRole() {
      this.actionError = "";
      const result = await this.createRoleEmpty(this.newRoleName);
      switch (result.status) {
      case 200:
        if (!await this.fillAllRoles()) {
          return;
        }
        break; // all ok
      case 401:
        router.replace("/login");
        break;
      default:
        this.actionError = `Error creating role: ${result.message}`;
      }
    },
    async deleteRole(id) {
      this.actionError = "";
      if (this._handleActionResult(await this.deleteRoleById(id))) {
        await this.fillAllRoles();
      }
    },
    async fillAllRoles() {
      this.actionError = "";
      return this._handleActionResult(await this.fillRoles());
    },
  },
  created() {
    this.newRoleName = '';
  },
  async mounted() {
    this.actionError = null;
    await this.fillAllRoles();
  },
};
</script>

<style scoped>
th {
  font-weight: bold;
  text-align: start;
}

.data-table td .btn {
  display: inline-flex;
}

</style>
<script setup>
</script>
<script setup>
</script>
