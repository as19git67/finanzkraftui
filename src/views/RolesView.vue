<template>
  <h1 class="title">
    Benutzerrollen
    <button class="btn-icon-only" @click="addRole()" title="Rolle hinzufügen">
      <IconAdd />
    </button>
  </h1>

  <table class="data-table" v-if="roles.length">
    <thead>
      <tr>
        <th>Name</th>
        <th>Aktionen</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="item of roles" :key="item">
        <td>{{ item.Name }}</td>
        <td>
          <button
            class="btn-icon-only"
            @click="editRole(item.id)"
            title="Edit role"
          >
            <IconEdit />
          </button>
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
  <ModalDialog v-show="isNewRoleModalDialogVisible" @close="closeModalDialog">
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
      newRoleName: "",
      isNewRoleModalDialogVisible: false,
      error: this.error,
    };
  },
  computed: {
    ...mapStores(UserStore),
    ...mapState(UserStore, ["authenticated"]),
    ...mapState(UserStore, ["roles"]),
  },
  methods: {
    ...mapActions(UserStore, ["getRoles", "createRoleEmpty"]),
    addRole() {
      this.newRoleName = "";
      this.isNewRoleModalDialogVisible = true;
      setTimeout(() => {
        this.$refs.roleNameInput.focus();
      }, 0);
    },
    async createNewRole() {
      this.error = "";
      try {
        const result = await this.createRoleEmpty(this.newRoleName);
        switch (result) {
          case 200:
            await this.fillRoles();
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
    editRole(id) {
      router.push({ name: "RoleEdit", params: { id } });
    },
    deleteRole(id) {
      alert("test" + id);
    },
    fillRoles() {
      this.error = "";
      this.getRoles()
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
  mounted() {
    this.error = null;
    this.fillRoles();
  },
};
</script>

<style scoped>
.title {
  display: flex;
  align-items: center;
}

th {
  font-weight: bold;
  text-align: start;
}
.data-table td .btn {
  display: inline-flex;
}
</style>