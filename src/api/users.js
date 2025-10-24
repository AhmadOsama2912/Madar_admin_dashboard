import request from '@/utils/request'

export const listUsers = (params) => request.get('/users', { params })
export const getUser = (id) => request.get(`/users/${id}`)
export const createUser = (data) => request.post('/users', data)
export const updateUser = (id, data) => request.patch(`/users/${id}`, data)
export const deleteUser = (id) => request.delete(`/users/${id}`)
