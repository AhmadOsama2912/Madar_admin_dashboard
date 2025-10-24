// Admin Auth API
import request from '@/utils/request'

export const login = (payload) => request.post('/login', payload) // {login, password}
export const getMe = () => request.get('/me') // already exists on your API
export const logout = () => request.post('/logout')

// (optional) POST /admin/v1/logout-all
export const logoutAll = () => request.post('/logout-all')
