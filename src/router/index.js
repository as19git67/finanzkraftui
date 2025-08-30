import { createRouter, createWebHistory } from 'vue-router';
import StartView from '../views/StartView.vue';
import LoginView from '../views/LoginView.vue';
import TransactionListView from "../views/TransactionListView.vue";
import TransactionDetailView from '../views/TransactionDetailView.vue';
import TransactionRulesView from '../views/TransactionRulesView.vue';
import CategorySelectionView from '../views/CategorySelectionView.vue';
import AccountsView from '../views/AccountsView.vue';
import AccountView from '../views/AccountView.vue';
import RuleSetsView from '../views/RuleSetsView.vue';
import RuleSetEditView from '../views/RuleSetEditView.vue';
import UsersView from '../views/UsersView.vue';
import RolesView from '../views/RolesView.vue';
import RoleEditView from '../views/RoleEditView.vue';
import UserEditView from '../views/UserEditView.vue';
import RegistrationView1 from '../views/RegistrationView1.vue';
import TransactionNewView from '../views/TransactionNewView.vue';
import BatchSetCategory from '../views/BatchSetCategory.vue';
import NotAuthorizedView from '../views/NotAuthorizedView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/notAuthorized',
      name: 'notAuthorized',
      component: NotAuthorizedView,
    },
    {
      path: '/',
      name: 'home',
      component: StartView,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/transactionsOfAccount/:accountId*',
      name: 'Transactions',
      component: TransactionListView,
      props: true,
    },
    {
      path: '/transactionDetail/:transactionId',
      name: 'TransactionDetail',
      props: true,
      component: TransactionDetailView,
    },
    {
      path: '/batchSetCategory',
      name: 'BatchSetCategory',
      component: BatchSetCategory,
    },
    {
      path: '/transactionRules/:transactionId',
      name: 'TransactionRules',
      props: true,
      component: TransactionRulesView,
    },
    {
      path: '/addTransaction/:accountId',
      name: 'AddTransaction',
      component: TransactionNewView,
      props: true,
    },
    {
      path: '/ruleSets',
      name: 'RuleSets',
      component: RuleSetsView,
    },
    {
      path: '/ruleSetEdit/:ruleSetId',
      name: 'RuleSetEdit',
      props: true,
      component: RuleSetEditView,
    },
    {
      path: '/categorySelection',
      name: 'CategorySelection',
      component: CategorySelectionView,
    },
    {
      path: '/accounts',
      name: 'Accounts',
      component: AccountsView,
    },
    {
      path: '/account/:accountId',
      name: 'AccountDetail',
      props: true,
      component: AccountView,
    },
    {
      path: '/users',
      name: 'Users',
      component: UsersView,
    },
    {
      path: '/roles',
      name: 'Roles',
      component: RolesView,
    },
    {
      path: '/roleEdit/:roleId',
      name: 'RoleEdit',
      props: true,
      component: RoleEditView,
    },
    {
      path: '/userEdit/:userId',
      name: 'UserEdit',
      props: true,
      component: UserEditView,
    },
    {
      path: '/registration1',
      name: 'Registration1',
      component: RegistrationView1,
    },
  ],
});

export default router;
