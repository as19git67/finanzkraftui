<template>
  <div class="page page--has-no-overflow">
    <h1 class="title">Benutzerliste</h1>
    <div class="section section--is-scrollable">

      <table class="data-table" v-if="users.length">
        <thead>
        <tr>
          <th>Email</th>
          <th>confirmed</th>
          <th></th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="item of users" :key="item">
          <td>{{ item.Email }}</td>
          <td><IconTick aria-label="ja" v-if="item.EmailConfirmed"/></td>
          <td>
            <div class="action-group">
              <router-link v-if="menuPermissions['admin.user.edit']" class="action"
                           :to="{ path:'/userEdit/:userId', name: 'UserEdit', params: { userId: item.id }}">
                <button class="btn-icon-only" aria-label="Benutzerkonto ändern" tabindex="-1">
                  <IconEdit/>
                </button>
              </router-link>
              <button v-if="menuPermissions['admin.user.delete']" class="action btn-icon-only" @click="deleteUser( item.id )"
                      aria-label="Delete">
                <IconDelete/>
              </button>
            </div>
          </td>
        </tr>
        </tbody>
      </table>
      <p v-else>Keine Benutzer vom Server geladen</p>
    </div>
  </div>
</template>

<script>
import {mapActions, mapState, mapStores} from "pinia";
import {UserStore} from "@/stores/user";
import router from "@/router";
import IconEdit from "@/components/icons/IconEdit.vue";
import IconDelete from "@/components/icons/IconDelete.vue";
import IconAdd from "@/components/icons/IconAdd.vue";
import IconTick from "@/components/icons/IconTick.vue";

export default {
  name: "UsersView",
  components: {IconTick, IconAdd, IconEdit, IconDelete},
  data() {
    return {
      newUserName: this.newUserName,
      error: this.error,
    };
  },
  computed: {
    ...mapStores(UserStore),
    ...mapState(UserStore, ["authenticated", "menuPermissions"]),
    ...mapState(UserStore, ["users"]),
  },
  methods: {
    ...mapActions(UserStore, ["getUsers"]),
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
    this.newUserName = '';
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

td > .action {
  display: inline-block;
}

td > .action .metaphor {
  fill: green;
}
</style>
