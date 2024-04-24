<template>
  <div class="page page--has-no-overflow">
    <h1 class="title">Keine Berechtigung</h1>
    <div class="section">
      <div>{{email}} hat keine Berechtigung</div>
    </div>
  </div>
</template>

<script>import {mapActions, mapState, mapStores} from "pinia";
import {UserStore} from "@/stores/user";

export default {
  name: "Home",
  data() {
    return {
      email: this.email,
    };
  },
  computed: {
    ...mapStores(UserStore),
    ...mapState(UserStore, ["authenticated", "authenticatedUserEmail"]),
  },
  created() {
    this.email = '';
  },
  mounted() {
    if (this.authenticated) {
      this.email = this.authenticatedUserEmail;
    }
  }
}
</script>

<style scoped>

</style>