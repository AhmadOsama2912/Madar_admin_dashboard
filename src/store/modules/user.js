import { login as _login, getMe as _getMe, logout as _logout } from '@/api/auth'
const TOKEN_KEY = 'madar_admin_token'

const state = {
  token: localStorage.getItem(TOKEN_KEY) || '',
  admin: null, // <- your admin object
  roles: [] // <- ['superadmin','admin'] or ['admin']
}

const mutations = {
  SET_TOKEN(state, t) { state.token = t },
  SET_ADMIN(state, a) { state.admin = a },
  SET_ROLES(state, r) { state.roles = r || [] },
  RESET(state) {
    state.token = ''
    state.admin = null
    state.roles = []
  }
}

function rolesFromAdmin(a) {
  if (!a) return []
  return a.is_super_admin ? ['superadmin', 'admin'] : ['admin']
}

const actions = {
  async login({ commit }, { email, password }) {
    // backend expects { login: email, password }
    const res = await _login({ login: email, password })
    const token = res?.token
    const admin = res?.admin

    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
      commit('SET_TOKEN', token)
    }
    commit('SET_ADMIN', admin)
    commit('SET_ROLES', rolesFromAdmin(admin))
    return true
  },

  async fetchMe({ commit }) {
    // refresh admin info on reload
    const me = await _getMe() // should return { id,..., is_super_admin, ... }
    commit('SET_ADMIN', me)
    commit('SET_ROLES', rolesFromAdmin(me))
  },

  async logout({ commit }) {
    try { await _logout() } catch (_) {
      console.error('Logout failed on server')
    }
    localStorage.removeItem(TOKEN_KEY)
    commit('RESET')
  }
}

const getters = {
  token: s => s.token,
  admin: s => s.admin,
  roles: s => s.roles,
  isSuperAdmin: s => !!s.admin?.is_super_admin
}

export default { namespaced: true, state, mutations, actions, getters }
