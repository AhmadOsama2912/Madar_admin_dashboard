import request from '@/utils/request'

export const listAdmins = (params) => request.get('/admins', { params })
export const getAdmin = (id) => request.get(`/admins/${id}`)
export const createAdmin = (data) => request.post('/admins', data)
export const updateAdmin = (id, data) => request.patch(`/admins/${id}`, data)
export const deleteAdmin = (id) => request.delete(`/admins/${id}`)
