// src/permission.js
import router from '@/router'
import store from '@/store'
import { Message } from 'element-ui'

const whiteList = ['/login', '/auth-redirect', '/404', '/401']
const TOKEN_KEY = 'madar_admin_token'

router.beforeEach(async(to, from, next) => {
  const token = store.getters.token || localStorage.getItem(TOKEN_KEY)

  if (token) {
    if (to.path === '/login') return next({ path: '/' })

    const hasRoles = store.getters.roles && store.getters.roles.length > 0
    if (hasRoles) return next()

    try {
      await store.dispatch('user/fetchMe') // sets roles
      const roles = store.getters.roles
      const accessRoutes = await store.dispatch('permission/generateRoutes', roles)
      router.addRoutes(accessRoutes) // inject async routes
      return next({ ...to, replace: true }) // ensure addRoutes is done
    } catch (e) {
      Message.error('Failed to load profile, please login again.')
      await store.dispatch('user/logout')
      return next(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
    }
  } else {
    if (whiteList.includes(to.path)) return next()
    return next(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
})
