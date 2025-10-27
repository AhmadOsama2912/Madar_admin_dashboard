import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

/* Layout */
import Layout from '@/layout'

/**
 * Routes that don’t require auth
 */
export const constantRoutes = [
  {
    path: '/redirect',
    component: Layout,
    hidden: true,
    children: [
      { path: '/redirect/:path(.*)', component: () => import('@/views/redirect/index') }
    ]
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

  // Dashboard
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        // if your dashboard lives at /views/dashboard/admin/index.vue, point to it:
        component: () => import('@/views/dashboard/admin/index.vue'),
        name: 'Dashboard',
        meta: { title: 'Dashboard', icon: 'dashboard', affix: true }
      }
    ]
  },

  // Profile (always accessible via user menu)
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
 * Routes that require permissions (filtered by meta.roles or meta.abilities)
 * Order: Screens → Content → Customers → Users → Packages → System Admins → 404
 */
export const asyncRoutes = [
  // Screens
  {
    path: '/screens',
    component: Layout,
    redirect: '/screens/all',
    name: 'Screens',
    meta: { title: 'Screens', icon: 'el-icon-monitor', roles: ['admin', 'superadmin'] },
    children: [
      {
        path: 'all',
        component: () => import('@/views/screens/All.vue'),
        name: 'ScreensAll',
        meta: { title: 'All Screens', roles: ['admin', 'superadmin'] }
      },
      {
        path: 'enrollment-codes',
        component: () => import('@/views/screens/EnrollmentCodes.vue'),
        name: 'EnrollmentCodes',
        meta: { title: 'Enrollment Codes', roles: ['admin', 'superadmin'], abilities: ['admin:manage'] }
      }
      // If you add more (e.g., Details), keep child paths relative (no leading slash)
      // {
      //   path: 'details/:id(\\d+)',
      //   component: () => import('@/views/screens/Details.vue'),
      //   name: 'ScreenDetails',
      //   meta: { title: 'Screen Details', roles: ['admin', 'superadmin'] },
      //   hidden: true
      // }
    ]
  },

  // Content
  {
    path: '/content',
    component: Layout,
    redirect: '/content/playlists',
    name: 'Content',
    meta: { title: 'Content', icon: 'el-icon-video-camera', roles: ['admin', 'superadmin'] },
    children: [
      {
        path: 'playlists',
        component: () => import('@/views/content/Playlists.vue'),
        name: 'Playlists',
        meta: { title: 'Playlists', roles: ['admin', 'superadmin'] }
      }
      // Add media library, templates, etc. here later
    ]
  },

  // Customers (superadmins only)
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

  // Users (admins & superadmins)
  {
    path: '/users',
    component: Layout,
    redirect: '/users/index',
    name: 'Users',
    meta: { title: 'Users', icon: 'el-icon-user', roles: ['admin', 'superadmin'] },
    children: [
      {
        path: 'index',
        component: () => import('@/views/users/index.vue'),
        name: 'UserManagement',
        meta: { title: 'User Management', roles: ['admin', 'superadmin'] }
      }
    ]
  },

  // Packages (admins & superadmins)
  {
    path: '/packages',
    component: Layout,
    redirect: '/packages/index',
    name: 'PackagesRoot',
    meta: { title: 'Packages', icon: 'el-icon-goods', roles: ['admin', 'superadmin'] },
    children: [
      {
        path: 'index',
        component: () => import('@/views/packages/index.vue'),
        name: 'Packages',
        meta: { title: 'Packages', roles: ['admin', 'superadmin'] }
      }
    ]
  },

  // System Admins (superadmins only)
  {
    path: '/system-admins',
    component: Layout,
    redirect: '/system-admins/index',
    name: 'SystemAdminsRoot',
    meta: { title: 'System Admins', icon: 'el-icon-s-custom', roles: ['superadmin'] },
    children: [
      {
        path: 'index',
        component: () => import('@/views/system-admins/index.vue'),
        name: 'SystemAdmins',
        meta: { title: 'System Admins', roles: ['superadmin'] }
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
