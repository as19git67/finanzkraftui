<template>
  <div class="top-links">
    <router-link
        :to="{ path: router.options.history.state.back }">
      < Zurück
    </router-link>
  </div>
  <div v-if="error" class="error">{{ error }}</div>
</template>


<script setup>

defineProps({
  ruleSetId: { type: String },
});
</script>

<script>
import { mapActions, mapState, mapStores } from "pinia";
import { UserStore } from "@/stores/user";
import router from "@/router";
import _ from "lodash";
import {TransactionStore} from "@/stores/transactions";

export default {
  name: "RuleSetEditView",
  components: {},
  data() {
    return {
      ruleSet: this.ruleSet,
      error: this.error,
      actionError: this.actionError,
    };
  },
  computed: {
    ...mapStores(UserStore),
    ...mapState(UserStore, ["authenticated"]),
  },
  methods: {
    ...mapActions(TransactionStore, [ "getRuleSet" ]),
  },
  created() {
  },
  async mounted() {
    this.error = undefined;
    this.actionError = undefined;
  },
};
</script>

<style scoped>
.form-component {
  width: 100%;
}
.form-component input {
  flex: 1 1 auto;
}

.top-links {
  display: flex;
  flex-direction: row;
  flex: 1 1 100%;
  margin-bottom: 1em;
  justify-content: space-between;
}

.top-links a {
  font-size: 16px;
  color: var(--as-color-secondary-2-4);
}

.detail-links a {
  font-size: 16px;
  color: var(--as-color-secondary-2-4);
  padding-top: 0.5em;
  padding-bottom: 0.5em;
}

.action.action--is-disabled {
  color: var(--as-color-complement-5);
}
</style>
