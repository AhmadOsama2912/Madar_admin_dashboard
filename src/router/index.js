import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

/* Layout */
import Layout from '@/layout'

/**
 * constantRoutes
 * routes that don’t require auth
 */
export const constantRoutes = [
  {
    path: '/redirect',
    component: Layout,
    hidden: true,
    children: [{ path: '/redirect/:path(.*)', component: () => import('@/views/redirect/index') }]
  },
  {
    path: '/login',
    component: () => import('@/views/login/index'),
    hidden: true
  },
  {
    path: '/auth-redirect',
    component: () => import('@/views/login/auth-redirect'),
    hidden: true
  },
  { path: '/404', component: () => import('@/views/error-page/404'), hidden: true },
  { path: '/401', component: () => import('@/views/error-page/401'), hidden: true },

  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        component: () => import('@/views/dashboard/index'),
        name: 'Dashboard',
        meta: { title: 'Dashboard', icon: 'dashboard', affix: true }
      }
    ]
  },

  {
    path: '/profile',
    component: Layout,
    redirect: '/profile/index',
    hidden: true,
    children: [
      {
        path: 'index',
        component: () => import('@/views/profile/index'),
        name: 'Profile',
        meta: { title: 'Profile', icon: 'user', noCache: true }
      }
    ]
  }
]

/**
 * asyncRoutes
 * routes that need permission (filtered by meta.roles)
 */
export const asyncRoutes = [
  // System Admins (super admins only)
  {
    path: '/system-admins',
    component: Layout,
    children: [
      {
        path: 'index',
        component: () => import('@/views/system-admins/index.vue'),
        name: 'SystemAdmins',
        meta: { title: 'System Admins', icon: 'el-icon-s-custom', roles: ['superadmin'] }
      }
    ]
  },

  // Customers (admins & superadmins)
  {
    path: '/customers',
    component: Layout,
    redirect: '/customers/index',
    name: 'Customers',
    meta: { title: 'Customers', icon: 'el-icon-office-building', roles: ['superadmin'] },
    children: [
      {
        path: 'index',
        component: () => import('@/views/customers/index.vue'),
        name: 'CustomersIndex',
        meta: { title: 'All Customers', roles: ['superadmin'] }
      },
      {
        path: 'create',
        component: () => import('@/views/customers/create.vue'),
        name: 'CustomerCreate',
        meta: { title: 'Create Customer', roles: ['superadmin'] }
      }
    ]
  },

  // Packages (admins & superadmins)
  {
    path: '/packages',
    component: Layout,
    redirect: '/packages/index',
    children: [
      {
        path: 'index',
        component: () => import('@/views/packages/index.vue'),
        name: 'Packages',
        meta: { title: 'Packages', icon: 'el-icon-goods', roles: ['admin'] }
      }
    ]
  },

  // Users (admins & superadmins)
  {
    path: '/users',
    component: Layout,
    redirect: '/users/index',
    children: [
      {
        path: 'index',
        component: () => import('@/views/users/index.vue'),
        name: 'UserManagement',
        meta: { title: 'User Management', icon: 'el-icon-user', roles: ['admin'] }
      }
    ]
  },

  // Screens (admins & superadmins)
  {
    path: '/screens',
    component: Layout,
    redirect: '/screens/all',
    name: 'Screens',
    meta: { title: 'Screens', icon: 'el-icon-monitor', roles: ['admin'] },
    children: [
      {
        path: 'Screens-main',
        component: () => import('@/views/screens/All.vue'),
        name: 'ScreensAll',
        meta: { title: 'All Screens', roles: ['admin'] }
      },
      // {
      //   path: 'pair-customer',
      //   component: () => import('@/views/screens/PairCustomer.vue'),
      //   name: 'ScreensPairCustomer',
      //   meta: { title: 'Screens Pair Customer', roles: ['admin'] }
      // },
      {
        path: 'enrollment-codes',
        component: () => import('@/views/screens/EnrollmentCodes.vue'),
        name: 'EnrollmentCodes',
        meta: { title: 'Enrollment Codes', abilities: ['admin:manage'] }
      },
      {
        path: '/content/playlists',
        component: () => import('@/views/content/Playlists.vue'),
        meta: { title: 'Playlists' }
      }

    ]
  },

  // 404 must be last
  { path: '*', redirect: '/404', hidden: true }
]

const createRouter = () =>
  new Router({
    // mode: 'history', // enable if your server supports it
    scrollBehavior: () => ({ y: 0 }),
    routes: constantRoutes
  })

const router = createRouter()

// reset router on logout
export function resetRouter() {
  const newRouter = createRouter()
  router.matcher = newRouter.matcher
}

export default router
