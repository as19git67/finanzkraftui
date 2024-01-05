<template>
<p>Logging out...</p>
</template>

<script>
import { mapActions } from "pinia";
import { UserStore } from "@/stores/user";
import router from "@/router";

export default {
  name: "LogoutView",
  methods: {
    ...mapActions(UserStore, ["logout"]),
  },
  mounted() {
    this.logout();
    router.replace("/");
  },
};
</script>

<style scoped></style>
