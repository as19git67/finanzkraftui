<template>
<h1>Mein kleines Tierlexikon</h1>
  <table v-if="gattungen.length">
    <thead>
      <tr>
        <th>Gattungen</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="item of gattungen" :key="item">
        <td>{{ item }}</td>
      </tr>
    </tbody>
  </table>
  <p v-else>Keine Gattungen vom Server geladen</p>
</template>

<script>
import { mapActions, mapState, mapStores } from "pinia";
import { UserStore } from "@/stores/user";
import { TiereStore } from "@/stores/tiere";
import router from "@/router";

export default {
  name: "Home",
  data() {
    return {
      error: this.error,
    };
  },
  computed: {
    ...mapStores(UserStore),
    ...mapStores(TiereStore),
    ...mapState(UserStore, ["authenticated"]),
    ...mapState(TiereStore, ["gattungen"]),
  },
  methods: {
    ...mapActions(TiereStore, ["getGattungen"]),
    fillGattungen() {
      this.error = "";
      this.getGattungen()
        .then((result) => {
          switch (result) {
            case 200:
              break; // all ok
            case 401:
              router.replace("/login");
              break;
            default:
              this.error = `Fehler beim Abrufen der Gattungen: ${result}`;
          }
        })
        .catch((error) => {
          this.error = error.message;
        });
    },
  },
  mounted() {
    this.error = null;
    this.fillGattungen();
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