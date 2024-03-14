import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import LoginView from '../views/LoginView.vue';
import LogoutView from '../views/LogoutView.vue';
import TransactionDetailView from '../views/TransactionDetailView.vue';
import TransactionRulesView from '../views/TransactionRulesView.vue';
import CategorySelectionView from '../views/CategorySelectionView.vue';
import AccountsView from '../views/AccountsView.vue';
import RuleSetsView from '../views/RuleSetsView.vue';
import RuleSetEditView from '../views/RuleSetEditView.vue';
import UsersView from '../views/UsersView.vue';
import RolesView from '../views/RolesView.vue';
import RoleEditView from '../views/RoleEditView.vue';
import UserEditView from '../views/UserEditView.vue';
import RegistrationView1 from '../views/RegistrationView1.vue';
import AboutView from '../views/AboutView.vue';
import TransactionNewView from "@/views/TransactionNewView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/logout',
      name: 'logout',
      component: LogoutView,
    },
    {
      path: '/transactionDetail/:transactionId',
      name: 'TransactionDetail',
      props: true,
      component: TransactionDetailView,
    },
    {
      path: '/transactionRules/:transactionId',
      name: 'TransactionRules',
      props: true,
      component: TransactionRulesView,
    },
    {
      path: '/addTransaction',
      name: 'AddTransaction',
      component: TransactionNewView,
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
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: AboutView,
    },
  ],
});

export default router;
