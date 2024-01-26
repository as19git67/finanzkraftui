<template>
  <h1 class="title">Benutzerrollen</h1>
  <form class="form" v-on:submit.prevent v-on:keyup.enter="addRole">
    <div class="form-component">
      <input type="text" autofocus v-model="newRoleName" placeholder="Rollenname">
      <button @click="addRole" class="btn btn--is-primary">Hinzufügen</button>
    </div>
  </form>

  <table class="data-table" v-if="roles && roles.length">
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
          <router-link class="action" :to="{ path:'/roleEdit/:roleId', name: 'RoleEdit', params: { roleId: item.id }}">
            <button class="btn-icon-only" aria-label="Edit"><IconEdit/></button>
          </router-link>
          <button
            class="btn-icon-only"
            @click="deleteRole(item.id)"
            title="Delete role"
          >
            <IconDelete />
          </button>
        </td>
      </tr>
    </tbody>
  </table>
  <p v-else>Keine Rollen vom Server geladen</p>
  <ModalDialog v-show="false" @close="closeModalDialog">
    <template v-slot:header>Add a new role</template>
    <template v-slot:body>
      <label
        >Role name:
        <input
          type="text"
          v-model="newRoleName"
          placeholder="Role name"
          ref="roleNameInput"
        />
      </label>
    </template>
    <template v-slot:footer>
      <div class="btn-group">
        <button
          type="button"
          class="btn btn--is-primary"
          :disabled="newRoleName.length === 0"
          @click="createNewRole"
        >
          Add role
        </button>
        <button type="button" class="btn" @click="closeModalDialog">
          Cancel
        </button>
      </div>
    </template>
  </ModalDialog>
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
    };
  },
  computed: {
    ...mapStores(UserStore),
    ...mapState(UserStore, ["authenticated"]),
    ...mapState(UserStore, ["roles"]),
  },
  methods: {
    ...mapActions(UserStore, ["fillRoles", "createRoleEmpty"]),
    addRole() {
    },
    async createNewRole() {
      this.error = "";
      try {
        const result = await this.createRoleEmpty(this.newRoleName);
        switch (result) {
          case 200:
            await this.fillAllRoles();
            break; // all ok
          case 401:
            router.replace("/login");
            break;
          default:
            this.error = `Error loading roles from server: ${result}`;
        }
      } catch (error) {
        this.error = error.message;
      }
      this.isNewRoleModalDialogVisible = false;
    },
    closeModalDialog() {
      this.isNewRoleModalDialogVisible = false;
    },
    deleteRole(id) {
      alert("test" + id);
    },
    fillAllRoles() {
      this.error = "";
      this.fillRoles()
        .then((result) => {
          switch (result) {
            case 200:
              break; // all ok
            case 401:
              router.replace("/login");
              break;
            default:
              this.error = `Error loading roles from server: ${result}`;
          }
        })
        .catch((error) => {
          this.error = error.message;
        });
    },
  },
  created() {
    this.newRoleName = '';
  },
  mounted() {
    this.error = null;
    this.fillAllRoles();
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
