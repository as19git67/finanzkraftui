<template>
  <h1>User list </h1>

  <table class="data-table" v-if="users.length">
    <thead>
    <tr>
      <th>Email</th>
      <th>Initials</th>
      <th>Email confirmed</th>
      <th></th>
    </tr>
    </thead>
    <tbody>
      <tr v-for="item of users" :key="item">
        <td>{{ item.Email }}</td>
        <td>{{ item.Initials }}</td>
        <td>{{ item.EmailConfirmed }}</td>
        <td>
          <button class="btn-icon-only" @click="editUser( item.id )" aria-label="Edit"><IconEdit/></button>
          <button class="btn-icon-only" @click="deleteUser( item.id )" aria-label="Delete"><IconDelete/></button>
        </td>
      </tr>
    </tbody>
  </table>
  <p v-else>Keine Benutzer vom Server geladen</p>
</template>

<script>
import { mapActions, mapState, mapStores } from "pinia";
import { UserStore } from "@/stores/user";
import router from "@/router";
import IconEdit from "@/components/icons/IconEdit.vue";
import IconDelete from "@/components/icons/IconDelete.vue";

export default {
  name: "UsersView",
  components: {IconEdit, IconDelete},
  data() {
    return {
      error: this.error,
    };
  },
  computed: {
    ...mapStores(UserStore),
    ...mapState(UserStore, ["authenticated"]),
    ...mapState(UserStore, ["users"]),
  },
  methods: {
    ...mapActions(UserStore, ["getUsers"]),
    editUser(id) {
      alert('test' + id);
    },
    fillUsers() {
      this.error = "";
      this.getUsers()
      .then((result) => {
        switch (result) {
          case 200:
            break; // all ok
          case 401:
            router.replace("/login");
            break;
          default:
            this.error = `Error loading users from server: ${result}`;
        }
      })
      .catch((error) => {
        this.error = error.message;
      });
    },
  },
  mounted() {
    this.error = null;
    this.fillUsers();
  },
};
</script>

<style scoped>
th {
  font-weight: bold;
  text-align: start;
  border-bottom: 1px solid rebeccapurple;
}
</style>