// src/store/modules/user.js
import { login as _login, getMe as _getMe, logout as _logout } from '@/api/auth'
const TOKEN_KEY = 'madar_admin_token'

const state = {
  token: localStorage.getItem(TOKEN_KEY) || '',
  me: null,
  abilities: [],
  roles: [] // ← add this
}

const mutations = {
  SET_TOKEN(state, t) { state.token = t },
  SET_ME(state, u) { state.me = u },
  SET_ABILITIES(state, a) { state.abilities = a || [] },
  SET_ROLES(state, r) { state.roles = r || [] }, // ← add this
  RESET(state) { state.token = ''; state.me = null; state.abilities = []; state.roles = [] }
}

const actions = {
  async login({ commit }, { email, password }) {
    const res = await _login({ login: email, password })
    const token = res?.token
    const abilities = res?.abilities || []
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
      commit('SET_TOKEN', token)
    }
    commit('SET_ABILITIES', abilities)
    // provisional role right after login (optional)
    if (abilities.includes('admin:manage')) commit('SET_ROLES', ['admin'])
    return true
  },

  async fetchMe({ commit }) {
    const me = await _getMe()
    commit('SET_ME', me)
    const abilities = me?.abilities || []
    commit('SET_ABILITIES', abilities)
    // map abilities -> roles used by router
    const roles = abilities.includes('admin:manage') ? ['admin'] : ['editor']
    commit('SET_ROLES', roles) // ← set roles here
  },

  async logout({ commit }) {
    try { await _logout() } catch (_) {
      print('logout error ignored')
    }
    localStorage.removeItem(TOKEN_KEY)
    commit('RESET')
  }
}

const getters = {
  token: s => s.token,
  me: s => s.me,
  abilities: s => s.abilities,
  roles: s => s.roles // ← expose roles
}

export default { namespaced: true, state, mutations, actions, getters }
