// Admin Auth API
import request from '@/utils/request'

// POST /admin/v1/login  (via proxy: /admin-api/login in dev)
export const login = (payload) => request.post('/login', payload)

// GET /admin/v1/me
export const getMe = () => request.get('/me')

// POST /admin/v1/logout
export const logout = () => request.post('/logout')

// (optional) POST /admin/v1/logout-all
export const logoutAll = () => request.post('/logout-all')
