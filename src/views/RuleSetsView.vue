<template>
  <div class="page page--has-no-overflow">
    <h1 class="title">Regeln</h1>


    <div class="section">
      <form class="label-value-group in-row" v-on:submit.prevent v-on:keyup.enter="addRule">
        <div class="label-value in-row">
          <input class="value" type="text" autofocus v-model="newRuleSetName"
                 placeholder="Name der Regel">
          <button @click="addRule" class="btn btn--is-primary">Hinzufügen</button>
        </div>
      </form>
    </div>

    <div v-if="actionError" class="section">
      <div class="error">{{ actionError }}</div>
    </div>

    <div class="section section--is-scrollable">
      <table class="data-table" v-if="ruleSets && ruleSets.length">
        <thead>
        <tr>
          <th>Name</th>
          <th>Aktionen</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="item of ruleSets" :key="item.id">
          <td>
            <router-link class="action"
                         :to="{ path:'/ruleSetEdit/:ruleSetId', name: 'RuleSetEdit', params: { ruleSetId: item.id }}">
              {{ item.name }}
            </router-link>
          </td>
          <td>
            <div class="action-group">
              <router-link class="action"
                           :to="{ path:'/ruleSetEdit/:ruleSetId', name: 'RuleSetEdit', params: { ruleSetId: item.id }}">
                <button class="btn-icon-only" aria-label="Regel ändern" tabindex="-1">
                  <IconEdit/>
                </button>
              </router-link>
              <button
                  class="btn-icon-only"
                  @click="deleteRuleSet(item.id)"
                  title="Regel löschen"
              >
                <IconDelete/>
              </button>
            </div>
          </td>
        </tr>
        </tbody>
      </table>

      <div class="label-value in-column" v-else><div class="label">Keine Regeln vom Server geladen</div></div>
    </div>
  </div>
  <div v-if="showConfirmDialog" class="confirm">
    <div class="confirm-backdrop"></div>
    <div class="dialog confirm-dialog confirm--yes-no">
      <span class="confirm-text">{{ confirmText }}</span>
      <div class="btn-group">
        <button class="btn btn-confirm" @click="confirmDialogButtonClicked('yes')">Ja</button>
        <button class="btn btn-confirm btn--is-primary" v-focus
                @click="confirmDialogButtonClicked('no')">Nein
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import {mapActions, mapState, mapStores} from "pinia";
import {UserStore} from "@/stores/user";
import router from "@/router";
import IconAdd from "@/components/icons/IconAdd.vue";
import IconEdit from "@/components/icons/IconEdit.vue";
import IconDelete from "@/components/icons/IconDelete.vue";
import ModalDialog from "@/components/ModalDialog.vue";
import {TransactionStore} from "@/stores/transactions";

export default {
  name: "RuleSetsView",
  components: {IconAdd, IconEdit, IconDelete, ModalDialog},
  data() {
    return {
      newRuleSetName: this.newRuleSetName,
      error: this.error,
      actionError: this.actionError,
      showConfirmDialog: false,
      confirmText: '',
    };
  },
  computed: {
    ...mapStores(UserStore),
    ...mapStores(TransactionStore),
    ...mapState(UserStore, ["authenticated"]),
    ...mapState(TransactionStore, ["ruleSets"]),
  },
  methods: {
    ...mapActions(TransactionStore, ["getRuleSets", "deleteRules"]),
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
        this.actionError = result.message;
        return false;
      }
      return true;
    },
    async loadRuleSets() {
      const result = await this.getRuleSets();
      this._handleActionResult(result);
    },
    async addRuleSet() {
      this.actionError = "";
    },
    async deleteRuleSet(id) {
      this.confirmText = 'Soll die Regel wirklich gelöscht werden?';
      this.showConfirmDialog = true;
      const res = await new Promise((resolve, reject) => {
        this.dialogResolve = resolve;
      });
      switch (res) {
        case 'yes':
          await this.deleteRuleSetConfirmed(id);
          break;
        case 'no':
          break;
      }
    },
    confirmDialogButtonClicked(btnId) {
      this.showConfirmDialog = false;
      this.dialogResolve(btnId);
    },
    async deleteRuleSetConfirmed(id) {
      try {
        const resultData = await this.deleteRules(id);
        let mustAuthenticate = false;
        let not_ok = false;
        let status = resultData.status;
        switch (status) {
          case 401:
            mustAuthenticate = true;
            break;
          case 200:
            break;
          default:
            not_ok = true;
        }
        if (mustAuthenticate) {
          this.actionError = 'Keine Berechtigung';
          return;
        }
        if (not_ok) {
          this.actionError = resultData.message;
          return;
        }
        this.actionError = "";
        await this.loadRuleSets();
      } catch (reason) {
        await this.loadRuleSets();
        this.actionError = reason.message;
      }
    },
  },
  created() {
    this.newRuleSetName = '';
    this.con
  },
  async mounted() {
    this.actionError = null;
    await this.loadRuleSets();
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
