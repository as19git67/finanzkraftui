import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("../views/HomeView.vue"),
    },
    {
      path: "/login",
      name: "login",
      component: () => import("../views/LoginView.vue"),
    },
    {
      path: "/logout",
      name: "logout",
      component: () => import("../views/LogoutView.vue"),
    },
    {
      path: "/users",
      name: "Users",
      component: () => import("../views/UsersView.vue"),
    },
    {
      path: "/roles",
      name: "Roles",
      component: () => import("../views/RolesView.vue"),
    },
    {
      path: "/roleEdit/:id",
      name: "RoleEdit",
      component: () => import("../views/RoleEditView.vue"),
    },
    {
      path: "/registration1",
      name: "Registration1",
      component: () => import("../views/RegistrationView1.vue"),
    },
    {
      path: "/about",
      name: "about",
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import("../views/AboutView.vue"),
    },
  ],
});

export default router;
